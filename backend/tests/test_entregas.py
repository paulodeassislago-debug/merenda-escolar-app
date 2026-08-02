# Fase 3.2 — Entregas (E1–E5 do TESTING.md; somente admin+secretaria)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_item(client, admin_token, nome, saldo=10.0) -> dict:
    return client.post(
        "/itens",
        json={"nome": nome, "unidade_oficial": "KG", "saldo_atual": saldo},
        headers=_auth(admin_token),
    ).json()


def _saldo(client, admin_token, item_id) -> float:
    itens = client.get("/itens", headers=_auth(admin_token)).json()
    return next(i["saldo_atual"] for i in itens if i["id"] == item_id)


# E1 — Criar entrega com 3 itens → itens_entrega gravados com ações corretas
def test_e1_criar_entrega_3_itens(client, admin_user, admin_token, secretaria_user, secretaria_token):
    item1 = _criar_item(client, admin_token, "Arroz")
    item2 = _criar_item(client, admin_token, "Feijão")
    item3 = _criar_item(client, admin_token, "Óleo")

    resp = client.post(
        "/entregas",
        json={"itens": [
            {"item_id": item1["id"], "quantidade": 10, "acao": "recebido"},
            {"item_id": item2["id"], "quantidade": 8, "acao": "alterado", "justificativa": "Faltou no fornecedor"},
            {"item_id": item3["id"], "quantidade": 0, "acao": "excluído", "justificativa": "Produto vencido"},
        ]},
        headers=_auth(secretaria_token),
    )
    assert resp.status_code == 200
    entrega_id = resp.json()["id"]

    detalhe = client.get(f"/entregas/{entrega_id}", headers=_auth(secretaria_token)).json()
    assert len(detalhe["itens"]) == 3
    acoes = {ie["item_id"]: ie["acao"] for ie in detalhe["itens"]}
    assert acoes[item1["id"]] == "recebido"
    assert acoes[item2["id"]] == "alterado"
    assert acoes[item3["id"]] == "excluído"


# E2 — Item recebido → saldo_atual incrementado corretamente
def test_e2_recebido_incrementa_saldo(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)

    resp = client.post(
        "/entregas",
        json={"itens": [{"item_id": item["id"], "quantidade": 5, "acao": "recebido"}]},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 15.0


# E3 — Item alterado → justificativa gravada, saldo atualizado com a quantidade alterada
def test_e3_alterado_justificativa_saldo(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Feijão", saldo=10.0)

    resp = client.post(
        "/entregas",
        json={"itens": [
            {"item_id": item["id"], "quantidade": 3, "acao": "alterado", "justificativa": "Veio menos que o pedido"},
        ]},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 13.0

    detalhe = client.get(f"/entregas/{resp.json()['id']}", headers=_auth(admin_token)).json()
    assert detalhe["itens"][0]["justificativa"] == "Veio menos que o pedido"


# E4 — Item excluído → justificativa gravada, saldo inalterado
def test_e4_excluido_justificativa_saldo_inalterado(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Óleo", saldo=10.0)

    resp = client.post(
        "/entregas",
        json={"itens": [
            {"item_id": item["id"], "quantidade": 0, "acao": "excluído", "justificativa": "Produto vencido"},
        ]},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 10.0

    detalhe = client.get(f"/entregas/{resp.json()['id']}", headers=_auth(admin_token)).json()
    assert detalhe["itens"][0]["justificativa"] == "Produto vencido"


# E5 — Criar entrega sem itens → erro 422
def test_e5_entrega_sem_itens(client, admin_user, admin_token):
    resp = client.post("/entregas", json={"itens": []}, headers=_auth(admin_token))
    assert resp.status_code == 422


# E6 — Sem token → 401 em todas as rotas
def test_e6_sem_token(client):
    assert client.get("/entregas").status_code == 401
    assert client.get("/entregas/1").status_code == 401
    assert client.post(
        "/entregas",
        json={"itens": [{"item_id": 1, "quantidade": 1, "acao": "recebido"}]},
    ).status_code == 401


# E7 — Perfil errado (cozinheira) → 403 em todas as rotas
def test_e7_perfil_errado(client, cozinheira_user, cozinheira_token):
    assert client.get("/entregas", headers=_auth(cozinheira_token)).status_code == 403
    assert client.get("/entregas/1", headers=_auth(cozinheira_token)).status_code == 403
    assert client.post(
        "/entregas",
        json={"itens": [{"item_id": 1, "quantidade": 1, "acao": "recebido"}]},
        headers=_auth(cozinheira_token),
    ).status_code == 403


# E8 — Ação alterado/excluído sem justificativa → 400 (regra de auditoria)
def test_e8_acao_sem_justificativa(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz")

    resp = client.post(
        "/entregas",
        json={"itens": [{"item_id": item["id"], "quantidade": 3, "acao": "alterado"}]},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400

    resp = client.post(
        "/entregas",
        json={"itens": [{"item_id": item["id"], "quantidade": 0, "acao": "excluído"}]},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400
    # Saldo deve permanecer inalterado (nada foi gravado)
    assert _saldo(client, admin_token, item["id"]) == 10.0


# E9 — GET /entregas?data= filtra pelo dia
def test_e9_filtro_por_data(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz")
    client.post(
        "/entregas",
        json={"itens": [{"item_id": item["id"], "quantidade": 5, "acao": "recebido"}]},
        headers=_auth(admin_token),
    )
    # Data de hoje → inclui
    from datetime import date
    hoje = date.today().isoformat()
    lista = client.get(f"/entregas?data={hoje}", headers=_auth(admin_token)).json()
    assert len(lista) == 1
    # Data passada → vazia
    lista = client.get("/entregas?data=2020-01-01", headers=_auth(admin_token)).json()
    assert lista == []
