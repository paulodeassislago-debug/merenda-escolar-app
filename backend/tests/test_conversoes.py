# Fase 2.3 — CRUD de conversões (GET admin+sec; criar/excluir somente admin)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_item(client, admin_token) -> dict:
    return client.post(
        "/itens",
        json={"nome": "Arroz Parboilizado", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    ).json()


# 5.1 — POST /conversoes cria conversão → 200, dados conferem
def test_5_1_post_conversao(client, admin_user, admin_token):
    item = _criar_item(client, admin_token)
    resp = client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "xícara", "peso_em_kg": 0.18},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"]
    assert dados["item_id"] == item["id"]
    assert dados["medida_caseira"] == "xícara"
    assert dados["peso_em_kg"] == 0.18


# 5.2 — GET /conversoes?item_id= lista inclui a conversão criada
def test_5_2_get_conversoes(client, admin_user, admin_token):
    item = _criar_item(client, admin_token)
    client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "xícara", "peso_em_kg": 0.18},
        headers=_auth(admin_token),
    )
    resp = client.get(f"/conversoes?item_id={item['id']}", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    assert len(dados) == 1
    assert dados[0]["medida_caseira"] == "xícara"


# 5.3 — DELETE /conversoes/{id} remove → GET confirma ausência
def test_5_3_delete_conversao(client, admin_user, admin_token):
    item = _criar_item(client, admin_token)
    criada = client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "xícara", "peso_em_kg": 0.18},
        headers=_auth(admin_token),
    ).json()

    resp = client.delete(f"/conversoes/{criada['id']}", headers=_auth(admin_token))
    assert resp.status_code == 200

    lista = client.get(f"/conversoes?item_id={item['id']}", headers=_auth(admin_token)).json()
    assert all(c["id"] != criada["id"] for c in lista)


# 5.4 — Sem token → 401 em todas as rotas
def test_5_4_sem_token(client):
    assert client.get("/conversoes?item_id=1").status_code == 401
    assert client.post(
        "/conversoes",
        json={"item_id": 1, "medida_caseira": "xícara", "peso_em_kg": 0.18},
    ).status_code == 401
    assert client.delete("/conversoes/1").status_code == 401


# 5.5 — Cozinheira pode consultar (GET), mas não criar/excluir;
#         secretaria também pode consultar (GET), mas não criar/excluir
def test_5_5_perfil_errado(client, admin_user, admin_token, cozinheira_user, cozinheira_token, secretaria_user, secretaria_token):
    item = _criar_item(client, admin_token)

    criada = client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "xícara", "peso_em_kg": 0.18},
        headers=_auth(admin_token),
    ).json()

    # Cozinheira: leitura permitida, mutações bloqueadas
    assert client.get(f"/conversoes?item_id={item['id']}", headers=_auth(cozinheira_token)).status_code == 200
    assert client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "xícara", "peso_em_kg": 0.18},
        headers=_auth(cozinheira_token),
    ).status_code == 403
    assert client.delete(f"/conversoes/{criada['id']}", headers=_auth(cozinheira_token)).status_code == 403

    # Secretaria: GET permitido
    assert client.get(f"/conversoes?item_id={item['id']}", headers=_auth(secretaria_token)).status_code == 200
    # Secretaria: mutações bloqueadas
    assert client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "colher", "peso_em_kg": 0.02},
        headers=_auth(secretaria_token),
    ).status_code == 403
    assert client.delete("/conversoes/1", headers=_auth(secretaria_token)).status_code == 403


# 5.6 — Item inexistente → 404
def test_5_6_item_inexistente(client, admin_user, admin_token):
    resp = client.post(
        "/conversoes",
        json={"item_id": 9999, "medida_caseira": "xícara", "peso_em_kg": 0.18},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 404


# 5.7 — Conversão duplicada (mesmo item + medida) → 409
def test_5_7_conversao_duplicada(client, admin_user, admin_token):
    item = _criar_item(client, admin_token)
    payload = {"item_id": item["id"], "medida_caseira": "xícara", "peso_em_kg": 0.18}
    assert client.post("/conversoes", json=payload, headers=_auth(admin_token)).status_code == 200
    assert client.post("/conversoes", json=payload, headers=_auth(admin_token)).status_code == 409
