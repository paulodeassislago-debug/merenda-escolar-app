from datetime import date

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

import auth
import models
import schemas
from config import CORS_ORIGINS
from database import engine, SessionLocal

# Cria o banco e as tabelas automaticamente se não existirem
models.Base.metadata.create_all(bind=engine)

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

# Saldo abaixo deste valor (na unidade oficial) é considerado baixo estoque
LIMIAR_BAIXO_ESTOQUE = 5.0


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
        }
        for item in itens
    ]


@app.post("/itens")
def criar_item(
    dados: schemas.ItemCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin")),
):
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

    existente = db.query(models.Item).filter(models.Item.nome == dados.nome).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Já existe um item com o nome '{dados.nome}'")

    novo = models.Item(
        nome=dados.nome,
        unidade_oficial=dados.unidade_oficial,
        saldo_atual=dados.saldo_atual * (dados.fator_conversao or 1.0),
        unidade_interna=dados.unidade_interna or "KG",
        fator_conversao=dados.fator_conversao or 1.0,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return {
        "id": novo.id,
        "nome": novo.nome,
        "unidade_oficial": novo.unidade_oficial,
        "saldo_atual": novo.saldo_atual,
        "unidade_interna": novo.unidade_interna,
        "fator_conversao": novo.fator_conversao,
    }


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

    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "nome": item.nome,
        "unidade_oficial": item.unidade_oficial,
        "saldo_atual": item.saldo_atual,
        "unidade_interna": item.unidade_interna,
        "fator_conversao": item.fator_conversao,
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


@app.post("/planejamento")
def definir_planejamento(
    dados: schemas.PlanejamentoCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("admin", "secretaria")),
):
    """Define (ou altera) o prato de um slot dia_semana × tipo_refeicao a partir de uma vigência."""
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
        return _serializar_planejamento(db, existente)

    novo = models.Planejamento(
        cardapio_item_id=dados.cardapio_item_id,
        tipo_refeicao=dados.tipo_refeicao,
        dia_semana=dados.dia_semana,
        data_inicio_vigencia=dados.data_inicio_vigencia,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return _serializar_planejamento(db, novo)


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
    conversoes_pendentes: dict[tuple[int, str], tuple[str, float]] = {}
    fatores_resolvidos: list[tuple[str, float]] = []
    for item_req in dados.itens:
        if item_req.acao not in ACOES_ENTREGA_VALIDAS:
            raise HTTPException(
                status_code=400,
                detail=f"Ação inválida: '{item_req.acao}'. Use: {', '.join(ACOES_ENTREGA_VALIDAS)}",
            )
        if item_req.acao in ("alterado", "excluído") and not item_req.justificativa:
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

    entrega = models.Entrega(id_usuario=usuario.id)
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
            justificativa=item_req.justificativa,
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
        query = query.filter(func.date(models.Entrega.data_hora) == data.isoformat())
    entregas = query.order_by(models.Entrega.id.desc()).all()
    return [
        {
            "id": e.id,
            "data_hora": e.data_hora.isoformat(),
            "id_usuario": e.id_usuario,
            "qtd_itens": db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == e.id).count(),
        }
        for e in entregas
    ]


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
    return {
        "id": entrega.id,
        "data_hora": entrega.data_hora.isoformat(),
        "id_usuario": entrega.id_usuario,
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


# --- REFEIÇÕES (lançamento cozinheira; leitura admin/sec) ---

def _converter_para_unidade_oficial(
    db: Session,
    item: models.Item,
    quantidade: float,
    medida: str,
    peso_informado: float | None = None,
    conversoes_pendentes: dict[tuple[int, str], tuple[str, float]] | None = None,
) -> float:
    """Converte `quantidade` na `medida` para a unidade oficial do item (KG/L).

    Levanta HTTPException 400 se a medida for caseira e não houver conversão cadastrada.
    """
    medida_normalizada = _normalizar_unidade(medida)
    if medida_normalizada.upper() in ["KG", "L", "LITRO", "LITROS"]:
        return quantidade
    chave = (item.id, medida_normalizada.casefold())
    if peso_informado is not None:
        if peso_informado <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"A conversão de '{medida_normalizada}' para o item '{item.nome}' deve ser maior que zero",
            )
        conversao_existente = _buscar_conversao(db, item.id, medida_normalizada)
        unidade_canonica = conversao_existente.medida_caseira if conversao_existente else medida_normalizada
        if conversoes_pendentes is not None:
            conversoes_pendentes[chave] = (unidade_canonica, peso_informado)
        return quantidade * peso_informado

    if conversoes_pendentes and chave in conversoes_pendentes:
        return quantidade * conversoes_pendentes[chave][1]

    conversao = _buscar_conversao(db, item.id, medida_normalizada)
    if not conversao:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Sem conversão cadastrada de '{medida_normalizada}' para o item '{item.nome}'. "
                "Informe peso_em_kg para cadastrar a conversão no lançamento."
            ),
        )
    return quantidade * conversao.peso_em_kg


