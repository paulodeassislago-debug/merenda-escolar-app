"""Bootstrap do primeiro usuário admin em produção.

Uso (a partir de backend/, com DATABASE_URL apontando para o PostgreSQL):

    BOOTSTRAP_ADMIN_NAME=admin \
    BOOTSTRAP_ADMIN_PASSWORD='senha-forte' \
    venv/bin/python -m scripts.bootstrap_admin

Idempotente: se já existir um usuário com o nome informado, não altera nada.
A senha NUNCA é impressa nem persistida em texto puro (passlib/bcrypt).
"""

import os
import sys

from passlib.context import CryptContext
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal  # noqa: E402
from models import Usuario  # noqa: E402

_PWD = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _exigir_env(nome: str) -> str:
    valor = os.getenv(nome, "").strip()
    if not valor:
        raise SystemExit(f"ERRO: defina a variável de ambiente {nome} antes do bootstrap.")
    return valor


def bootstrap(db: Session, nome: str, senha: str) -> str:
    if len(senha) < 8:
        raise SystemExit("ERRO: a senha do admin deve ter pelo menos 8 caracteres.")
    existente = db.query(Usuario).filter(Usuario.nome == nome).first()
    if existente:
        return f"Usuário '{nome}' já existe — bootstrap ignorado (idempotente)."
    db.add(Usuario(nome=nome, senha_hash=_PWD.hash(senha), perfil="admin"))
    db.commit()
    return f"Admin '{nome}' criado com perfil admin."


if __name__ == "__main__":
    nome = _exigir_env("BOOTSTRAP_ADMIN_NAME")
    senha = _exigir_env("BOOTSTRAP_ADMIN_PASSWORD")
    db = SessionLocal()
    try:
        print(bootstrap(db, nome, senha))
    finally:
        db.close()
