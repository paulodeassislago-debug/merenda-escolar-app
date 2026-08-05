import datetime

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, nullable=False, index=True)
    senha_hash = Column(String, nullable=False)
    perfil = Column(String, nullable=False)

    __table_args__ = (
        CheckConstraint(
            perfil.in_(["admin", "secretaria", "cozinheira"]),
            name="ck_usuarios_perfil",
        ),
    )


class Item(Base):
    __tablename__ = "itens"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, nullable=False, index=True)
    unidade_oficial = Column(String, nullable=False)
    saldo_atual = Column(Float, default=0.0)
    unidade_interna = Column(String, default="KG")
    fator_conversao = Column(Float, default=1.0)
    limiar = Column(Float, nullable=False, default=5.0)


class Fornecedor(Base):
    __tablename__ = "fornecedores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    cnpj = Column(String, nullable=True)


class AlunosPorPeriodo(Base):
    __tablename__ = "alunos_por_periodo"

    periodo = Column(String, primary_key=True)
    qtd = Column(Integer, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.now)
    updated_by = Column(Integer, ForeignKey("usuarios.id"))


class Conversao(Base):
    __tablename__ = "conversoes"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    medida_caseira = Column(String, nullable=False)
    peso_em_kg = Column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("item_id", "medida_caseira", name="uq_conversoes_item_medida"),
    )


class CardapioItem(Base):
    __tablename__ = "cardapio_itens"

    id = Column(Integer, primary_key=True, index=True)
    nome_refeicao = Column(String, nullable=False)
    tipo_refeicao = Column(String, nullable=False)

    __table_args__ = (
        CheckConstraint(
            tipo_refeicao.in_(
                ["Lanche", "Almoço", "Janta"]
            ),
            name="ck_cardapio_tipo_refeicao",
        ),
    )


class Receita(Base):
    __tablename__ = "receitas"

    id = Column(Integer, primary_key=True, index=True)
    cardapio_item_id = Column(Integer, ForeignKey("cardapio_itens.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    quantidade = Column(Float, nullable=False)
    medida_caseira = Column(String, nullable=False)


class Planejamento(Base):
    __tablename__ = "planejamento"

    id = Column(Integer, primary_key=True, index=True)
    cardapio_item_id = Column(Integer, ForeignKey("cardapio_itens.id"), nullable=False)
    tipo_refeicao = Column(String, nullable=False)
    dia_semana = Column(Integer, nullable=False)
    data_inicio_vigencia = Column(Date, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "dia_semana BETWEEN 0 AND 6",
            name="ck_planejamento_dia_semana",
        ),
    )


class Entrega(Base):
    __tablename__ = "entregas"

    id = Column(Integer, primary_key=True, index=True)
    data_hora = Column(
        DateTime, default=datetime.datetime.now, nullable=False
    )
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    origem = Column(String, nullable=False, default="manual")
    data_entrega = Column(Date, nullable=True)
    fornecedor_id = Column(Integer, ForeignKey("fornecedores.id"), nullable=True)
    nota_numero = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)


class ItemEntrega(Base):
    __tablename__ = "itens_entrega"

    id = Column(Integer, primary_key=True, index=True)
    entrega_id = Column(Integer, ForeignKey("entregas.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    quantidade = Column(Float, nullable=False)
    unidade = Column(String, nullable=True)
    fator_conversao = Column(Float, nullable=True)
    justificativa = Column(Text)
    acao = Column(String, nullable=False)

    __table_args__ = (
        CheckConstraint(
            acao.in_(["recebido", "alterado", "excluído"]),
            name="ck_itens_entrega_acao",
        ),
    )


class Refeicao(Base):
    __tablename__ = "refeicoes"

    id = Column(Integer, primary_key=True, index=True)
    data_hora = Column(
        DateTime, default=datetime.datetime.now, nullable=False
    )
    tipo_refeicao = Column(String, nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    qtd_alunos = Column(Integer, nullable=False)
    planejamento_id = Column(Integer, ForeignKey("planejamento.id"))


class RefeicaoItem(Base):
    __tablename__ = "refeicao_itens"

    id = Column(Integer, primary_key=True, index=True)
    refeicao_id = Column(Integer, ForeignKey("refeicoes.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    quantidade_original = Column(Float, nullable=False)
    quantidade_ajustada = Column(Float, nullable=False)
    medida_caseira = Column(String, nullable=False)
    justificativa = Column(Text)
