from datetime import date, datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

import auth
import models
import schemas
from config import CORS_ORIGINS
from database import engine, SessionLocal
from migracao import migrar

# Cria o banco e as tabelas automaticamente se não existirem
models.Base.metadata.create_all(bind=engine)
# Aplica colunas novas em tabelas existentes (idempotente, sem Alembic)
migrar(engine)

app = FastAPI(title="Sistema de Gestão da Cozinha Escolar - PNAE")

# --- CONFIGURAÇÃO DE CORS (Liberando o acesso para o Frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FUNÇÃO AUXILIAR DE CONEXÃO COM O BANCO ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Valores válidos (espelham os CHECK constraints de models.py)
PERFIS_VALIDOS = ["admin", "secretaria", "cozinheira"]
UNIDADES_OFICIAIS_INTERNAS = {"KG", "L"}
TIPOS_REFEICAO_VALIDOS = ["Lanche", "Almoço", "Janta"]
SLOTS_PLANEJAMENTO = ["Lanche da Manhã", "Almoço", "Lanche da Tarde", "Janta"]
ACOES_ENTREGA_VALIDAS = ["recebido", "alterado", "excluído"]


# --- ROTAS DA API ---

@app.get("/")
def ler_raiz():
    return {"mensagem": "Olá, Gestão! A API da Cozinha Escolar está a funcionar!"}

# --- ROTAS DE AUTENTICAÇÃO ---

# ROTA AUTH 1: Login — recebe { nome, senha }, retorna { access_token, perfil }
@app.post("/auth/login")
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.nome == dados.nome).first()
    if not usuario or not auth.verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Nome de usuário ou senha inválidos")

    token = auth.criar_token(usuario.id, usuario.perfil)
    return {"access_token": token, "perfil": usuario.perfil}

# ROTA AUTH 2: Dados do usuário autenticado
@app.get("/auth/me")
def ler_usuario_atual(usuario: models.Usuario = Depends(auth.get_usuario_atual)):
    return {"id": usuario.id, "nome": usuario.nome, "perfil": usuario.perfil}


# =========================================================================
# CRUDs protegidos por perfil (Fase 2)
# =========================================================================

# --- USUÁRIOS (somente admin) ---

