from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from database import Base
import datetime

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True)
    senha_hash = Column(String)
    perfil = Column(String) # "admin" ou "cozinheira"

class Estoque(Base):
    __tablename__ = "estoque"
    id_ingrediente = Column(Integer, primary_key=True, index=True)
    nome_ingrediente = Column(String, unique=True, index=True)
    unidade_medida_oficial = Column(String) # "KG" ou "L"
    saldo_atual = Column(Float, default=0.0)

class CardapioBase(Base):
    __tablename__ = "cardapio_base"
    id_prato = Column(Integer, primary_key=True, index=True)
    nome_refeicao = Column(String)
    ingredientes_padrao = Column(JSON) 

class DicionarioConversoes(Base):
    __tablename__ = "dicionario_conversoes"
    id = Column(Integer, primary_key=True, index=True)
    nome_ingrediente = Column(String)
    medida_caseira = Column(String)
    peso_em_kg = Column(Float) 

class RegistroRefeicoes(Base):
    __tablename__ = "registro_refeicoes"
    id_registro = Column(Integer, primary_key=True, index=True)
    data_hora = Column(DateTime, default=datetime.datetime.utcnow)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"))
    qtd_alunos_atendidos = Column(Integer)
    ingredientes_utilizados = Column(JSON)
