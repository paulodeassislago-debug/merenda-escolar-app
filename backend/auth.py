from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
from config import SECRET_KEY
from database import SessionLocal

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 horas (um turno de trabalho)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


# --- SENHAS ---

def criar_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha, senha_hash)


# --- TOKENS JWT ---

def criar_token(usuario_id: int, perfil: str) -> str:
    payload = {
        "sub": str(usuario_id),
        "perfil": perfil,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict | None:
    """Retorna o payload do token ou None se inválido/expirado."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# --- DEPENDÊNCIAS FASTAPI ---

def get_db():
    # Mesma sessão de database.py, definida aqui para evitar import circular com main.py
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_usuario_atual(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> models.Usuario:
    """Extrai e valida o token do header `Authorization: Bearer <token>`."""
    credenciais_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token ausente, inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credenciais_exception

    payload = decodificar_token(credentials.credentials)
    if payload is None:
        raise credenciais_exception

    try:
        usuario_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise credenciais_exception

    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if usuario is None:
        raise credenciais_exception

    return usuario


def require_perfil(*perfis: str):
    """Dependência que exige um dos perfis informados. Retorna 403 caso contrário.

    Uso: `usuario = Depends(auth.require_perfil("admin", "secretaria"))`
    """

    def verificar(usuario: models.Usuario = Depends(get_usuario_atual)) -> models.Usuario:
        if usuario.perfil not in perfis:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Perfil '{usuario.perfil}' não tem permissão para este recurso",
            )
        return usuario

    return verificar
