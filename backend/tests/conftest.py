import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import models
from database import Base
from main import app, get_db

# Banco SQLite em memória, compartilhado entre conexões (StaticPool)
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture()
def db():
    """Sessão de banco em memória com schema limpo por teste."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def client(db):
    """TestClient com as dependências get_db apontando para o banco em memória."""
    def override_get_db():
        yield db

    # auth.py define seu próprio get_db (para evitar import circular) — sobrescrever ambos
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[auth.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _criar_usuario(db, nome: str, senha: str, perfil: str) -> models.Usuario:
    usuario = models.Usuario(
        nome=nome,
        senha_hash=auth.criar_hash_senha(senha),
        perfil=perfil,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@pytest.fixture()
def admin_user(db):
    """Seed de usuário admin padrão para os testes."""
    return _criar_usuario(db, "admin", "admin123", "admin")


@pytest.fixture()
def admin_token(admin_user):
    """Token JWT válido do usuário admin."""
    return auth.criar_token(admin_user.id, admin_user.perfil)


@pytest.fixture()
def cozinheira_user(db):
    return _criar_usuario(db, "cozinheira", "cozinheira123", "cozinheira")


@pytest.fixture()
def cozinheira_token(cozinheira_user):
    return auth.criar_token(cozinheira_user.id, cozinheira_user.perfil)


@pytest.fixture()
def secretaria_user(db):
    return _criar_usuario(db, "secretaria", "secretaria123", "secretaria")


@pytest.fixture()
def secretaria_token(secretaria_user):
    return auth.criar_token(secretaria_user.id, secretaria_user.perfil)
