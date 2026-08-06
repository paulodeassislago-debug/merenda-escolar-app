"""Ambiente Alembic: conecta ao banco de DATABASE_URL e usa os metadados
dos modelos como target. Roda a partir de backend/ (mesma regra do SQLite)."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

from config import DATABASE_URL
import models  # noqa: F401 — registra os modelos no metadata
from database import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _connect_args() -> dict:
    if DATABASE_URL.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(DATABASE_URL, connect_args=_connect_args())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
