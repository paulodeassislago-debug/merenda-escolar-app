# Fase 3.4 — Dashboard admin (D1–D2 de .planning/codebase/TESTING.md; somente admin)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# D1 — GET /admin/dashboard → 4 seções presentes (valores podem ser zero)
def test_d1_secoes_presentes(client, admin_user, admin_token):
    resp = client.get("/admin/dashboard", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()

    assert "estoque" in dados
    assert "total_itens" in dados["estoque"]
    assert "baixo_estoque" in dados["estoque"]
    assert "itens_criticos" in dados["estoque"]

    assert "refeicoes_hoje" in dados
    assert len(dados["refeicoes_hoje"]) == 3

    assert "entregas" in dados
    assert "ultimos_7_dias" in dados["entregas"]
    assert "ultimos_30_dias" in dados["entregas"]
    assert "ultima_data" in dados["entregas"]

    assert "alunos_hoje" in dados
    assert "total" in dados["alunos_hoje"]
    assert "por_tipo" in dados["alunos_hoje"]


# D2 — Após criar entrega + refeição → métricas atualizadas
def test_d2_metricas_atualizadas(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    # Setup: item com estoque alto (não crítico)
    item = client.post(
        "/itens",
        json={"nome": "Arroz", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    ).json()
    # Item crítico (saldo abaixo do limiar)
    client.post(
        "/itens",
        json={"nome": "Sal", "unidade_oficial": "KG", "saldo_atual": 1.0},
        headers=_auth(admin_token),
    )

    # Fornecedor e entrega de hoje
    fornecedor = client.post(
        "/fornecedores",
        json={"nome": "Fornecedor Teste"},
        headers=_auth(admin_token),
    ).json()
    client.post(
        "/entregas",
        json={
            "origem": "xml",
            "data_entrega": "2026-08-05",
            "fornecedor_id": fornecedor["id"],
            "nota_numero": "NF-TESTE",  # D-07: origem xml exige nota
            "itens": [{"item_id": item["id"], "quantidade": 10, "acao": "recebido"}],
        },
        headers=_auth(admin_token),
    )

    # Config de alunos por período (08-07): Almoço = manha + tarde = 180
    resp = client.put(
        "/alunos-por-periodo",
        json={"manha": 100, "tarde": 80, "noite": 40},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200

    # Refeição de hoje (almoço, 2 kg de arroz; alunos derivados do slot)
    client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )

    dados = client.get("/admin/dashboard", headers=_auth(admin_token)).json()

    # Estoque: 2 itens; Sal está crítico; arroz não (50 + 10 - 2 = 58)
    assert dados["estoque"]["total_itens"] == 2
    assert dados["estoque"]["baixo_estoque"] == 1
    assert dados["estoque"]["itens_criticos"][0]["nome"] == "Sal"

    # Entregas: 1 entrega hoje conta nos dois períodos
    assert dados["entregas"]["ultimos_7_dias"] == 1
    assert dados["entregas"]["ultimos_30_dias"] == 1
    assert dados["entregas"]["ultima_data"] is not None

    # Refeições hoje: almoço confirmado, demais pendentes
    almoco = next(r for r in dados["refeicoes_hoje"] if r["tipo_refeicao"] == "Almoço")
    assert almoco["status"] == "confirmado"
    assert almoco["alunos"] == 180

    # Alunos hoje (derivados da config: manha + tarde = 180)
    assert dados["alunos_hoje"]["total"] == 180
    assert dados["alunos_hoje"]["por_tipo"] == {"Almoço": 180}


# D3 — Sem token → 401
def test_d3_sem_token(client):
    assert client.get("/admin/dashboard").status_code == 401


# D4 — Perfil errado (secretaria/cozinheira) → 403
def test_d4_perfil_errado(client, secretaria_user, secretaria_token, cozinheira_user, cozinheira_token):
    assert client.get("/admin/dashboard", headers=_auth(secretaria_token)).status_code == 403
    assert client.get("/admin/dashboard", headers=_auth(cozinheira_token)).status_code == 403


# D5 — Item com limiar individual alto → crítico mesmo com saldo > 5.0 (D-02/D-04)
def test_d5_limiar_individual_critico(client, admin_user, admin_token):
    client.post(
        "/itens",
        json={"nome": "Frango", "unidade_oficial": "KG", "saldo_atual": 50.0, "limiar": 100},
        headers=_auth(admin_token),
    )

    dados = client.get("/admin/dashboard", headers=_auth(admin_token)).json()
    assert dados["estoque"]["baixo_estoque"] == 1
    critico = dados["estoque"]["itens_criticos"][0]
    assert critico["nome"] == "Frango"
    assert critico["limiar"] == 100


# D6 — Item com limiar individual baixo → NÃO crítico com saldo 2 (unidade de exibição)
def test_d6_limiar_individual_estavel(client, admin_user, admin_token):
    client.post(
        "/itens",
        json={"nome": "Sal Marinho", "unidade_oficial": "KG", "saldo_atual": 2.0, "limiar": 0.5},
        headers=_auth(admin_token),
    )

    dados = client.get("/admin/dashboard", headers=_auth(admin_token)).json()
    assert dados["estoque"]["baixo_estoque"] == 0
    assert all(c["nome"] != "Sal Marinho" for c in dados["estoque"]["itens_criticos"])
