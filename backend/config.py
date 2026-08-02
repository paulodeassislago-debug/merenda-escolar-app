import os

from dotenv import load_dotenv

load_dotenv()

# Chave de assinatura dos tokens JWT. Em produção, definir SECRET_KEY no ambiente.
SECRET_KEY = os.getenv("SECRET_KEY", "chave-dev-trocar-em-producao")

# URL de conexão do banco. SQLite em dev; PostgreSQL em produção.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./merenda.db")

# Origens permitidas no CORS (separadas por vírgula).
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
