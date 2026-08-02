# Fase 2.1 — CRUD de usuários (somente admin)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# 3.1 — POST /usuarios cria usuário → 200, dados conferem
def test_3_1_post_usuario(client, admin_user, admin_token):
    resp = client.post(
        "/usuarios",
        json={"nome": "maria", "senha": "maria123", "perfil": "cozinheira"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"]
    assert dados["nome"] == "maria"
    assert dados["perfil"] == "cozinheira"
    # senha nunca deve aparecer na resposta
    assert "senha" not in dados
    assert "senha_hash" not in dados


# 3.2 — GET /usuarios lista inclui o usuário criado
def test_3_2_get_usuarios(client, admin_user, admin_token):
    client.post(
        "/usuarios",
        json={"nome": "maria", "senha": "maria123", "perfil": "cozinheira"},
        headers=_auth(admin_token),
    )
    resp = client.get("/usuarios", headers=_auth(admin_token))
    assert resp.status_code == 200
    nomes = [u["nome"] for u in resp.json()]
    assert "admin" in nomes
    assert "maria" in nomes


# 3.3 — PUT /usuarios/{id} atualiza → GET confirma alteração
def test_3_3_put_usuario(client, admin_user, admin_token):
    criado = client.post(
        "/usuarios",
        json={"nome": "maria", "senha": "maria123", "perfil": "cozinheira"},
        headers=_auth(admin_token),
    ).json()

    resp = client.put(
        f"/usuarios/{criado['id']}",
        json={"nome": "maria-silva", "perfil": "secretaria"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200

    lista = client.get("/usuarios", headers=_auth(admin_token)).json()
    alvo = next(u for u in lista if u["id"] == criado["id"])
    assert alvo["nome"] == "maria-silva"
    assert alvo["perfil"] == "secretaria"


# 3.4 — DELETE /usuarios/{id} remove → GET confirma ausência
def test_3_4_delete_usuario(client, admin_user, admin_token):
    criado = client.post(
        "/usuarios",
        json={"nome": "maria", "senha": "maria123", "perfil": "cozinheira"},
        headers=_auth(admin_token),
    ).json()

    resp = client.delete(f"/usuarios/{criado['id']}", headers=_auth(admin_token))
    assert resp.status_code == 200

    lista = client.get("/usuarios", headers=_auth(admin_token)).json()
    assert all(u["id"] != criado["id"] for u in lista)


# 3.5 — Sem token → 401 em todas as rotas
def test_3_5_sem_token(client):
    assert client.get("/usuarios").status_code == 401
    assert client.post(
        "/usuarios",
        json={"nome": "x", "senha": "x", "perfil": "admin"},
    ).status_code == 401
    assert client.put("/usuarios/1", json={"nome": "x"}).status_code == 401
    assert client.delete("/usuarios/1").status_code == 401


# 3.6 — Perfil errado (cozinheira/secretaria) → 403
def test_3_6_perfil_errado(client, cozinheira_user, cozinheira_token, secretaria_user, secretaria_token):
    assert client.get("/usuarios", headers=_auth(cozinheira_token)).status_code == 403
    assert client.get("/usuarios", headers=_auth(secretaria_token)).status_code == 403
    assert client.post(
        "/usuarios",
        json={"nome": "x", "senha": "x", "perfil": "admin"},
        headers=_auth(secretaria_token),
    ).status_code == 403
    assert client.delete("/usuarios/1", headers=_auth(cozinheira_token)).status_code == 403


# 3.7 — Nome duplicado → 409
def test_3_7_nome_duplicado(client, admin_user, admin_token):
    payload = {"nome": "maria", "senha": "maria123", "perfil": "cozinheira"}
    assert client.post("/usuarios", json=payload, headers=_auth(admin_token)).status_code == 200
    assert client.post("/usuarios", json=payload, headers=_auth(admin_token)).status_code == 409
