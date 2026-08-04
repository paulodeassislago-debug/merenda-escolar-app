# Fase 3.5 — Cardápio público (P1–P2 de .planning/codebase/TESTING.md; sem autenticação)
from datetime import date


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _seed_cardapio_do_dia(client, admin_token, data_ref: date):
    """Cria item, prato com receita e planejamento para o dia_semana de `data_ref`."""
    item = client.post(
        "/itens",
        json={"nome": "Arroz", "unidade_oficial": "KG", "saldo_atual": 50.0},
        headers=_auth(admin_token),
    ).json()
    prato = client.post(
        "/cardapio",
        json={"nome_refeicao": "Músculo com Batata", "tipo_refeicao": "Almoço"},
        headers=_auth(admin_token),
    ).json()
    client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Almoço",
            "dia_semana": data_ref.weekday(),
            "data_inicio_vigencia": data_ref.isoformat(),
        },
        headers=_auth(admin_token),
    )
    return prato


# P1 — GET /publico/cardapio?data=2026-07-31 sem token → 200 com o prato do dia
def test_p1_cardapio_publico_com_data(client, admin_user, admin_token):
    data_ref = date(2026, 7, 31)  # sexta-feira
    _seed_cardapio_do_dia(client, admin_token, data_ref)

    resp = client.get(f"/publico/cardapio?data={data_ref.isoformat()}")
    assert resp.status_code == 200
    dados = resp.json()
    assert len(dados) == 1
    assert dados[0]["tipo_refeicao"] == "Almoço"
    assert dados[0]["nome_refeicao"] == "Músculo com Batata"
    # Ingredientes da receita expostos com nome do item
    assert dados[0]["ingredientes"][0]["item_nome"] == "Arroz"
    assert dados[0]["ingredientes"][0]["quantidade"] == 2


# P2 — GET /publico/cardapio sem data → usa a data atual
def test_p2_cardapio_publico_sem_data(client, admin_user, admin_token):
    hoje = date.today()
    _seed_cardapio_do_dia(client, admin_token, hoje)

    resp = client.get("/publico/cardapio")
    assert resp.status_code == 200
    dados = resp.json()
    assert len(dados) == 1
    assert dados[0]["nome_refeicao"] == "Músculo com Batata"


# P3 — Dia sem planejamento → 200 com lista vazia (não erro)
def test_p3_dia_sem_planejamento(client, admin_user, admin_token):
    resp = client.get("/publico/cardapio?data=2020-01-06")
    assert resp.status_code == 200
    assert resp.json() == []