@app.get("/usuarios")
def listar_usuarios(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    usuarios = db.query(models.Usuario).order_by(models.Usuario.id).all()
    return [{"id": u.id, "nome": u.nome, "perfil": u.perfil} for u in usuarios]


@app.post("/usuarios")
def criar_usuario(
    dados: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    if dados.perfil not in PERFIS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Perfil inválido. Use: {', '.join(PERFIS_VALIDOS)}")

    existente = db.query(models.Usuario).filter(models.Usuario.nome == dados.nome).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Já existe um usuário com o nome '{dados.nome}'")

    novo = models.Usuario(
        nome=dados.nome,
        senha_hash=auth.criar_hash_senha(dados.senha),
        perfil=dados.perfil,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return {"id": novo.id, "nome": novo.nome, "perfil": novo.perfil}


@app.put("/usuarios/{usuario_id}")
def atualizar_usuario(
    usuario_id: int,
    dados: schemas.UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    alvo = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if dados.nome is not None:
        duplicado = db.query(models.Usuario).filter(
            models.Usuario.nome == dados.nome,
            models.Usuario.id != usuario_id,
        ).first()
        if duplicado:
            raise HTTPException(status_code=409, detail=f"Já existe um usuário com o nome '{dados.nome}'")
        alvo.nome = dados.nome

    if dados.senha is not None:
        alvo.senha_hash = auth.criar_hash_senha(dados.senha)

    if dados.perfil is not None:
        if dados.perfil not in PERFIS_VALIDOS:
            raise HTTPException(status_code=400, detail=f"Perfil inválido. Use: {', '.join(PERFIS_VALIDOS)}")
        alvo.perfil = dados.perfil

    db.commit()
    db.refresh(alvo)
    return {"id": alvo.id, "nome": alvo.nome, "perfil": alvo.perfil}


@app.delete("/usuarios/{usuario_id}")
def excluir_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    alvo = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    db.delete(alvo)
    db.commit()
    return {"mensagem": f"Usuário '{alvo.nome}' excluído com sucesso!"}


# --- ITENS / ESTOQUE (GET para todos; CRUD somente admin) ---

@app.get("/itens")
def listar_itens(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria", "cozinheira")),
):
    itens = db.query(models.Item).order_by(models.Item.id).all()
    return [
        {
            "id": item.id,
            "nome": item.nome,
            "unidade_oficial": item.unidade_oficial,
            "saldo_atual": item.saldo_atual,
            "unidade_interna": item.unidade_interna,
            "fator_conversao": item.fator_conversao,
            "limiar": item.limiar,
        }
        for item in itens
    ]


def _criar_item_no_banco(db: Session, dados: schemas.ItemCreate) -> models.Item:
    """Valida e persiste um novo item — compartilhado por /itens e /itens/inline (D-13).

    Mesmas regras: unidade livre exige conversão, limiar > 0 (default 5.0), nome único.
    """
    unidade_normalizada = dados.unidade_oficial.strip().upper()

    # Validação condicional: se unidade não for KG ou L, exige conversão
    if unidade_normalizada not in UNIDADES_OFICIAIS_INTERNAS:
        if not dados.fator_conversao or dados.fator_conversao <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Para unidade '{dados.unidade_oficial}', informe unidade_interna (KG ou L) e fator_conversao > 0",
            )
        if not dados.unidade_interna or dados.unidade_interna.strip().upper() not in UNIDADES_OFICIAIS_INTERNAS:
            raise HTTPException(
                status_code=400,
                detail=f"unidade_interna deve ser 'KG' ou 'L', recebido: '{dados.unidade_interna}'",
            )

    # Limiar individual de baixo estoque (D-03): ausente usa default 5.0; zero/negativo → 400
    if dados.limiar is not None and dados.limiar <= 0:
        raise HTTPException(status_code=400, detail="limiar deve ser maior que zero")

    existente = db.query(models.Item).filter(models.Item.nome == dados.nome).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Já existe um item com o nome '{dados.nome}'")

    novo = models.Item(
        nome=dados.nome,
        unidade_oficial=dados.unidade_oficial,
        saldo_atual=dados.saldo_atual * (dados.fator_conversao or 1.0),
        unidade_interna=dados.unidade_interna or "KG",
        fator_conversao=dados.fator_conversao or 1.0,
        limiar=dados.limiar,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


def _serializar_item(item: models.Item) -> dict:
    return {
        "id": item.id,
        "nome": item.nome,
        "unidade_oficial": item.unidade_oficial,
        "saldo_atual": item.saldo_atual,
        "unidade_interna": item.unidade_interna,
        "fator_conversao": item.fator_conversao,
        "limiar": item.limiar,
    }


@app.post("/itens")
def criar_item(
    dados: schemas.ItemCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    return _serializar_item(_criar_item_no_banco(db, dados))


@app.post("/itens/inline")
def criar_item_inline(
    dados: schemas.ItemCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    """Cria item dentro do fluxo de Entregas (D-13): admin e secretaria.

    Mesmas validações de POST /itens; fora do fluxo de Entregas o cadastro
    permanece admin-only (POST /itens inalterado).
    """
    return _serializar_item(_criar_item_no_banco(db, dados))


@app.put("/itens/{item_id}")
def atualizar_item(
    item_id: int,
    dados: schemas.ItemUpdate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    # Limiar individual de baixo estoque (D-03): ausente (None) mantém o atual; zero/negativo → 400
    if dados.limiar is not None and dados.limiar <= 0:
        raise HTTPException(status_code=400, detail="limiar deve ser maior que zero")

    if dados.nome is not None:
        duplicado = db.query(models.Item).filter(
            models.Item.nome == dados.nome,
            models.Item.id != item_id,
        ).first()
        if duplicado:
            raise HTTPException(status_code=409, detail=f"Já existe um item com o nome '{dados.nome}'")
        item.nome = dados.nome

    if dados.unidade_oficial is not None:
        unidade_normalizada = dados.unidade_oficial.strip().upper()
        if unidade_normalizada not in UNIDADES_OFICIAIS_INTERNAS:
            # Validação condicional: unidade livre exige conversão
            fator = dados.fator_conversao
            unidade_int = dados.unidade_interna or item.unidade_interna
            if not fator or fator <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Para unidade '{dados.unidade_oficial}', informe unidade_interna (KG ou L) e fator_conversao > 0",
                )
            if not unidade_int or unidade_int.strip().upper() not in UNIDADES_OFICIAIS_INTERNAS:
                raise HTTPException(
                    status_code=400,
                    detail=f"unidade_interna deve ser 'KG' ou 'L', recebido: '{unidade_int}'",
                )
        item.unidade_oficial = dados.unidade_oficial

    if dados.unidade_interna is not None:
        item.unidade_interna = dados.unidade_interna

    if dados.fator_conversao is not None:
        item.fator_conversao = dados.fator_conversao

    if dados.saldo_atual is not None:
        item.saldo_atual = dados.saldo_atual * item.fator_conversao

    if dados.limiar is not None:
        item.limiar = dados.limiar

    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "nome": item.nome,
        "unidade_oficial": item.unidade_oficial,
        "saldo_atual": item.saldo_atual,
        "unidade_interna": item.unidade_interna,
        "fator_conversao": item.fator_conversao,
        "limiar": item.limiar,
    }


@app.delete("/itens/{item_id}")
def excluir_item(
    item_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    db.delete(item)
    db.commit()
    return {"mensagem": f"Item '{item.nome}' excluído com sucesso!"}


# --- CONVERSÕES (GET admin+sec+cozinheira; criar/excluir somente admin) ---

@app.get("/conversoes")
def listar_conversoes(
    item_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria", "cozinheira")),
):
    conversoes = db.query(models.Conversao).filter(
        models.Conversao.item_id == item_id
    ).all()
    return [
        {
            "id": c.id,
            "item_id": c.item_id,
            "medida_caseira": c.medida_caseira,
            "peso_em_kg": c.peso_em_kg,
        }
        for c in conversoes
    ]


@app.post("/conversoes")
def cadastrar_conversao(
    conv: schemas.ConversaoCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    item = db.query(models.Item).filter(models.Item.id == conv.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Item com id {conv.item_id} não encontrado")

    duplicada = db.query(models.Conversao).filter(
        models.Conversao.item_id == conv.item_id,
        models.Conversao.medida_caseira == conv.medida_caseira,
    ).first()
    if duplicada:
        raise HTTPException(
            status_code=409,
            detail=f"Já existe uma conversão '{conv.medida_caseira}' para este item",
        )

    nova_conv = models.Conversao(
        item_id=conv.item_id,
        medida_caseira=conv.medida_caseira,
        peso_em_kg=conv.peso_em_kg,
    )
    db.add(nova_conv)
    db.commit()
    db.refresh(nova_conv)
    return {
        "id": nova_conv.id,
        "item_id": nova_conv.item_id,
        "medida_caseira": nova_conv.medida_caseira,
        "peso_em_kg": nova_conv.peso_em_kg,
    }


@app.delete("/conversoes/{conversao_id}")
def excluir_conversao(
    conversao_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    conv = db.query(models.Conversao).filter(models.Conversao.id == conversao_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversão não encontrada")

    db.delete(conv)
    db.commit()
    return {"mensagem": "Conversão excluída com sucesso!"}


# --- FORNECEDORES (GET/POST admin+secretaria — D-06/D-08) ---

@app.get("/fornecedores")
def listar_fornecedores(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    fornecedores = db.query(models.Fornecedor).order_by(models.Fornecedor.nome).all()
    return [
        {"id": f.id, "nome": f.nome, "cnpj": f.cnpj}
        for f in fornecedores
    ]


@app.post("/fornecedores")
def criar_fornecedor(
    dados: schemas.FornecedorCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    if not dados.nome or not dados.nome.strip():
        raise HTTPException(status_code=400, detail="Nome do fornecedor é obrigatório")

    novo = models.Fornecedor(
        nome=dados.nome.strip(),
        cnpj=dados.cnpj.strip() if dados.cnpj else None,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return {"id": novo.id, "nome": novo.nome, "cnpj": novo.cnpj}


# --- CARDÁPIO (GET admin+sec; CRUD somente admin) ---

@app.get("/cardapio")
def listar_cardapio(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    itens = db.query(models.CardapioItem).order_by(models.CardapioItem.id).all()
    return [
        {"id": c.id, "nome_refeicao": c.nome_refeicao, "tipo_refeicao": c.tipo_refeicao}
        for c in itens
    ]


@app.post("/cardapio")
def criar_item_cardapio(
    dados: schemas.CardapioItemCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    if dados.tipo_refeicao not in TIPOS_REFEICAO_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de refeição inválido. Use: {', '.join(TIPOS_REFEICAO_VALIDOS)}",
        )

    novo = models.CardapioItem(
        nome_refeicao=dados.nome_refeicao,
        tipo_refeicao=dados.tipo_refeicao,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return {"id": novo.id, "nome_refeicao": novo.nome_refeicao, "tipo_refeicao": novo.tipo_refeicao}


@app.put("/cardapio/{cardapio_id}")
def atualizar_item_cardapio(
    cardapio_id: int,
    dados: schemas.CardapioItemUpdate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    item = db.query(models.CardapioItem).filter(models.CardapioItem.id == cardapio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item do cardápio não encontrado")

    if dados.nome_refeicao is not None:
        item.nome_refeicao = dados.nome_refeicao

    if dados.tipo_refeicao is not None:
        if dados.tipo_refeicao not in TIPOS_REFEICAO_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de refeição inválido. Use: {', '.join(TIPOS_REFEICAO_VALIDOS)}",
            )
        item.tipo_refeicao = dados.tipo_refeicao

    db.commit()
    db.refresh(item)
    return {"id": item.id, "nome_refeicao": item.nome_refeicao, "tipo_refeicao": item.tipo_refeicao}


@app.delete("/cardapio/{cardapio_id}")
def excluir_item_cardapio(
    cardapio_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    item = db.query(models.CardapioItem).filter(models.CardapioItem.id == cardapio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item do cardápio não encontrado")

    db.delete(item)
    db.commit()
    return {"mensagem": f"'{item.nome_refeicao}' removido do cardápio com sucesso!"}


# --- RECEITAS (GET para todos; CRUD somente admin) ---

@app.get("/cardapio/{cardapio_id}/receita")
def listar_receita(
    cardapio_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria", "cozinheira")),
):
    prato = db.query(models.CardapioItem).filter(models.CardapioItem.id == cardapio_id).first()
    if not prato:
        raise HTTPException(status_code=404, detail="Item do cardápio não encontrado")

    receitas = db.query(models.Receita).filter(
        models.Receita.cardapio_item_id == cardapio_id
    ).all()

    resultado = []
    for r in receitas:
        item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
        resultado.append({
            "id": r.id,
            "cardapio_item_id": r.cardapio_item_id,
            "item_id": r.item_id,
            "item_nome": item.nome if item else None,
            "quantidade": r.quantidade,
            "medida_caseira": r.medida_caseira,
        })
    return resultado


@app.post("/cardapio/{cardapio_id}/receita")
def adicionar_ingrediente_receita(
    cardapio_id: int,
    dados: schemas.ReceitaCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    prato = db.query(models.CardapioItem).filter(models.CardapioItem.id == cardapio_id).first()
    if not prato:
        raise HTTPException(status_code=404, detail="Item do cardápio não encontrado")

    item = db.query(models.Item).filter(models.Item.id == dados.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Item com id {dados.item_id} não encontrado")

    nova = models.Receita(
        cardapio_item_id=cardapio_id,
        item_id=dados.item_id,
        quantidade=dados.quantidade,
        medida_caseira=dados.medida_caseira,
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return {
        "id": nova.id,
        "cardapio_item_id": nova.cardapio_item_id,
        "item_id": nova.item_id,
        "quantidade": nova.quantidade,
        "medida_caseira": nova.medida_caseira,
    }


@app.put("/cardapio/{cardapio_id}/receita/{receita_id}")
def atualizar_ingrediente_receita(
    cardapio_id: int,
    receita_id: int,
    dados: schemas.ReceitaUpdate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    receita = db.query(models.Receita).filter(
        models.Receita.id == receita_id,
        models.Receita.cardapio_item_id == cardapio_id,
    ).first()
    if not receita:
        raise HTTPException(status_code=404, detail="Ingrediente da receita não encontrado")

    if dados.quantidade is not None:
        receita.quantidade = dados.quantidade
    if dados.medida_caseira is not None:
        receita.medida_caseira = dados.medida_caseira

    db.commit()
    db.refresh(receita)
    return {
        "id": receita.id,
        "cardapio_item_id": receita.cardapio_item_id,
        "item_id": receita.item_id,
        "quantidade": receita.quantidade,
        "medida_caseira": receita.medida_caseira,
    }


@app.delete("/cardapio/{cardapio_id}/receita/{receita_id}")
def remover_ingrediente_receita(
    cardapio_id: int,
    receita_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    receita = db.query(models.Receita).filter(
        models.Receita.id == receita_id,
        models.Receita.cardapio_item_id == cardapio_id,
    ).first()
    if not receita:
        raise HTTPException(status_code=404, detail="Ingrediente da receita não encontrado")

    db.delete(receita)
    db.commit()
    return {"mensagem": "Ingrediente removido da receita com sucesso!"}


# =========================================================================
# LÓGICA DE NEGÓCIO (Fase 3)
# =========================================================================

# --- PLANEJAMENTO SEMANAL (GET para todos; definir/remover admin+sec) ---

def _planejamento_ativo(db: Session, data: date) -> dict:
    """Retorna o planejamento vigente na `data`, indexado por (dia_semana, tipo_refeicao).

    Para cada slot, vale a entrada com a data_inicio_vigencia mais recente <= data.
    """
    entradas = db.query(models.Planejamento).filter(
        models.Planejamento.data_inicio_vigencia <= data
    ).all()
    ativos = {}
    for e in entradas:
        chave = (e.dia_semana, e.tipo_refeicao)
        if chave not in ativos or e.data_inicio_vigencia > ativos[chave].data_inicio_vigencia:
            ativos[chave] = e
    return ativos


def _serializar_planejamento(db: Session, entrada: models.Planejamento) -> dict:
    prato = db.query(models.CardapioItem).filter(
        models.CardapioItem.id == entrada.cardapio_item_id
    ).first()
    return {
        "id": entrada.id,
        "dia_semana": entrada.dia_semana,
        "tipo_refeicao": entrada.tipo_refeicao,
        "cardapio_item_id": entrada.cardapio_item_id,
        "nome_refeicao": prato.nome_refeicao if prato else None,
        "data_inicio_vigencia": entrada.data_inicio_vigencia.isoformat(),
    }


# --- PROJEÇÃO CUMULATIVA DE ESTOQUE (D-17/D-18/D-20) ---

def _consumo_slot(
    db: Session,
    cardapio_item_id: int,
    total_alunos: int | None,
) -> tuple[dict[int, float], set[int]] | None:
    """Consumo por item (unidade oficial kg/L) do slot planejado: ∑(receita × alunos).

    `total_alunos` vem de `_total_por_slot`; None (config ausente) → retorna None,
    sem levantar, para a projeção responder `configurado: false`.
    Itens sem conversão cadastrada são marcados não avaliáveis (D-17) — não lança 400.
    """
    if total_alunos is None:
        return None
    receitas = db.query(models.Receita).filter(
        models.Receita.cardapio_item_id == cardapio_item_id
    ).all()
    consumo: dict[int, float] = {}
    nao_avaliaveis: set[int] = set()
    for r in receitas:
        item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
        if not item:
            continue
        try:
            qtd_oficial = _converter_para_unidade_oficial(
                db, item, r.quantidade * total_alunos, r.medida_caseira
            )
        except HTTPException:
            nao_avaliaveis.add(r.item_id)
            continue
        consumo[r.item_id] = consumo.get(r.item_id, 0.0) + qtd_oficial
    return consumo, nao_avaliaveis


def _parse_rascunho(db: Session, rascunho: list[str] | None) -> dict[tuple[int, str], int]:
    """Pré-visualização (obs #4/D-18): sobreposições `(dia, slot) -> cardapio_item_id`.

    Formato de cada entrada: `"{dia}|{slot}|{cardapio_item_id}"`. Entradas
    malformadas, com slot inválido ou prato inexistente são IGNORADAS (T-08-14:
    pré-visualização nunca bloqueia, nunca persiste). Slot sem entrada de rascunho
    permanece com o planejamento vigente.
    """
    if not rascunho:
        return {}
    ids_pratos = {cid for (cid,) in db.query(models.CardapioItem.id).all()}
    mapa: dict[tuple[int, str], int] = {}
    for entrada in rascunho:
        partes = entrada.split("|")
        if len(partes) != 3:
            continue
        dia_s, slot, item_s = partes
        try:
            dia = int(dia_s)
            cardapio_item_id = int(item_s)
        except ValueError:
            continue
        if dia < 0 or dia > 6 or slot not in SLOTS_PLANEJAMENTO:
            continue
        if cardapio_item_id not in ids_pratos:
            continue
        mapa[(dia, slot)] = cardapio_item_id
    return mapa


def _simular_semana(
    db: Session,
    segunda: date,
    ate_dia: int | None = None,
    referencia: date | None = None,
    rascunho: list[str] | None = None,
) -> dict:
    """Simulação cumulativa da semana (D-17): segunda (0) → domingo (6), slots na
    ordem de `SLOTS_PLANEJAMENTO`. `ate_dia` limita a simulação (avisos do POST).

    Ruptura é granular por SLOT (obs #5): cada dia responde `slots[].rupturas`
    apenas no slot em que o saldo corrente do item fica negativo pela primeira vez
    no dia (item já negativo em slot anterior do mesmo dia não repete). `rascunho`
    sobrepõe o planejado para pré-visualização sem salvar (obs #4).

    Config de alunos ausente → `configurado: false` com tudo zerado (não levanta).
    """
    try:
        _valores_alunos_por_periodo(db)
    except HTTPException:
        return {
            "configurado": False,
            "dias": [],
            "itens": [],
            "resumo": {"itens_com_ruptura": 0, "itens_nao_avaliaveis": 0},
        }

    data_referencia = referencia or (segunda + timedelta(days=ate_dia if ate_dia is not None else 6))
    ativos = _planejamento_ativo(db, data_referencia)
    rascunho_map = _parse_rascunho(db, rascunho)
    itens_catalogo = db.query(models.Item).order_by(models.Item.id).all()
    saldo_corrente = {i.id: i.saldo_atual for i in itens_catalogo}
    consumo_semana: dict[int, float] = {i.id: 0.0 for i in itens_catalogo}
    primeiro_dia_ruptura: dict[int, int | None] = {i.id: None for i in itens_catalogo}
    nao_avaliaveis: set[int] = set()
    dias: list[dict] = []

    for dia in range(ate_dia + 1 if ate_dia is not None else 7):
        slots_dia: list[dict] = []
        ja_negativo_no_dia: set[int] = set()
        for slot in SLOTS_PLANEJAMENTO:
            cardapio_item_id = rascunho_map.get((dia, slot))
            if cardapio_item_id is None:
                entrada = ativos.get((dia, slot))
                if not entrada:
                    continue
                cardapio_item_id = entrada.cardapio_item_id
            total_alunos = _total_por_slot(db, slot)
            resultado = _consumo_slot(db, cardapio_item_id, total_alunos)
            if resultado is None:
                continue
            consumo, nao_av = resultado
            nao_avaliaveis.update(nao_av)
            rupturas_slot: list[dict] = []
            for item_id, qtd in consumo.items():
                consumo_semana[item_id] += qtd
                saldo_corrente[item_id] -= qtd
                if saldo_corrente[item_id] < 0 and primeiro_dia_ruptura[item_id] is None:
                    primeiro_dia_ruptura[item_id] = dia
                # Registra a ruptura apenas no slot em que o saldo fica negativo
                # pela primeira vez no dia (obs #5) — sem repetir nos slots seguintes.
                if saldo_corrente[item_id] < 0 and item_id not in ja_negativo_no_dia:
                    ja_negativo_no_dia.add(item_id)
                    item = next(i for i in itens_catalogo if i.id == item_id)
                    rupturas_slot.append({
                        "item_id": item_id,
                        "nome": item.nome,
                        "faltando": -saldo_corrente[item_id],
                        "unidade_oficial": item.unidade_oficial,
                    })
            slots_dia.append({"slot": slot, "rupturas": rupturas_slot})
        if slots_dia:
            dias.append({
                "dia": (segunda + timedelta(days=dia)).isoformat(),
                "dia_semana": dia,
                "slots": slots_dia,
            })

    itens = []
    for i in itens_catalogo:
        if i.id in nao_avaliaveis:
            itens.append({
                "item_id": i.id,
                "nome": i.nome,
                "unidade_oficial": i.unidade_oficial,
                "saldo_atual": i.saldo_atual,
                "consumo_semana": None,
                "saldo_projetado": None,
                "primeiro_dia_ruptura": None,
                "avaliavel": False,
            })
        else:
            itens.append({
                "item_id": i.id,
                "nome": i.nome,
                "unidade_oficial": i.unidade_oficial,
                "saldo_atual": i.saldo_atual,
                "consumo_semana": consumo_semana[i.id],
                "saldo_projetado": saldo_corrente[i.id],
                "primeiro_dia_ruptura": primeiro_dia_ruptura[i.id],
                "avaliavel": True,
            })

    itens_com_ruptura = sum(
        1 for i in itens_catalogo
        if i.id not in nao_avaliaveis and saldo_corrente[i.id] < 0
    )
    return {
        "configurado": True,
        "dias": dias,
        "itens": itens,
        "resumo": {
            "itens_com_ruptura": itens_com_ruptura,
            "itens_nao_avaliaveis": len(nao_avaliaveis),
        },
    }


def _calcular_avisos(db: Session, entrada: models.Planejamento) -> list[dict]:
    """Avisos não-bloqueantes da refeição salva (D-18): itens com saldo projetado
    negativo, simulando o consumo acumulado de segunda até o dia_semana salvo.
    Sem config de alunos → [] (nunca bloqueia)."""
    segunda = entrada.data_inicio_vigencia - timedelta(days=entrada.data_inicio_vigencia.weekday())
    simulacao = _simular_semana(
        db, segunda,
        ate_dia=entrada.dia_semana,
        referencia=entrada.data_inicio_vigencia,
    )
    if not simulacao["configurado"]:
        return []
    avisos = []
    for info in simulacao["itens"]:
        if info["avaliavel"] and info["saldo_projetado"] is not None and info["saldo_projetado"] < 0:
            avisos.append({
                "item_id": info["item_id"],
                "nome": info["nome"],
                "faltando": -info["saldo_projetado"],
            })
    return avisos


@app.get("/planejamento")
def consultar_planejamento(
    data: date | None = None,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria", "cozinheira")),
):
    """Cardápio planejado para a semana que contém `data` (padrão: hoje)."""
    data_ref = data or date.today()
    ativos = _planejamento_ativo(db, data_ref)
    return [
        _serializar_planejamento(db, e)
        for e in sorted(ativos.values(), key=lambda x: (x.dia_semana, x.tipo_refeicao))
    ]


@app.get("/planejamento/projecao")
def projecao_planejamento(
    data: date | None = None,
    rascunho: list[str] | None = Query(None),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    """Projeção cumulativa de estoque da semana (D-17/D-20 — cozinheira não vê).

    Simula dia a dia (segunda→domingo, slots em ordem) o saldo corrente por item.
    `rascunho` (obs #4/D-18) sobrepõe slots para pré-visualização sem salvar:
    entradas malformadas/inexistentes são ignoradas (T-08-14) — nunca persiste.
    Contrato consumido pela 08-09: configurado/dias/itens/resumo; dias[].slots[].rupturas.
    """
    data_ref = data or date.today()
    segunda = data_ref - timedelta(days=data_ref.weekday())
    simulacao = _simular_semana(db, segunda, referencia=data_ref, rascunho=rascunho)
    simulacao["data_ref"] = data_ref.isoformat()
    return simulacao


@app.post("/planejamento")
def definir_planejamento(
    dados: schemas.PlanejamentoCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    """Define (ou altera) o prato de um slot dia_semana × tipo_refeicao a partir de uma vigência.

    Não bloqueia por falta de estoque (D-18): a resposta é aditiva e traz `avisos`
    com os itens que faltarão segundo a simulação cumulativa até o dia salvo.
    """
    if dados.dia_semana < 0 or dados.dia_semana > 6:
        raise HTTPException(status_code=400, detail="dia_semana deve estar entre 0 (segunda) e 6 (domingo)")
    if dados.tipo_refeicao not in SLOTS_PLANEJAMENTO:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de refeição inválido. Use: {', '.join(SLOTS_PLANEJAMENTO)}",
        )

    prato = db.query(models.CardapioItem).filter(
        models.CardapioItem.id == dados.cardapio_item_id
    ).first()
    if not prato:
        raise HTTPException(status_code=404, detail=f"Item de cardápio com id {dados.cardapio_item_id} não encontrado")

    # Upsert: mesmo slot + mesma vigência → atualiza o prato
    existente = db.query(models.Planejamento).filter(
        models.Planejamento.dia_semana == dados.dia_semana,
        models.Planejamento.tipo_refeicao == dados.tipo_refeicao,
        models.Planejamento.data_inicio_vigencia == dados.data_inicio_vigencia,
    ).first()

    if existente:
        existente.cardapio_item_id = dados.cardapio_item_id
        db.commit()
        db.refresh(existente)
        entrada = existente
    else:
        novo = models.Planejamento(
            cardapio_item_id=dados.cardapio_item_id,
            tipo_refeicao=dados.tipo_refeicao,
            dia_semana=dados.dia_semana,
            data_inicio_vigencia=dados.data_inicio_vigencia,
        )
        db.add(novo)
        db.commit()
        db.refresh(novo)
        entrada = novo

    return {**_serializar_planejamento(db, entrada), "avisos": _calcular_avisos(db, entrada)}


@app.delete("/planejamento/{planejamento_id}")
def remover_planejamento(
    planejamento_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    entrada = db.query(models.Planejamento).filter(models.Planejamento.id == planejamento_id).first()
    if not entrada:
        raise HTTPException(status_code=404, detail="Planejamento não encontrado")

    db.delete(entrada)
    db.commit()
    return {"mensagem": "Planejamento removido com sucesso!"}


# --- ENTREGAS (admin+sec) ---

def _normalizar_unidade(unidade: str) -> str:
    return unidade.strip()


def _buscar_conversao(db: Session, item_id: int, unidade: str):
    unidade_normalizada = _normalizar_unidade(unidade).casefold()
    return db.query(models.Conversao).filter(
        models.Conversao.item_id == item_id,
        func.lower(models.Conversao.medida_caseira) == unidade_normalizada,
    ).first()


def _upsert_conversao(db: Session, item_id: int, unidade: str, fator: float):
    conversao = _buscar_conversao(db, item_id, unidade)
    if conversao:
        conversao.peso_em_kg = fator
        return conversao

    conversao = models.Conversao(
        item_id=item_id,
        medida_caseira=_normalizar_unidade(unidade),
        peso_em_kg=fator,
    )
    db.add(conversao)
    return conversao


def _resolver_fator_entrega(
    db: Session,
    item: models.Item,
    unidade: str | None,
    fator_informado: float | None,
    conversoes_pendentes: dict[tuple[int, str], tuple[str, float]],
) -> tuple[str, float]:
    unidade_recebida = _normalizar_unidade(unidade or item.unidade_oficial)
    if unidade_recebida.casefold() == item.unidade_oficial.strip().casefold():
        return item.unidade_oficial, item.fator_conversao or 1.0

    if not unidade_recebida:
        raise HTTPException(status_code=400, detail=f"Informe a unidade do item '{item.nome}'")

    chave = (item.id, unidade_recebida.casefold())
    if fator_informado is not None:
        if fator_informado <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"A conversão de '{unidade_recebida}' para o item '{item.nome}' deve ser maior que zero",
            )
        conversao_existente = _buscar_conversao(db, item.id, unidade_recebida)
        unidade_canonica = conversao_existente.medida_caseira if conversao_existente else unidade_recebida
        conversoes_pendentes[chave] = (unidade_canonica, fator_informado)
        return unidade_canonica, fator_informado

    if chave in conversoes_pendentes:
        return conversoes_pendentes[chave]

    conversao = _buscar_conversao(db, item.id, unidade_recebida)
    if conversao:
        return conversao.medida_caseira, conversao.peso_em_kg

    raise HTTPException(
        status_code=400,
        detail=(
            f"Informe quanto 1 {unidade_recebida} equivale em {item.unidade_interna} "
            f"para o item '{item.nome}'"
        ),
    )

@app.post("/entregas")
def registrar_entrega(
    dados: schemas.EntregaCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    """Registra uma entrega confirmada e atualiza o estoque.

    - `recebido`: soma a quantidade ao saldo
    - `alterado`: soma a quantidade (corrigida) ao saldo, justificativa obrigatória
    - `excluído`: não altera o saldo, justificativa obrigatória
    """
    # 1. Validar tudo antes de gravar qualquer coisa
    # Regras por origem (D-07): manual = observações + só recebido; xml = nota + justificativa
    if dados.origem not in ("xml", "manual"):
        raise HTTPException(status_code=400, detail="origem deve ser 'xml' ou 'manual'")

    fornecedor = db.query(models.Fornecedor).filter(
        models.Fornecedor.id == dados.fornecedor_id
    ).first()
    if not fornecedor:
        raise HTTPException(
            status_code=404,
            detail=f"Fornecedor com id {dados.fornecedor_id} não encontrado",
        )

    if dados.origem == "manual":
        if not dados.observacoes or not dados.observacoes.strip():
            raise HTTPException(status_code=400, detail="Entregas manuais exigem observações")
        for item_req in dados.itens:
            if item_req.acao != "recebido":
                raise HTTPException(
                    status_code=400,
                    detail=f"Entregas manuais registram apenas ação 'recebido' (item {item_req.item_id})",
                )
    elif dados.origem == "xml":
        if not dados.nota_numero or not dados.nota_numero.strip():
            raise HTTPException(
                status_code=400,
                detail="Entregas XML exigem o número da nota (nota_numero)",
            )

    conversoes_pendentes: dict[tuple[int, str], tuple[str, float]] = {}
    fatores_resolvidos: list[tuple[str, float]] = []
    for item_req in dados.itens:
        if item_req.acao not in ACOES_ENTREGA_VALIDAS:
            raise HTTPException(
                status_code=400,
                detail=f"Ação inválida: '{item_req.acao}'. Use: {', '.join(ACOES_ENTREGA_VALIDAS)}",
            )
        # Justificativa por item é exigida apenas para entregas XML (origem manual só recebe 'recebido')
        if (
            dados.origem == "xml"
            and item_req.acao in ("alterado", "excluído")
            and not item_req.justificativa
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Item {item_req.item_id}: ação '{item_req.acao}' exige justificativa",
            )
        item = db.query(models.Item).filter(models.Item.id == item_req.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item com id {item_req.item_id} não encontrado")

        if item_req.acao in ("recebido", "alterado"):
            unidade, fator = _resolver_fator_entrega(
                db,
                item,
                item_req.unidade,
                item_req.fator_conversao,
                conversoes_pendentes,
            )
            fatores_resolvidos.append((unidade, fator))
        else:
            unidade = _normalizar_unidade(item_req.unidade or item.unidade_oficial)
            fator = item.fator_conversao or 1.0
            fatores_resolvidos.append((unidade, fator))

    # 2. Criar a entrega e os itens, atualizando o estoque
    for (item_id, _), (unidade, fator) in conversoes_pendentes.items():
        _upsert_conversao(db, item_id, unidade, fator)

    entrega = models.Entrega(
        id_usuario=usuario.id,
        origem=dados.origem,
        data_entrega=dados.data_entrega,
        fornecedor_id=dados.fornecedor_id,
        nota_numero=dados.nota_numero,
        observacoes=dados.observacoes,
    )
    db.add(entrega)
    db.flush()  # garante o id antes de gravar os itens

    for item_req, (unidade, fator) in zip(dados.itens, fatores_resolvidos):
        item = db.query(models.Item).filter(models.Item.id == item_req.item_id).first()
        if item_req.acao in ("recebido", "alterado"):
            item.saldo_atual += item_req.quantidade * fator
        db.add(models.ItemEntrega(
            entrega_id=entrega.id,
            item_id=item_req.item_id,
            quantidade=item_req.quantidade,
            unidade=unidade,
            fator_conversao=fator,
            # D-07: origem manual não grava justificativa por item (campo sempre None)
            justificativa=None if dados.origem == "manual" else item_req.justificativa,
            acao=item_req.acao,
        ))

    db.commit()
    db.refresh(entrega)
    return {"id": entrega.id, "mensagem": "Entrega registrada e estoque atualizado com sucesso!"}


@app.get("/entregas")
def listar_entregas(
    data: date | None = None,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    query = db.query(models.Entrega)
    if data:
        # WR-03: filtra pela data de ENTREGA (D-05/D-09 — a data que a secretaria/gestão
        # enxerga), com fallback para a data de registro em entregas legadas sem data_entrega
        # (D-10). func.date() normaliza data_hora (datetime) e data_entrega (date) para o dia.
        query = query.filter(
            func.date(func.coalesce(models.Entrega.data_entrega, models.Entrega.data_hora)) == data.isoformat()
        )
    entregas = query.order_by(models.Entrega.id.desc()).all()
    resultado = []
    for e in entregas:
        fornecedor = db.query(models.Fornecedor).filter(
            models.Fornecedor.id == e.fornecedor_id
        ).first() if e.fornecedor_id else None
        registrador = db.query(models.Usuario).filter(
            models.Usuario.id == e.id_usuario
        ).first()
        resultado.append({
            "id": e.id,
            "data_hora": e.data_hora.isoformat(),
            "id_usuario": e.id_usuario,
            "id_usuario_nome": registrador.nome if registrador else None,
            "origem": e.origem,
            "data_entrega": e.data_entrega.isoformat() if e.data_entrega else None,
            "fornecedor_id": e.fornecedor_id,
            "fornecedor_nome": fornecedor.nome if fornecedor else None,
            "nota_numero": e.nota_numero,
            "observacoes": e.observacoes,
            "qtd_itens": db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == e.id).count(),
        })
    return resultado


@app.get("/entregas/{entrega_id}")
def detalhar_entrega(
    entrega_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    entrega = db.query(models.Entrega).filter(models.Entrega.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")

    itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega_id).all()
    fornecedor = db.query(models.Fornecedor).filter(
        models.Fornecedor.id == entrega.fornecedor_id
    ).first() if entrega.fornecedor_id else None
    registrador = db.query(models.Usuario).filter(
        models.Usuario.id == entrega.id_usuario
    ).first()
    return {
        "id": entrega.id,
        "data_hora": entrega.data_hora.isoformat(),
        "id_usuario": entrega.id_usuario,
        "id_usuario_nome": registrador.nome if registrador else None,
        "origem": entrega.origem,
        "data_entrega": entrega.data_entrega.isoformat() if entrega.data_entrega else None,
        "fornecedor_id": entrega.fornecedor_id,
        "fornecedor_nome": fornecedor.nome if fornecedor else None,
        "nota_numero": entrega.nota_numero,
        "observacoes": entrega.observacoes,
        "itens": [
            {
                "id": ie.id,
                "item_id": ie.item_id,
                "item_nome": (db.query(models.Item).filter(models.Item.id == ie.item_id).first() or {}).nome
                if db.query(models.Item).filter(models.Item.id == ie.item_id).first() else None,
                "quantidade": ie.quantidade,
                "unidade": ie.unidade,
                "fator_conversao": ie.fator_conversao,
                "acao": ie.acao,
                "justificativa": ie.justificativa,
            }
            for ie in itens
        ],
    }


# --- ALUNOS POR PERÍODO (configuração admin-only; leitura admin+sec+cozinheira) ---
# D-14: admin configura 3 grupos (manha/tarde/noite); cozinheira não edita.
# D-15: o total de cada slot é derivado dos períodos.

def _valores_alunos_por_periodo(db: Session) -> dict[str, int]:
    """Lê as 3 linhas da configuração; lança HTTPException se alguma faltar."""
    linhas = db.query(models.AlunosPorPeriodo).all()
    valores = {linha.periodo: linha.qtd for linha in linhas}
    if not {"manha", "tarde", "noite"}.issubset(valores):
        raise HTTPException(
            status_code=400,
            detail="Configure os alunos por período antes de lançar a refeição",
        )
    return valores


def _total_por_slot(db: Session, slot: str) -> int:
    """Total de alunos do slot (D-15): Lanche da Manhã=manha, Almoço=manha+tarde,
    Lanche da Tarde=tarde, Janta=noite. 400 se o slot for inválido ou a config faltar."""
    if slot not in SLOTS_PLANEJAMENTO:
        raise HTTPException(
            status_code=400,
            detail=f"Slot de refeição inválido. Use: {', '.join(SLOTS_PLANEJAMENTO)}",
        )
    valores = _valores_alunos_por_periodo(db)
    if slot == "Lanche da Manhã":
        return valores["manha"]
    if slot == "Almoço":
        return valores["manha"] + valores["tarde"]
    if slot == "Lanche da Tarde":
        return valores["tarde"]
    return valores["noite"]  # Janta


def _derivar_tipo_slot(slot: str) -> str:
    """Espelho de `tipoParaLancamento` do frontend: os dois lanches viram 'Lanche'."""
    if slot in ("Lanche da Manhã", "Lanche da Tarde"):
        return "Lanche"
    return slot


@app.get("/alunos-por-periodo")
def consultar_alunos_por_periodo(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria", "cozinheira")),
):
    linhas = db.query(models.AlunosPorPeriodo).all()
    valores = {linha.periodo: linha for linha in linhas}
    if not {"manha", "tarde", "noite"}.issubset(valores):
        raise HTTPException(
            status_code=404,
            detail="Configuração de alunos por período ainda não definida",
        )
    mais_recente = max(linhas, key=lambda l: l.updated_at or datetime.min)
    return {
        "manha": valores["manha"].qtd,
        "tarde": valores["tarde"].qtd,
        "noite": valores["noite"].qtd,
        "updated_at": mais_recente.updated_at.isoformat() if mais_recente.updated_at else None,
        "updated_by": mais_recente.updated_by,
    }


@app.put("/alunos-por-periodo")
def configurar_alunos_por_periodo(
    dados: schemas.AlunosPorPeriodoUpdate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    """Upsert das 3 linhas de configuração com auditoria (updated_at/updated_by)."""
    agora = datetime.now()
    for periodo, qtd in (("manha", dados.manha), ("tarde", dados.tarde), ("noite", dados.noite)):
        linha = db.query(models.AlunosPorPeriodo).filter(
            models.AlunosPorPeriodo.periodo == periodo
        ).first()
        if linha:
            linha.qtd = qtd
            linha.updated_at = agora
            linha.updated_by = usuario.id
        else:
            db.add(models.AlunosPorPeriodo(
                periodo=periodo,
                qtd=qtd,
                updated_at=agora,
                updated_by=usuario.id,
            ))
    db.commit()
    return {
        "manha": dados.manha,
        "tarde": dados.tarde,
        "noite": dados.noite,
        "updated_at": agora.isoformat(),
        "updated_by": usuario.id,
    }


# --- REFEIÇÕES (lançamento cozinheira; leitura admin/sec) ---

def _converter_para_unidade_oficial(
    db: Session,
    item: models.Item,
    quantidade: float,
    medida: str,
) -> float:
    """Converte `quantidade` na `medida` para a unidade oficial do item (KG/L).

    Levanta HTTPException 400 se a medida for caseira e não houver conversão cadastrada.
    """
    medida_normalizada = _normalizar_unidade(medida)
    if medida_normalizada.upper() in ["KG", "L", "LITRO", "LITROS"]:
        return quantidade

    conversao = _buscar_conversao(db, item.id, medida_normalizada)
    if not conversao:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Sem conversão cadastrada de '{medida_normalizada}' para o item '{item.nome}'. "
                "Solicite ao admin o cadastro da conversão antes do lançamento."
            ),
        )
    return quantidade * conversao.peso_em_kg


@app.post("/refeicoes")
def lancar_refeicao_v2(
    dados: schemas.RefeicaoCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("cozinheira")),
):
    """Lança uma refeição a partir do slot (D-16b): o backend deriva o tipo e o
    total de alunos da configuração vigente — a cozinheira não envia qtd_alunos.

    Converte medidas caseiras, deduz o estoque (bloqueia se insuficiente) e audita
    ajustes divergentes da receita escalada (justificativa obrigatória).
    """
    tipo = _derivar_tipo_slot(dados.slot)
    if tipo not in TIPOS_REFEICAO_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Slot de refeição inválido. Use: {', '.join(SLOTS_PLANEJAMENTO)}",
        )
    qtd_alunos = _total_por_slot(db, dados.slot)

    # 08-11: nome da refeição extraordinária (T-08-17) — obrigatório em avulsas
    # (planejamento_id None), rejeitado em planejadas (nunca substitui o prato
    # planejado). Só espaços conta como ausente.
    if dados.planejamento_id is None:
        if not dados.nome_extra or not dados.nome_extra.strip():
            raise HTTPException(
                status_code=400,
                detail="Informe o nome da refeição no lançamento avulso",
            )
    elif dados.nome_extra and dados.nome_extra.strip():
        raise HTTPException(
            status_code=400,
            detail="Refeições planejadas não aceitam nome extra: use o prato do planejamento",
        )

    # Receita de referência (quando ligada a um planejamento)
    receita_map = {}
    if dados.planejamento_id is not None:
        plan = db.query(models.Planejamento).filter(models.Planejamento.id == dados.planejamento_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Planejamento com id {dados.planejamento_id} não encontrado")
        receitas = db.query(models.Receita).filter(
            models.Receita.cardapio_item_id == plan.cardapio_item_id
        ).all()
        receita_map = {r.item_id: r for r in receitas}

    # 1. Validar tudo antes de gravar/deduzir qualquer coisa
    preparados = []
    for item_req in dados.itens:
        item = db.query(models.Item).filter(models.Item.id == item_req.item_id).first()
        if not item:
            raise HTTPException(status_code=400, detail=f"Item com id {item_req.item_id} não encontrado no estoque")

        qtd_oficial = _converter_para_unidade_oficial(
            db,
            item,
            item_req.quantidade,
            item_req.medida_caseira,
        )

        if item.saldo_atual < qtd_oficial:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente de '{item.nome}': necessário {qtd_oficial:.3f}, disponível {item.saldo_atual:.3f}",
            )

        # Auditoria: a receita-base é por aluno; divergência da receita escalada exige justificativa.
        # WR-02: a comparação é SEMPRE na unidade oficial (kg/L) — a quantidade esperada da
        # receita (medida caseira) é convertida com a mesma tabela de conversões do envio, e o
        # registro de auditoria guarda o esperado expresso na medida enviada (sem misturar unidades).
        receita_item = receita_map.get(item_req.item_id)
        quantidade_esperada = receita_item.quantidade * qtd_alunos if receita_item else None
        quantidade_original = item_req.quantidade
        if dados.planejamento_id is not None:
            divergente = receita_item is None
            if receita_item is not None:
                try:
                    esperada_oficial = _converter_para_unidade_oficial(
                        db, item, quantidade_esperada, receita_item.medida_caseira
                    )
                except HTTPException:
                    # Medida da receita sem conversão cadastrada: mantém a comparação crua
                    # histórica (a cozinha normalmente envia na medida da receita).
                    divergente = abs(quantidade_esperada - item_req.quantidade) > 1e-9
                    quantidade_original = quantidade_esperada
                else:
                    divergente = abs(esperada_oficial - qtd_oficial) > 1e-9
                    fator_enviado = _converter_para_unidade_oficial(
                        db, item, 1.0, item_req.medida_caseira
                    )
                    if fator_enviado:
                        quantidade_original = esperada_oficial / fator_enviado
            if divergente and not item_req.justificativa:
                motivo = "não faz parte da receita planejada" if receita_item is None else \
                    f"quantidade diverge da receita planejada ({quantidade_original} {item_req.medida_caseira} para {qtd_alunos} alunos)"
                raise HTTPException(
                    status_code=400,
                    detail=f"Item '{item.nome}' {motivo} — justificativa obrigatória",
                )

        preparados.append((item, item_req, qtd_oficial, quantidade_original))

    refeicao = models.Refeicao(
        tipo_refeicao=tipo,
        id_usuario=usuario.id,
        qtd_alunos=qtd_alunos,
        planejamento_id=dados.planejamento_id,
        slot=dados.slot,
        nome_extra=dados.nome_extra.strip() if dados.nome_extra else None,
    )
    db.add(refeicao)
    db.flush()  # garante o id antes de gravar os itens

    for item, item_req, qtd_oficial, quantidade_original in preparados:
        item.saldo_atual -= qtd_oficial
        db.add(models.RefeicaoItem(
            refeicao_id=refeicao.id,
            item_id=item.id,
            quantidade_original=quantidade_original,
            quantidade_ajustada=item_req.quantidade,
            medida_caseira=item_req.medida_caseira,
            justificativa=item_req.justificativa,
        ))

    db.commit()
    db.refresh(refeicao)
    return {"id": refeicao.id, "mensagem": f"Refeição servida a {qtd_alunos} alunos! Estoque abatido com sucesso."}


@app.get("/refeicoes")
def historico_refeicoes(
    data: date | None = None,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    query = db.query(models.Refeicao)
    if data:
        query = query.filter(func.date(models.Refeicao.data_hora) == data.isoformat())
    refeicoes = query.order_by(models.Refeicao.id.desc()).all()

    resultado = []
    for r in refeicoes:
        itens = db.query(models.RefeicaoItem).filter(models.RefeicaoItem.refeicao_id == r.id).all()
        # 08-11: nome exibido da refeição — avulsa usa o nome informado pela
        # cozinheira; planejada usa o prato do planejamento (nunca o nome extra).
        nome_refeicao = r.nome_extra
        if r.planejamento_id:
            plan = db.query(models.Planejamento).filter(models.Planejamento.id == r.planejamento_id).first()
            if plan:
                card = db.query(models.CardapioItem).filter(models.CardapioItem.id == plan.cardapio_item_id).first()
                nome_refeicao = card.nome_refeicao if card else None
        resultado.append({
            "id": r.id,
            "data_hora": r.data_hora.isoformat(),
            "tipo_refeicao": r.tipo_refeicao,
            "slot": r.slot,
            "extra": r.planejamento_id is None,
            "nome_refeicao": nome_refeicao,
            "nome_extra": r.nome_extra,
            "qtd_alunos": r.qtd_alunos,
            "id_usuario": r.id_usuario,
            "planejamento_id": r.planejamento_id,
            "itens": [
                {
                    "item_id": ri.item_id,
                    "item_nome": (db.query(models.Item).filter(models.Item.id == ri.item_id).first() or {}).nome
                    if db.query(models.Item).filter(models.Item.id == ri.item_id).first() else None,
                    "quantidade_original": ri.quantidade_original,
                    "quantidade_ajustada": ri.quantidade_ajustada,
                    "medida_caseira": ri.medida_caseira,
                    "justificativa": ri.justificativa,
                }
                for ri in itens
            ],
        })
    return resultado


def _status_refeicoes_do_dia(db: Session, dia: date) -> list:
    """Status (pendente/confirmado) por SLOT do dia informado (obs #7).

    Iteração pelos 4 slots de `SLOTS_PLANEJAMENTO`; para cada slot, a refeição
    do dia casa por `r.slot == slot`. Legado (slot NULL) cai no fallback por
    `tipo_refeicao` derivado do slot quando nenhuma outra refeição ocupou o slot.
    Refeição avulsa (sem planejamento) marca `extra: true` — ocupa o slot.
    """
    refeicoes = db.query(models.Refeicao).filter(
        func.date(models.Refeicao.data_hora) == dia.isoformat()
    ).all()

    status = []
    for slot in SLOTS_PLANEJAMENTO:
        ref = next((r for r in refeicoes if r.slot == slot), None)
        if ref is None:
            # Legado (slot NULL — avulsas sem derivação): casa pelo tipo derivado
            ref = next(
                (r for r in refeicoes if r.slot is None and r.tipo_refeicao == _derivar_tipo_slot(slot)),
                None,
            )
        if ref:
            # 08-11: avulsa exibe o nome informado pela cozinheira no campo
            # prato; planejada exibe o prato do planejamento vinculado.
            prato = ref.nome_extra
            if ref.planejamento_id:
                plan = db.query(models.Planejamento).filter(models.Planejamento.id == ref.planejamento_id).first()
                if plan:
                    card = db.query(models.CardapioItem).filter(models.CardapioItem.id == plan.cardapio_item_id).first()
                    prato = card.nome_refeicao if card else None
            status.append({
                "slot": slot,
                "status": "confirmado",
                "extra": ref.planejamento_id is None,
                "prato": prato,
                "alunos": ref.qtd_alunos,
            })
        else:
            status.append({"slot": slot, "status": "pendente", "extra": False, "prato": None, "alunos": None})
    return status


@app.get("/refeicoes/hoje")
def refeicoes_hoje(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "cozinheira")),
):
    return _status_refeicoes_do_dia(db, date.today())


# --- DASHBOARD ADMIN ---

@app.get("/admin/dashboard")
def dashboard_admin(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
    hoje = date.today()

    # 1. Estoque — críticos pelo limiar individual do item, na unidade de exibição (D-02/D-04)
    itens = db.query(models.Item).all()
    criticos = [
        {
            "id": i.id,
            "nome": i.nome,
            "saldo_atual": i.saldo_atual / (i.fator_conversao or 1.0),
            "unidade_oficial": i.unidade_oficial,
            "fator_conversao": i.fator_conversao or 1.0,
            "limiar": i.limiar or 5.0,
        }
        for i in itens
        if (i.saldo_atual / (i.fator_conversao or 1.0)) < (i.limiar or 5.0)
    ]

    # 2. Refeições de hoje (mesmo formato de /refeicoes/hoje)
    status_hoje = _status_refeicoes_do_dia(db, hoje)

    # 3. Entregas
    desde_7 = hoje.fromordinal(hoje.toordinal() - 7)
    desde_30 = hoje.fromordinal(hoje.toordinal() - 30)
    entregas = db.query(models.Entrega).all()
    ultima = max((e.data_hora.date() for e in entregas), default=None)

    # 4. Alunos hoje
    refeicoes_hoje = db.query(models.Refeicao).filter(
        func.date(models.Refeicao.data_hora) == hoje.isoformat()
    ).all()
    por_tipo = {}
    for r in refeicoes_hoje:
        por_tipo[r.tipo_refeicao] = por_tipo.get(r.tipo_refeicao, 0) + r.qtd_alunos

    return {
        "estoque": {
            "total_itens": len(itens),
            "baixo_estoque": len(criticos),
            "itens_criticos": criticos,
        },
        "refeicoes_hoje": status_hoje,
        "entregas": {
            "ultimos_7_dias": sum(1 for e in entregas if e.data_hora.date() >= desde_7),
            "ultimos_30_dias": sum(1 for e in entregas if e.data_hora.date() >= desde_30),
            "ultima_data": ultima.isoformat() if ultima else None,
        },
        "alunos_hoje": {
            "total": sum(r.qtd_alunos for r in refeicoes_hoje),
            "por_tipo": por_tipo,
        },
    }


# --- CARDÁPIO PÚBLICO (sem autenticação) ---

def _slot_fallback_por_tipo(tipo_refeicao: str) -> str | None:
    """Fallback de slot para avulsas legadas (slot NULL): primeiro slot canônico
    cujo tipo derivado casa — mesmo critério do status por slot (obs #7)."""
    for slot in SLOTS_PLANEJAMENTO:
        if _derivar_tipo_slot(slot) == tipo_refeicao:
            return slot
    return None


@app.get("/publico/cardapio")
def cardapio_publico(data: date | None = None, db: Session = Depends(get_db)):
    """Cardápio do dia para exibição pública (telas da escola), sem autenticação.

    08-11: resposta em LISTA, ordenada pela ordem canônica dos quatro slots.
    Cada entrada traz `tipo_refeicao` (rótulo do momento de serviço = slot),
    `nome_refeicao`, `slot`, `extra` e `ingredientes`. Refeições planejadas e
    extras do mesmo slot COEXISTEM (sem deduplicar): a planejada vem primeiro,
    depois as extras por id. T-08-18: apenas nome e ingredientes — sem usuário,
    justificativas ou dados de auditoria. T-08-19: escopo limitado à data.
    """
    data_ref = data or date.today()
    ativos = _planejamento_ativo(db, data_ref)

    entradas: list[dict] = []
    for (dia_semana, tipo), entrada in sorted(ativos.items(), key=lambda kv: kv[0][1]):
        if dia_semana != data_ref.weekday():
            continue
        prato = db.query(models.CardapioItem).filter(
            models.CardapioItem.id == entrada.cardapio_item_id
        ).first()
        ingredientes = []
        if prato:
            receitas = db.query(models.Receita).filter(
                models.Receita.cardapio_item_id == prato.id
            ).all()
            for r in receitas:
                item = db.query(models.Item).filter(models.Item.id == r.item_id).first()
                ingredientes.append({
                    "item_nome": item.nome if item else None,
                    "quantidade": r.quantidade,
                    "medida_caseira": r.medida_caseira,
                })
        entradas.append({
            "tipo_refeicao": tipo,
            "nome_refeicao": prato.nome_refeicao if prato else None,
            "slot": tipo,
            "extra": False,
            "ingredientes": ingredientes,
        })

    # Refeições extras da data (08-11): nome próprio informado pela cozinheira,
    # slot do lançamento e itens efetivamente servidos como ingredientes.
    # Avulsas legadas sem slot caem no fallback por tipo derivado; sem slot
    # derivável, não publicam (fora dos quatro momentos de serviço).
    extras = db.query(models.Refeicao).filter(
        func.date(models.Refeicao.data_hora) == data_ref.isoformat(),
        models.Refeicao.planejamento_id.is_(None),
    ).order_by(models.Refeicao.id).all()
    for extra in extras:
        slot = extra.slot or _slot_fallback_por_tipo(extra.tipo_refeicao)
        if slot is None:
            continue
        itens = db.query(models.RefeicaoItem).filter(
            models.RefeicaoItem.refeicao_id == extra.id
        ).all()
        ingredientes = []
        for ri in itens:
            item = db.query(models.Item).filter(models.Item.id == ri.item_id).first()
            ingredientes.append({
                "item_nome": item.nome if item else None,
                "quantidade": ri.quantidade_ajustada,
                "medida_caseira": ri.medida_caseira,
            })
        entradas.append({
            "tipo_refeicao": slot,
            "nome_refeicao": extra.nome_extra,
            "slot": slot,
            "extra": True,
            "ingredientes": ingredientes,
        })

    # Ordenação canônica: slot em SLOTS_PLANEJAMENTO; dentro do slot a planejada
    # (extra=False) vem primeiro e as extras por id (ordem de inserção estável).
    ordem_slots = {s: i for i, s in enumerate(SLOTS_PLANEJAMENTO)}
    entradas.sort(key=lambda e: (ordem_slots.get(e["slot"], len(SLOTS_PLANEJAMENTO)), e["extra"]))
    return entradas


# =========================================================================
# ROTAS LEGADAS DE ESTOQUE
# =========================================================================

# ROTA 1: Cadastrar um novo ingrediente no estoque
@app.post("/estoque")
def cadastrar_ingrediente(ingrediente: schemas.IngredienteCreate, db: Session = Depends(get_db)):
    novo_item = models.Item(
        nome=ingrediente.nome_ingrediente,
        unidade_oficial=ingrediente.unidade_medida_oficial,
        saldo_atual=ingrediente.saldo_atual
    )
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    return {"mensagem": f"{novo_item.nome} cadastrado com sucesso!"}

# ROTA 2: Ver todo o estoque
# Serializa com os nomes de campos que o frontend atual espera
@app.get("/estoque")
def listar_estoque(db: Session = Depends(get_db)):
    itens = db.query(models.Item).all()
    return [
        {
            "id": item.id,
            "nome_ingrediente": item.nome,
            "unidade_medida_oficial": item.unidade_oficial,
            "saldo_atual": item.saldo_atual,
        }
        for item in itens
    ]
