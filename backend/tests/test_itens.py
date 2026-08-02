# Fase 2.2 — CRUD de itens/estoque (GET para todos os perfis; CRUD somente admin)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# 4.1 — POST /itens cria item → 200, dados conferem
def test_4_1_post_item(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={"nome": "Arroz Parboilizado", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"]
    assert dados["nome"] == "Arroz Parboilizado"
    assert dados["unidade_oficial"] == "KG"
    assert dados["saldo_atual"] == 50.0


# 4.2 — GET /itens lista inclui o item criado
def test_4_2_get_itens(client, admin_user, admin_token):
    client.post(
        "/itens",
        json={"nome": "Arroz Parboilizado", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    )
    resp = client.get("/itens", headers=_auth(admin_token))
    assert resp.status_code == 200
    nomes = [i["nome"] for i in resp.json()]
    assert "Arroz Parboilizado" in nomes


# 4.3 — PUT /itens/{id} atualiza → GET confirma alteração
def test_4_3_put_item(client, admin_user, admin_token):
    criado = client.post(
        "/itens",
        json={"nome": "Arroz Parboilizado", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    ).json()

    resp = client.put(
        f"/itens/{criado['id']}",
        json={"nome": "Arroz Branco", "saldo_atual": 45.5},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200

    lista = client.get("/itens", headers=_auth(admin_token)).json()
    alvo = next(i for i in lista if i["id"] == criado["id"])
    assert alvo["nome"] == "Arroz Branco"
    assert alvo["saldo_atual"] == 45.5


# 4.4 — DELETE /itens/{id} remove → GET confirma ausência
def test_4_4_delete_item(client, admin_user, admin_token):
    criado = client.post(
        "/itens",
        json={"nome": "Arroz Parboilizado", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    ).json()

    resp = client.delete(f"/itens/{criado['id']}", headers=_auth(admin_token))
    assert resp.status_code == 200

    lista = client.get("/itens", headers=_auth(admin_token)).json()
    assert all(i["id"] != criado["id"] for i in lista)


# 4.5 — Sem token → 401 em todas as rotas
def test_4_5_sem_token(client):
    assert client.get("/itens").status_code == 401
    assert client.post(
        "/itens",
        json={"nome": "X", "unidade_oficial": "KG", "saldo_atual": 0},
    ).status_code == 401
    assert client.put("/itens/1", json={"nome": "X"}).status_code == 401
    assert client.delete("/itens/1").status_code == 401


# 4.6 — Perfil errado (cozinheira/secretaria) → 403 nas mutações
def test_4_6_perfil_errado(client, cozinheira_user, cozinheira_token, secretaria_user, secretaria_token):
    assert client.post(
        "/itens",
        json={"nome": "X", "unidade_oficial": "KG", "saldo_atual": 0},
        headers=_auth(cozinheira_token),
    ).status_code == 403
    assert client.put(
        "/itens/1", json={"nome": "X"}, headers=_auth(secretaria_token)
    ).status_code == 403
    assert client.delete("/itens/1", headers=_auth(cozinheira_token)).status_code == 403


# 4.7 — GET /itens é aberto a todos os perfis autenticados
def test_4_7_get_itens_todos_perfis(
    client, admin_user, admin_token, cozinheira_user, cozinheira_token, secretaria_user, secretaria_token
):
    client.post(
        "/itens",
        json={"nome": "Arroz Parboilizado", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    )
    for token in (admin_token, secretaria_token, cozinheira_token):
        resp = client.get("/itens", headers=_auth(token))
        assert resp.status_code == 200
        assert any(i["nome"] == "Arroz Parboilizado" for i in resp.json())


# 4.8 — Nome duplicado → 409
def test_4_8_nome_duplicado(client, admin_user, admin_token):
    payload = {"nome": "Arroz", "unidade_oficial": "KG", "saldo_atual": 10.0}
    assert client.post("/itens", json=payload, headers=_auth(admin_token)).status_code == 200
    assert client.post("/itens", json=payload, headers=_auth(admin_token)).status_code == 409
