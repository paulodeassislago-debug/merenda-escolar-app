# Fase 3.4 — Dashboard admin (D1–D2 do TESTING.md; somente admin)


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
    assert len(dados["refeicoes_hoje"]) == 4

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

    # Entrega de hoje
    client.post(
        "/entregas",
        json={"itens": [{"item_id": item["id"], "quantidade": 10, "acao": "recebido"}]},
        headers=_auth(admin_token),
    )

    # Refeição de hoje (almoço, 200 alunos, 2 kg de arroz)
    client.post(
        "/refeicoes",
        json={
            "tipo_refeicao": "Almoço",
            "qtd_alunos": 200,
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
    assert almoco["alunos"] == 200

    # Alunos hoje
    assert dados["alunos_hoje"]["total"] == 200
    assert dados["alunos_hoje"]["por_tipo"] == {"Almoço": 200}


# D3 — Sem token → 401
def test_d3_sem_token(client):
    assert client.get("/admin/dashboard").status_code == 401


# D4 — Perfil errado (secretaria/cozinheira) → 403
def test_d4_perfil_errado(client, secretaria_user, secretaria_token, cozinheira_user, cozinheira_token):
    assert client.get("/admin/dashboard", headers=_auth(secretaria_token)).status_code == 403
    assert client.get("/admin/dashboard", headers=_auth(cozinheira_token)).status_code == 403
