# Fase 3.1 — Planejamento semanal (GET para todos; definir/remover admin+sec)
from datetime import date


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_prato(client, admin_token, nome="Músculo com Batata") -> dict:
    return client.post(
        "/cardapio",
        json={"nome_refeicao": nome, "tipo_refeicao": "Almoço"},
        headers=_auth(admin_token),
    ).json()


# 8.1 — POST /planejamento define prato para um slot → 200, dados conferem
def test_8_1_post_planejamento(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    resp = client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Almoço",
            "dia_semana": 0,
            "data_inicio_vigencia": "2026-07-27",
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"]
    assert dados["cardapio_item_id"] == prato["id"]
    assert dados["nome_refeicao"] == "Músculo com Batata"
    assert dados["dia_semana"] == 0
    assert dados["tipo_refeicao"] == "Almoço"


# 8.2 — GET /planejamento?data= inclui o planejamento criado
def test_8_2_get_planejamento(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Almoço",
            "dia_semana": 0,
            "data_inicio_vigencia": "2026-07-27",
        },
        headers=_auth(admin_token),
    )
    resp = client.get("/planejamento?data=2026-07-31", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    assert len(dados) == 1
    assert dados[0]["nome_refeicao"] == "Músculo com Batata"


# 8.3 — POST no mesmo slot + mesma vigência → substitui o prato (upsert)
def test_8_3_post_planejamento_upsert(client, admin_user, admin_token):
    prato1 = _criar_prato(client, admin_token, "Músculo com Batata")
    prato2 = _criar_prato(client, admin_token, "Frango Grelhado")
    payload = {
        "cardapio_item_id": prato1["id"],
        "tipo_refeicao": "Almoço",
        "dia_semana": 0,
        "data_inicio_vigencia": "2026-07-27",
    }
    client.post("/planejamento", json=payload, headers=_auth(admin_token))

    payload["cardapio_item_id"] = prato2["id"]
    resp = client.post("/planejamento", json=payload, headers=_auth(admin_token))
    assert resp.status_code == 200

    lista = client.get("/planejamento?data=2026-07-31", headers=_auth(admin_token)).json()
    almoco_segunda = [p for p in lista if p["dia_semana"] == 0 and p["tipo_refeicao"] == "Almoço"]
    assert len(almoco_segunda) == 1
    assert almoco_segunda[0]["nome_refeicao"] == "Frango Grelhado"


# 8.4 — DELETE /planejamento/{id} remove → GET confirma ausência
def test_8_4_delete_planejamento(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    criado = client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Almoço",
            "dia_semana": 0,
            "data_inicio_vigencia": "2026-07-27",
        },
        headers=_auth(admin_token),
    ).json()

    resp = client.delete(f"/planejamento/{criado['id']}", headers=_auth(admin_token))
    assert resp.status_code == 200

    lista = client.get("/planejamento?data=2026-07-31", headers=_auth(admin_token)).json()
    assert all(p["id"] != criado["id"] for p in lista)


# 8.5 — Sem token → 401 em todas as rotas
def test_8_5_sem_token(client):
    assert client.get("/planejamento?data=2026-07-31").status_code == 401
    assert client.post(
        "/planejamento",
        json={"cardapio_item_id": 1, "tipo_refeicao": "Almoço", "dia_semana": 0, "data_inicio_vigencia": "2026-07-27"},
    ).status_code == 401
    assert client.delete("/planejamento/1").status_code == 401


# 8.6 — Perfil errado: cozinheira pode CONSULTAR mas não definir/remover
def test_8_6_perfil_errado(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    prato = _criar_prato(client, admin_token)

    # Cozinheira: GET permitido (precisa ver o cardápio planejado)
    assert client.get("/planejamento?data=2026-07-31", headers=_auth(cozinheira_token)).status_code == 200

    # Cozinheira: mutações bloqueadas
    assert client.post(
        "/planejamento",
        json={"cardapio_item_id": prato["id"], "tipo_refeicao": "Almoço", "dia_semana": 0, "data_inicio_vigencia": "2026-07-27"},
        headers=_auth(cozinheira_token),
    ).status_code == 403
    assert client.delete("/planejamento/1", headers=_auth(cozinheira_token)).status_code == 403


# 8.7 — Prato inexistente → 404
def test_8_7_prato_inexistente(client, admin_user, admin_token):
    resp = client.post(
        "/planejamento",
        json={"cardapio_item_id": 9999, "tipo_refeicao": "Almoço", "dia_semana": 0, "data_inicio_vigencia": "2026-07-27"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 404


# 8.8 — dia_semana fora de 0-6 → 400
def test_8_8_dia_semana_invalido(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    resp = client.post(
        "/planejamento",
        json={"cardapio_item_id": prato["id"], "tipo_refeicao": "Almoço", "dia_semana": 7, "data_inicio_vigencia": "2026-07-27"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400


# 8.9 — Vigência: entrada futura não aparece em consulta de data anterior
def test_8_9_vigencia_futura_nao_aparece(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token)
    client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Almoço",
            "dia_semana": 0,
            "data_inicio_vigencia": "2026-08-03",
        },
        headers=_auth(admin_token),
    )
    # Consulta antes da vigência → slot vazio
    lista = client.get("/planejamento?data=2026-07-31", headers=_auth(admin_token)).json()
    assert lista == []
    # Consulta após a vigência → slot preenchido
    lista = client.get("/planejamento?data=2026-08-05", headers=_auth(admin_token)).json()
    assert len(lista) == 1
