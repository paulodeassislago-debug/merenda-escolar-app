from datetime import date

from pydantic import BaseModel, ConfigDict, Field


# --- Autenticação ---

class LoginRequest(BaseModel):
    nome: str
    senha: str


# --- Estoque (legado — compatibilidade com o frontend atual) ---

class IngredienteCreate(BaseModel):
    nome_ingrediente: str
    unidade_medida_oficial: str
    saldo_atual: float


# --- Usuários (Admin) ---

class UsuarioCreate(BaseModel):
    nome: str
    senha: str
    perfil: str


class UsuarioUpdate(BaseModel):
    nome: str | None = None
    senha: str | None = None
    perfil: str | None = None


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    perfil: str


# --- Itens / Estoque ---

class ItemCreate(BaseModel):
    nome: str
    unidade_oficial: str = Field(max_length=50)
    saldo_atual: float = 0.0
    unidade_interna: str | None = None
    fator_conversao: float | None = None
    limiar: float = Field(5.0, gt=0)


class ItemUpdate(BaseModel):
    nome: str | None = None
    unidade_oficial: str | None = None
    saldo_atual: float | None = None
    unidade_interna: str | None = None
    fator_conversao: float | None = None
    limiar: float | None = Field(default=None, gt=0)


class ItemResponse(BaseModel):
    id: int
    nome: str
    unidade_oficial: str
    saldo_atual: float
    unidade_interna: str
    fator_conversao: float
    limiar: float


# --- Conversões ---

class ConversaoCreate(BaseModel):
    item_id: int
    medida_caseira: str
    peso_em_kg: float


class ConversaoResponse(BaseModel):
    id: int
    item_id: int
    medida_caseira: str
    peso_em_kg: float


# --- Cardápio ---

class CardapioItemCreate(BaseModel):
    nome_refeicao: str
    tipo_refeicao: str


class CardapioItemUpdate(BaseModel):
    nome_refeicao: str | None = None
    tipo_refeicao: str | None = None


class CardapioItemResponse(BaseModel):
    id: int
    nome_refeicao: str
    tipo_refeicao: str


# --- Receitas ---

class ReceitaCreate(BaseModel):
    item_id: int
    quantidade: float
    medida_caseira: str


class ReceitaUpdate(BaseModel):
    quantidade: float | None = None
    medida_caseira: str | None = None


class ReceitaResponse(BaseModel):
    id: int
    cardapio_item_id: int
    item_id: int
    quantidade: float
    medida_caseira: str


# --- Planejamento Semanal ---

class PlanejamentoCreate(BaseModel):
    cardapio_item_id: int
    tipo_refeicao: str
    dia_semana: int
    data_inicio_vigencia: date


class PlanejamentoResponse(BaseModel):
    id: int
    cardapio_item_id: int
    tipo_refeicao: str
    dia_semana: int
    data_inicio_vigencia: date


# --- Entregas ---

class EntregaItemRequest(BaseModel):
    item_id: int
    quantidade: float
    acao: str  # "recebido" | "alterado" | "excluído"
    unidade: str | None = None
    fator_conversao: float | None = None
    justificativa: str | None = None


class EntregaCreate(BaseModel):
    origem: str  # "xml" | "manual" — validado no handler
    data_entrega: date  # obrigatória (D-05)
    fornecedor_id: int  # obrigatório (D-05)
    nota_numero: str | None = None
    observacoes: str | None = None
    itens: list[EntregaItemRequest] = Field(min_length=1)


# --- Fornecedores ---

class FornecedorCreate(BaseModel):
    nome: str
    cnpj: str | None = None


class FornecedorResponse(BaseModel):
    id: int
    nome: str
    cnpj: str | None


# --- Refeições (Fase 3 — com auditoria de ajustes) ---

class RefeicaoItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_id: int
    quantidade: float = Field(ge=0)
    medida_caseira: str
    justificativa: str | None = None


class RefeicaoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo_refeicao: str
    qtd_alunos: int = Field(gt=0)
    planejamento_id: int | None = None
    itens: list[RefeicaoItemRequest] = Field(min_length=1)
