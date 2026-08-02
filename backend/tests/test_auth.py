from datetime import datetime, timedelta, timezone

from jose import jwt as jose_jwt

import auth


# 2.1 — POST /auth/login com credenciais válidas → 200 + access_token
def test_2_1_login_credenciais_validas(client, admin_user):
    resp = client.post("/auth/login", json={"nome": "admin", "senha": "admin123"})
    assert resp.status_code == 200
    dados = resp.json()
    assert "access_token" in dados
    assert dados["access_token"]
    assert dados["perfil"] == "admin"


# 2.2 — POST /auth/login com senha errada → 401
def test_2_2_login_senha_errada(client, admin_user):
    resp = client.post("/auth/login", json={"nome": "admin", "senha": "senhaerrada"})
    assert resp.status_code == 401


# 2.2b — POST /auth/login com usuário inexistente → 401
def test_2_2b_login_usuario_inexistente(client):
    resp = client.post("/auth/login", json={"nome": "naoexiste", "senha": "qualquer"})
    assert resp.status_code == 401


# 2.3 — GET /auth/me com token válido → 200 + dados do usuário
def test_2_3_auth_me_token_valido(client, admin_user, admin_token):
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"] == admin_user.id
    assert dados["nome"] == "admin"
    assert dados["perfil"] == "admin"


# 2.4 — GET /auth/me sem token → 401
def test_2_4_auth_me_sem_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


# 2.5 — GET /auth/me com token inválido ou expirado → 401
def test_2_5_auth_me_token_invalido_ou_expirado(client, admin_user):
    # Token malformado
    resp = client.get("/auth/me", headers={"Authorization": "Bearer token-lixo"})
    assert resp.status_code == 401

    # Token expirado (assinatura válida, exp no passado)
    token_expirado = jose_jwt.encode(
        {
            "sub": str(admin_user.id),
            "perfil": admin_user.perfil,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        auth.SECRET_KEY,
        algorithm=auth.ALGORITHM,
    )
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token_expirado}"})
    assert resp.status_code == 401
