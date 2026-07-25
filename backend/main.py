from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

# Cria o banco e as tabelas automaticamente se não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema de Gestão da Cozinha Escolar - PNAE")

# --- CONFIGURAÇÃO DE CORS (Liberando o acesso para o Frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
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

# --- MODELOS PYDANTIC (Validação de Dados) ---

class IngredienteCreate(BaseModel):
    nome_ingrediente: str
    unidade_medida_oficial: str
    saldo_atual: float

class ConversaoCreate(BaseModel):
    nome_ingrediente: str
    medida_caseira: str
    peso_em_kg: float

class IngredienteUsado(BaseModel):
    nome: str
    quantidade: float
    medida: str

class LancamentoRefeicao(BaseModel):
    qtd_alunos_atendidos: int
    id_usuario: int
    ingredientes: list[IngredienteUsado]


# --- ROTAS DA API ---

@app.get("/")
def ler_raiz():
    return {"mensagem": "Olá, Gestão! A API da Cozinha Escolar está a funcionar!"}

# ROTA 1: Cadastrar um novo ingrediente no estoque
@app.post("/estoque")
def cadastrar_ingrediente(ingrediente: IngredienteCreate, db: Session = Depends(get_db)):
    novo_item = models.Estoque(
        nome_ingrediente=ingrediente.nome_ingrediente,
        unidade_medida_oficial=ingrediente.unidade_medida_oficial,
        saldo_atual=ingrediente.saldo_atual
    )
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    return {"mensagem": f"{novo_item.nome_ingrediente} cadastrado com sucesso!"}

# ROTA 2: Ver todo o estoque
@app.get("/estoque")
def listar_estoque(db: Session = Depends(get_db)):
    return db.query(models.Estoque).all()

# ROTA 3: Ensinar o sistema a converter medidas (Dicionário de Conversões)
@app.post("/conversoes")
def cadastrar_conversao(conv: ConversaoCreate, db: Session = Depends(get_db)):
    nova_conv = models.DicionarioConversoes(
        nome_ingrediente=conv.nome_ingrediente,
        medida_caseira=conv.medida_caseira,
        peso_em_kg=conv.peso_em_kg
    )
    db.add(nova_conv)
    db.commit()
    return {"mensagem": f"Conversão de {conv.medida_caseira} para {conv.nome_ingrediente} cadastrada com sucesso!"}

# ROTA 4: Lançar Refeição e Abater no Estoque Automaticamente
@app.post("/refeicoes/lancar")
def lancar_refeicao(lancamento: LancamentoRefeicao, db: Session = Depends(get_db)):
    
    # 1. Analisar cada ingrediente usado pela cozinheira
    for item in lancamento.ingredientes:
        qtd_a_descontar = item.quantidade
        
        # 2. Se a medida não for KG ou L (oficial), fazemos a conversão
        if item.medida.upper() not in ["KG", "L", "LITRO", "LITROS"]:
            conversao = db.query(models.DicionarioConversoes).filter(
                models.DicionarioConversoes.nome_ingrediente == item.nome,
                models.DicionarioConversoes.medida_caseira == item.medida
            ).first()
            
            if conversao:
                # Ex: 10 (colheres) * 0.015 (kg) = 0.150 kg
                qtd_a_descontar = item.quantidade * conversao.peso_em_kg
            else:
                return {"erro": f"O sistema não sabe converter '{item.medida}' para o ingrediente '{item.nome}'. Cadastre no dicionário primeiro!"}
        
        # 3. Abater o valor exato no Estoque Oficial
        estoque_item = db.query(models.Estoque).filter(models.Estoque.nome_ingrediente == item.nome).first()
        if estoque_item:
            estoque_item.saldo_atual -= qtd_a_descontar
        else:
            return {"erro": f"O ingrediente '{item.nome}' não foi encontrado no estoque!"}
    
    # 4. Guardar o registro histórico da refeição (para auditoria)
    novo_registro = models.RegistroRefeicoes(
        id_usuario=lancamento.id_usuario,
        qtd_alunos_atendidos=lancamento.qtd_alunos_atendidos,
        ingredientes_utilizados=[{"nome": i.nome, "quantidade": i.quantidade, "medida": i.medida} for i in lancamento.ingredientes]
    )
    db.add(novo_registro)
    db.commit()
    
    return {"mensagem": f"Refeição servida a {lancamento.qtd_alunos_atendidos} alunos! Estoque abatido com sucesso."}