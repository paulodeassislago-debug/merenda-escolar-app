# Fase 2.2 — CRUD de itens/estoque (GET para todos os perfis; CRUD somente admin)
# Fase 5.7 — Unidades livres com conversão interna


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# 4.1 — POST /itens cria item → 200, dados conferem (inclui novos campos)
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
    assert dados["unidade_interna"] == "KG"
    assert dados["fator_conversao"] == 1.0


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


# --- 4.9 — Limiar individual de baixo estoque (Fase 8, D-01..D-04) ---

# 4.6 — POST /itens sem limiar → default 5.0 (IMP-01)
def test_4_6_limiar_default(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={"nome": "Arroz Default", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["limiar"] == 5.0


# 4.7 — POST /itens com limiar zero ou negativo → 400 (D-03)
def test_4_7_limiar_invalido_400(client, admin_user, admin_token):
    resp_zero = client.post(
        "/itens",
        json={"nome": "Item Limiar Zero", "unidade_oficial": "KG", "saldo_atual": 10.0, "limiar": 0},
        headers=_auth(admin_token),
    )
    assert resp_zero.status_code == 400
    assert "limiar" in resp_zero.json()["detail"].lower()

    resp_neg = client.post(
        "/itens",
        json={"nome": "Item Limiar Negativo", "unidade_oficial": "KG", "saldo_atual": 10.0, "limiar": -1},
        headers=_auth(admin_token),
    )
    assert resp_neg.status_code == 400
    assert "limiar" in resp_neg.json()["detail"].lower()


# 4.8 — PUT /itens/{id} atualiza limiar → GET confirma (D-04)
def test_4_8_limiar_atualizado(client, admin_user, admin_token):
    criado = client.post(
        "/itens",
        json={"nome": "Arroz Limiar", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    ).json()

    resp = client.put(
        f"/itens/{criado['id']}",
        json={"limiar": 2.5},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["limiar"] == 2.5

    lista = client.get("/itens", headers=_auth(admin_token)).json()
    alvo = next(i for i in lista if i["id"] == criado["id"])
    assert alvo["limiar"] == 2.5


# --- 5.7.1 — Unidades livres com conversão interna ---

# A9-1: Criar item com unidade livre + conversão
def test_criar_item_unidade_livre_com_conversao(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={
            "nome": "Ovos Brancos",
            "unidade_oficial": "Dúzia",
            "saldo_atual": 10.0,
            "unidade_interna": "KG",
            "fator_conversao": 0.96,
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["unidade_oficial"] == "Dúzia"
    assert dados["unidade_interna"] == "KG"
    assert dados["fator_conversao"] == 0.96


# A9-2: Criar item com unidade livre sem conversão → 400
def test_criar_item_unidade_livre_sem_conversao(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={"nome": "Macarrão", "unidade_oficial": "Pacote", "saldo_atual": 20.0},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400
    assert "fator_conversao" in resp.json()["detail"].lower() or "unidade_interna" in resp.json()["detail"].lower()


# A9-3: Criar item com unidade livre e unidade_interna inválida → 400
def test_criar_item_unidade_livre_interna_invalida(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={
            "nome": "Salgadinho",
            "unidade_oficial": "Caixa",
            "saldo_atual": 5.0,
            "unidade_interna": "Un",
            "fator_conversao": 3.0,
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400


# A9-4: Criar item com fator_conversao zero → 400
def test_criar_item_fator_conversao_zero(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={
            "nome": "Biscoito",
            "unidade_oficial": "Pacote",
            "saldo_atual": 10.0,
            "unidade_interna": "KG",
            "fator_conversao": 0,
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400


# A9-5: Criar item com fator_conversao negativo → 400
def test_criar_item_fator_conversao_negativo(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={
            "nome": "Biscoito Doce",
            "unidade_oficial": "Pacote",
            "saldo_atual": 10.0,
            "unidade_interna": "KG",
            "fator_conversao": -1,
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400


# A9-6: Criar item KG sem conversão (compatibilidade) → 200, defaults aplicados
def test_criar_item_kg_sem_conversao(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={"nome": "Feijão Carioca", "unidade_oficial": "KG", "saldo_atual": 100.0},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["unidade_oficial"] == "KG"
    assert dados["unidade_interna"] == "KG"
    assert dados["fator_conversao"] == 1.0


# A9-7: Criar item L sem conversão (compatibilidade) → 200
def test_criar_item_l_sem_conversao(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={"nome": "Óleo de Soja", "unidade_oficial": "L", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["unidade_interna"] == "KG"  # default
    assert dados["fator_conversao"] == 1.0


# A9-8: Criar item com unidade livre case-insensitive (funciona pois strip+upper normaliza)
def test_criar_item_unidade_livre_lowercase(client, admin_user, admin_token):
    resp = client.post(
        "/itens",
        json={
            "nome": "Cenoura",
            "unidade_oficial": "maço",
            "saldo_atual": 3.0,
            "unidade_interna": "KG",
            "fator_conversao": 0.3,
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["unidade_interna"] == "KG"
    assert dados["fator_conversao"] == 0.3


# A9-9: PUT atualiza unidade_oficial para livre com conversão → 200
def test_put_atualiza_unidade_livre(client, admin_user, admin_token):
    criado = client.post(
        "/itens",
        json={"nome": "Item KG", "unidade_oficial": "KG", "saldo_atual": 10.0},
        headers=_auth(admin_token),
    ).json()

    resp = client.put(
        f"/itens/{criado['id']}",
        json={
            "unidade_oficial": "Dúzia",
            "unidade_interna": "KG",
            "fator_conversao": 0.96,
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["unidade_oficial"] == "Dúzia"
    assert dados["unidade_interna"] == "KG"
    assert dados["fator_conversao"] == 0.96


# A9-10: PUT tenta unidade livre sem conversão → 400
def test_put_unidade_livre_sem_conversao(client, admin_user, admin_token):
    criado = client.post(
        "/itens",
        json={"nome": "Item KG 2", "unidade_oficial": "KG", "saldo_atual": 10.0},
        headers=_auth(admin_token),
    ).json()

    resp = client.put(
        f"/itens/{criado['id']}",
        json={"unidade_oficial": "Maço"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400
