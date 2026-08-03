# Fase 2.4 + 2.5 — CRUD de cardápio e receitas
# Cardápio: GET admin+sec; CRUD somente admin
# Receitas: GET para todos os perfis; CRUD somente admin
# Fase 5.7 — Tipo "Lanche" unificado


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_prato(client, admin_token) -> dict:
    return client.post(
        "/cardapio",
        json={"nome_refeicao": "Músculo com Batata", "tipo_refeicao": "Almoço"},
        headers=_auth(admin_token),
    ).json()


def _criar_item(client, admin_token, nome="Arroz Parboilizado") -> dict:
    return client.post(
        "/itens",
        json={"nome": nome, "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    ).json()


# =========================================================================
# CARDÁPIO
# =========================================================================

# 6.1 — POST /cardapio cria prato → 200, dados conferem
def test_6_1_post_cardapio(client, admin_user, admin_token):
    resp = client.post(
        "/cardapio",
        json={"nome_refeicao": "Músculo com Batata", "tipo_refeicao": "Almoço"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"]
    assert dados["nome_refeicao"] == "Músculo com Batata"
    assert dados["tipo_refeicao"] == "Almoço"


# 6.2 — GET /cardapio lista inclui o prato criado
def test_6_2_get_cardapio(client, admin_user, admin_token):
    _criar_prato(client, admin_token)
    resp = client.get("/cardapio", headers=_auth(admin_token))
    assert resp.status_code == 200
    nomes = [c["nome_refeicao"] for c in resp.json()]
    assert "Músculo com Batata" in nomes


# 6.3 — PUT /cardapio/{id} atualiza → GET confirma alteração
def test_6_3_put_cardapio(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)

    resp = client.put(
        f"/cardapio/{prato['id']}",
        json={"nome_refeicao": "Músculo ao Molho", "tipo_refeicao": "Janta"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200

    lista = client.get("/cardapio", headers=_auth(admin_token)).json()
    alvo = next(c for c in lista if c["id"] == prato["id"])
    assert alvo["nome_refeicao"] == "Músculo ao Molho"
    assert alvo["tipo_refeicao"] == "Janta"


# 6.4 — DELETE /cardapio/{id} remove → GET confirma ausência
def test_6_4_delete_cardapio(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)

    resp = client.delete(f"/cardapio/{prato['id']}", headers=_auth(admin_token))
    assert resp.status_code == 200

    lista = client.get("/cardapio", headers=_auth(admin_token)).json()
    assert all(c["id"] != prato["id"] for c in lista)


# 6.5 — Sem token → 401 em todas as rotas
def test_6_5_sem_token(client):
    assert client.get("/cardapio").status_code == 401
    assert client.post(
        "/cardapio",
        json={"nome_refeicao": "X", "tipo_refeicao": "Almoço"},
    ).status_code == 401
    assert client.put("/cardapio/1", json={"nome_refeicao": "X"}).status_code == 401
    assert client.delete("/cardapio/1").status_code == 401


# 6.6 — Perfil errado: cozinheira não acessa cardápio;
#         secretaria pode consultar (GET) mas não criar/editar/excluir
def test_6_6_perfil_errado(client, admin_user, admin_token, cozinheira_user, cozinheira_token, secretaria_user, secretaria_token):
    _criar_prato(client, admin_token)

    # Cozinheira: bloqueada em tudo
    assert client.get("/cardapio", headers=_auth(cozinheira_token)).status_code == 403
    assert client.post(
        "/cardapio",
        json={"nome_refeicao": "X", "tipo_refeicao": "Almoço"},
        headers=_auth(cozinheira_token),
    ).status_code == 403

    # Secretaria: GET permitido
    assert client.get("/cardapio", headers=_auth(secretaria_token)).status_code == 200
    # Secretaria: mutações bloqueadas
    assert client.post(
        "/cardapio",
        json={"nome_refeicao": "X", "tipo_refeicao": "Almoço"},
        headers=_auth(secretaria_token),
    ).status_code == 403
    assert client.put(
        "/cardapio/1", json={"nome_refeicao": "X"}, headers=_auth(secretaria_token)
    ).status_code == 403
    assert client.delete("/cardapio/1", headers=_auth(secretaria_token)).status_code == 403


# 6.7 — Tipo de refeição inválido → 400
def test_6_7_tipo_refeicao_invalido(client, admin_user, admin_token):
    resp = client.post(
        "/cardapio",
        json={"nome_refeicao": "X", "tipo_refeicao": "Ceia"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400


# B8-1 — POST /cardapio com tipo "Lanche" (unificado) → 200
def test_cardapio_tipo_lanche(client, admin_user, admin_token):
    resp = client.post(
        "/cardapio",
        json={"nome_refeicao": "Pão com Ovo", "tipo_refeicao": "Lanche"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["tipo_refeicao"] == "Lanche"


# B8-2 — Tipos antigos ("Lanche da Manhã", "Lanche da Tarde") são rejeitados → 400
def test_cardapio_tipo_antigo_rejeitado(client, admin_user, admin_token):
    resp = client.post(
        "/cardapio",
        json={"nome_refeicao": "Pão com Ovo", "tipo_refeicao": "Lanche da Manhã"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400

    resp = client.post(
        "/cardapio",
        json={"nome_refeicao": "Mingau", "tipo_refeicao": "Lanche da Tarde"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400


# =========================================================================
# RECEITAS
# =========================================================================

# 7.1 — GET /cardapio/{id}/receita retorna lista (vazia inicialmente) → 200
def test_7_1_get_receita_vazia(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    resp = client.get(f"/cardapio/{prato['id']}/receita", headers=_auth(admin_token))
    assert resp.status_code == 200
    assert resp.json() == []


# 7.2 — POST /cardapio/{id}/receita adiciona ingrediente → 200, dados conferem
def test_7_2_post_receita(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    item = _criar_item(client, admin_token)

    resp = client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 0.5, "medida_caseira": "xícara"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"]
    assert dados["cardapio_item_id"] == prato["id"]
    assert dados["item_id"] == item["id"]
    assert dados["quantidade"] == 0.5
    assert dados["medida_caseira"] == "xícara"

    # GET confirma que o ingrediente aparece na receita
    receita = client.get(f"/cardapio/{prato['id']}/receita", headers=_auth(admin_token)).json()
    assert len(receita) == 1
    assert receita[0]["item_nome"] == "Arroz Parboilizado"


# 7.3 — PUT /cardapio/{id}/receita/{receita_id} edita quantidade → GET confirma
def test_7_3_put_receita(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    item = _criar_item(client, admin_token)
    ingrediente = client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 0.5, "medida_caseira": "xícara"},
        headers=_auth(admin_token),
    ).json()

    resp = client.put(
        f"/cardapio/{prato['id']}/receita/{ingrediente['id']}",
        json={"quantidade": 0.75},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200

    receita = client.get(f"/cardapio/{prato['id']}/receita", headers=_auth(admin_token)).json()
    alvo = next(r for r in receita if r["id"] == ingrediente["id"])
    assert alvo["quantidade"] == 0.75
    assert alvo["medida_caseira"] == "xícara"


# 7.4 — DELETE /cardapio/{id}/receita/{receita_id} remove ingrediente → GET confirma
def test_7_4_delete_receita(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    item = _criar_item(client, admin_token)
    ingrediente = client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 0.5, "medida_caseira": "xícara"},
        headers=_auth(admin_token),
    ).json()

    resp = client.delete(
        f"/cardapio/{prato['id']}/receita/{ingrediente['id']}",
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200

    receita = client.get(f"/cardapio/{prato['id']}/receita", headers=_auth(admin_token)).json()
    assert all(r["id"] != ingrediente["id"] for r in receita)


# 7.5 — Sem token → 401 em todas as rotas de receita
def test_7_5_sem_token(client):
    assert client.get("/cardapio/1/receita").status_code == 401
    assert client.post(
        "/cardapio/1/receita",
        json={"item_id": 1, "quantidade": 1, "medida_caseira": "xícara"},
    ).status_code == 401
    assert client.put("/cardapio/1/receita/1", json={"quantidade": 1}).status_code == 401
    assert client.delete("/cardapio/1/receita/1").status_code == 401


# 7.6 — Perfil errado: cozinheira pode LER a receita (precisa para cozinhar)
#         mas não pode alterar; secretaria também só lê
def test_7_6_perfil_errado(client, admin_user, admin_token, cozinheira_user, cozinheira_token, secretaria_user, secretaria_token):
    prato = _criar_prato(client, admin_token)
    item = _criar_item(client, admin_token)

    # Cozinheira e secretaria: GET permitido
    assert client.get(f"/cardapio/{prato['id']}/receita", headers=_auth(cozinheira_token)).status_code == 200
    assert client.get(f"/cardapio/{prato['id']}/receita", headers=_auth(secretaria_token)).status_code == 200

    # Mutações bloqueadas para ambos
    payload = {"item_id": item["id"], "quantidade": 0.5, "medida_caseira": "xícara"}
    assert client.post(
        f"/cardapio/{prato['id']}/receita", json=payload, headers=_auth(cozinheira_token)
    ).status_code == 403
    assert client.post(
        f"/cardapio/{prato['id']}/receita", json=payload, headers=_auth(secretaria_token)
    ).status_code == 403
    assert client.put(
        f"/cardapio/{prato['id']}/receita/1", json={"quantidade": 1}, headers=_auth(cozinheira_token)
    ).status_code == 403
    assert client.delete(
        f"/cardapio/{prato['id']}/receita/1", headers=_auth(secretaria_token)
    ).status_code == 403


# 7.7 — Prato ou item inexistente → 404
def test_7_7_nao_encontrado(client, admin_user, admin_token):
    # Prato inexistente
    assert client.get("/cardapio/9999/receita", headers=_auth(admin_token)).status_code == 404

    # Item inexistente ao adicionar ingrediente
    prato = _criar_prato(client, admin_token)
    resp = client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": 9999, "quantidade": 0.5, "medida_caseira": "xícara"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 404