@app.post("/refeicoes")
def lancar_refeicao_v2(
    dados: schemas.RefeicaoCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(auth.require_perfil("cozinheira")),
):
    """Lança uma refeição: converte medidas caseiras, deduz o estoque e audita ajustes.

    Se `planejamento_id` for informado, a receita é escalada pelo número de alunos.
    Quantidades divergentes da receita escalada (ou itens fora da receita) exigem justificativa.
    """
    if dados.tipo_refeicao not in TIPOS_REFEICAO_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de refeição inválido. Use: {', '.join(TIPOS_REFEICAO_VALIDOS)}",
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
    conversoes_pendentes: dict[tuple[int, str], tuple[str, float]] = {}
    for item_req in dados.itens:
        item = db.query(models.Item).filter(models.Item.id == item_req.item_id).first()
        if not item:
            raise HTTPException(status_code=400, detail=f"Item com id {item_req.item_id} não encontrado no estoque")

        qtd_oficial = _converter_para_unidade_oficial(
            db,
            item,
            item_req.quantidade,
            item_req.medida_caseira,
            item_req.peso_em_kg,
            conversoes_pendentes,
        )

        if item.saldo_atual < qtd_oficial:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente de '{item.nome}': necessário {qtd_oficial:.3f}, disponível {item.saldo_atual:.3f}",
            )

        # Auditoria: a receita-base é por aluno; divergência da receita escalada exige justificativa.
        receita_item = receita_map.get(item_req.item_id)
        quantidade_esperada = receita_item.quantidade * dados.qtd_alunos if receita_item else None
        if dados.planejamento_id is not None:
            divergente = receita_item is None or abs(quantidade_esperada - item_req.quantidade) > 1e-9
            if divergente and not item_req.justificativa:
                motivo = "não faz parte da receita planejada" if receita_item is None else \
                    f"quantidade diverge da receita planejada ({quantidade_esperada} {receita_item.medida_caseira} para {dados.qtd_alunos} alunos)"
                raise HTTPException(
                    status_code=400,
                    detail=f"Item '{item.nome}' {motivo} — justificativa obrigatória",
                )

        preparados.append((item, item_req, qtd_oficial, receita_item, quantidade_esperada))

    # 2. Persistir conversões novas e deduzir estoque
    for (item_id, _), (medida, peso) in conversoes_pendentes.items():
        _upsert_conversao(db, item_id, medida, peso)

    refeicao = models.Refeicao(
        tipo_refeicao=dados.tipo_refeicao,
        id_usuario=usuario.id,
        qtd_alunos=dados.qtd_alunos,
        planejamento_id=dados.planejamento_id,
    )
    db.add(refeicao)
    db.flush()  # garante o id antes de gravar os itens

    for item, item_req, qtd_oficial, receita_item, quantidade_esperada in preparados:
        item.saldo_atual -= qtd_oficial
        db.add(models.RefeicaoItem(
            refeicao_id=refeicao.id,
            item_id=item.id,
            quantidade_original=quantidade_esperada if quantidade_esperada is not None else item_req.quantidade,
            quantidade_ajustada=item_req.quantidade,
            medida_caseira=item_req.medida_caseira,
            justificativa=item_req.justificativa,
        ))

    db.commit()
    db.refresh(refeicao)
    return {"id": refeicao.id, "mensagem": f"Refeição servida a {dados.qtd_alunos} alunos! Estoque abatido com sucesso."}


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
        resultado.append({
            "id": r.id,
            "data_hora": r.data_hora.isoformat(),
            "tipo_refeicao": r.tipo_refeicao,
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
    """Status (pendente/confirmado) de cada tipo de refeição no dia informado."""
    refeicoes = db.query(models.Refeicao).filter(
        func.date(models.Refeicao.data_hora) == dia.isoformat()
    ).all()

    status = []
    for tipo in TIPOS_REFEICAO_VALIDOS:
        ref = next((r for r in refeicoes if r.tipo_refeicao == tipo), None)
        if ref:
            prato = None
            if ref.planejamento_id:
                plan = db.query(models.Planejamento).filter(models.Planejamento.id == ref.planejamento_id).first()
                if plan:
                    card = db.query(models.CardapioItem).filter(models.CardapioItem.id == plan.cardapio_item_id).first()
                    prato = card.nome_refeicao if card else None
            status.append({
                "tipo_refeicao": tipo,
                "status": "confirmado",
                "prato": prato,
                "alunos": ref.qtd_alunos,
            })
        else:
            status.append({"tipo_refeicao": tipo, "status": "pendente", "prato": None, "alunos": None})
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

    # 1. Estoque
    itens = db.query(models.Item).all()
    criticos = [
        {
            "id": i.id,
            "nome": i.nome,
            "saldo_atual": i.saldo_atual / (i.fator_conversao or 1.0),
            "unidade_oficial": i.unidade_oficial,
            "fator_conversao": i.fator_conversao or 1.0,
        }
        for i in itens
        if (i.saldo_atual / (i.fator_conversao or 1.0)) < LIMIAR_BAIXO_ESTOQUE
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

@app.get("/publico/cardapio")
def cardapio_publico(data: date | None = None, db: Session = Depends(get_db)):
    """Cardápio do dia para exibição pública (telas da escola), sem autenticação."""
    data_ref = data or date.today()
    ativos = _planejamento_ativo(db, data_ref)

    resultado = []
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
        resultado.append({
            "tipo_refeicao": tipo,
            "nome_refeicao": prato.nome_refeicao if prato else None,
            "ingredientes": ingredientes,
        })
    return resultado


# =========================================================================
# ROTAS LEGADAS (compatíveis com o frontend atual; serão substituídas nas Fases 3/6)
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

# ROTA 4: Lançar Refeição e Abater no Estoque Automaticamente
@app.post("/refeicoes/lancar")
def lancar_refeicao(lancamento: schemas.LancamentoRefeicao, db: Session = Depends(get_db)):

    itens_processados = []

    # 1. Analisar cada ingrediente usado pela cozinheira
    for item_usado in lancamento.ingredientes:
        qtd_a_descontar = item_usado.quantidade

        # 2. Localizar o item no estoque
        estoque_item = db.query(models.Item).filter(models.Item.nome == item_usado.nome).first()
        if not estoque_item:
            return {"erro": f"O ingrediente '{item_usado.nome}' não foi encontrado no estoque!"}

        # 3. Se a medida não for KG ou L (oficial), fazemos a conversão
        if item_usado.medida.upper() not in ["KG", "L", "LITRO", "LITROS"]:
            conversao = db.query(models.Conversao).filter(
                models.Conversao.item_id == estoque_item.id,
                models.Conversao.medida_caseira == item_usado.medida
            ).first()

            if conversao:
                # Ex: 10 (colheres) * 0.015 (kg) = 0.150 kg
                qtd_a_descontar = item_usado.quantidade * conversao.peso_em_kg
            else:
                return {"erro": f"O sistema não sabe converter '{item_usado.medida}' para o ingrediente '{item_usado.nome}'. Cadastre no dicionário primeiro!"}

        # 4. Abater o valor exato no Estoque Oficial
        estoque_item.saldo_atual -= qtd_a_descontar
        itens_processados.append((estoque_item, item_usado))

    # 5. Guardar o registro histórico da refeição (para auditoria)
    novo_registro = models.Refeicao(
        id_usuario=lancamento.id_usuario,
        tipo_refeicao=lancamento.tipo_refeicao or "Lançamento manual",
        qtd_alunos=lancamento.qtd_alunos_atendidos,
    )
    db.add(novo_registro)
    db.flush()  # garante o id antes de gravar os itens

    for estoque_item, item_usado in itens_processados:
        db.add(models.RefeicaoItem(
            refeicao_id=novo_registro.id,
            item_id=estoque_item.id,
            quantidade_original=item_usado.quantidade,
            quantidade_ajustada=item_usado.quantidade,
            medida_caseira=item_usado.medida,
        ))

    db.commit()

    return {"mensagem": f"Refeição servida a {lancamento.qtd_alunos_atendidos} alunos! Estoque abatido com sucesso."}
