# Fase 3.1 — Planejamento semanal (GET para todos; definir/remover admin+sec)
# Fase 5.7 — SLOTS_PLANEJAMENTO com 4 colunas
from datetime import date


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_prato(client, admin_token, nome="Músculo com Batata", tipo="Almoço") -> dict:
    return client.post(
        "/cardapio",
        json={"nome_refeicao": nome, "tipo_refeicao": tipo},
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


# B9-1 — POST /planejamento com prato tipo "Lanche" no slot "Lanche da Manhã" → 200
def test_planejamento_lanche_slot_manha(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token, "Pão com Ovo", tipo="Lanche")
    resp = client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Lanche da Manhã",
            "dia_semana": 0,
            "data_inicio_vigencia": "2026-07-27",
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["tipo_refeicao"] == "Lanche da Manhã"


# B9-2 — POST /planejamento com prato tipo "Lanche" no slot "Lanche da Tarde" → 200
def test_planejamento_lanche_slot_tarde(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token, "Mingau de Fubá", tipo="Lanche")
    resp = client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Lanche da Tarde",
            "dia_semana": 0,
            "data_inicio_vigencia": "2026-07-27",
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["tipo_refeicao"] == "Lanche da Tarde"


# B9-3 — Slot inválido (fora de SLOTS_PLANEJAMENTO) → 400
def test_planejamento_slot_invalido(client, admin_user, admin_token):
    prato = _criar_prato(client, admin_token, "Músculo com Batata")
    resp = client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Café da Manhã",
            "dia_semana": 0,
            "data_inicio_vigencia": "2026-07-27",
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400


# =========================================================================
# 08-07 — Projeção cumulativa (D-17/D-18/D-20) e avisos não-bloqueantes
# =========================================================================

def _criar_item(client, admin_token, nome, saldo=10.0) -> dict:
    return client.post(
        "/itens",
        json={"nome": nome, "unidade_oficial": "KG", "saldo_atual": saldo},
        headers=_auth(admin_token),
    ).json()


def _configurar_alunos(client, admin_token) -> None:
    """Config padrão da suíte: 100/80/40 → Almoço = 180 (manha + tarde)."""
    resp = client.put(
        "/alunos-por-periodo",
        json={"manha": 100, "tarde": 80, "noite": 40},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200


def _planejar_almoco_semana(client, admin_token, prato, dias, vigencia="2026-07-27"):
    for dia in dias:
        resp = client.post(
            "/planejamento",
            json={
                "cardapio_item_id": prato["id"],
                "tipo_refeicao": "Almoço",
                "dia_semana": dia,
                "data_inicio_vigencia": vigencia,
            },
            headers=_auth(admin_token),
        )
        assert resp.status_code == 200


# P1 — Sem config de alunos → 200 com configurado:false e tudo zerado (D-19)
def test_p1_projecao_config_ausente(client, admin_user, admin_token):
    resp = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["configurado"] is False
    assert dados["dias"] == []
    assert dados["itens"] == []
    assert dados["resumo"] == {"itens_com_ruptura": 0, "itens_nao_avaliaveis": 0}


# P2 — Sem ruptura: consumo derivado do slot (180 alunos × 1 kg por Almoço)
def test_p2_projecao_sem_ruptura(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=1000.0)
    _configurar_alunos(client, admin_token)
    prato = _criar_prato(client, admin_token)
    client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 1, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    # Almoço de segunda a sexta (dias 0..4)
    _planejar_almoco_semana(client, admin_token, prato, list(range(5)))

    resp = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["configurado"] is True
    item_proj = next(i for i in dados["itens"] if i["item_id"] == item["id"])
    # 180 alunos × 1 kg × 5 dias = 900 kg consumidos; saldo 1000 → projetado 100
    assert item_proj["consumo_semana"] == 900
    assert item_proj["saldo_projetado"] == 100
    assert item_proj["primeiro_dia_ruptura"] is None
    assert item_proj["avaliavel"] is True
    assert dados["resumo"]["itens_com_ruptura"] == 0


# P3 — Ruptura no primeiro dia: consumo diário (360 kg) > saldo (100 kg)
def test_p3_projecao_ruptura_primeiro_dia(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=100.0)
    _configurar_alunos(client, admin_token)
    prato = _criar_prato(client, admin_token)
    client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    _planejar_almoco_semana(client, admin_token, prato, list(range(7)))

    resp = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    item_proj = next(i for i in dados["itens"] if i["item_id"] == item["id"])
    assert item_proj["primeiro_dia_ruptura"] == 0
    # 2 kg × 180 alunos = 360 kg no dia 0 → saldo -260 → faltando 260
    dia0 = dados["dias"][0]
    assert dia0["dia_semana"] == 0
    # Contrato por slot (obs #5): a ruptura aparece no slot Almoço do dia 0
    assert "consumo" not in dia0 and "rupturas" not in dia0
    slot_almoco = next(s for s in dia0["slots"] if s["slot"] == "Almoço")
    ruptura = slot_almoco["rupturas"][0]
    assert ruptura["item_id"] == item["id"]
    assert ruptura["nome"] == "Arroz"
    assert ruptura["faltando"] == 260
    assert ruptura["unidade_oficial"] == "KG"
    # Demais slots do dia não registram o item
    assert all(
        all(r["item_id"] != item["id"] for r in s["rupturas"])
        for s in dia0["slots"] if s["slot"] != "Almoço"
    )
    assert dados["resumo"]["itens_com_ruptura"] == 1


# P4 — Item sem conversão → não avaliável (avaliavel:false), resposta 200 (D-17)
def test_p4_projecao_sem_conversao_nao_avaliavel(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=100.0)
    _configurar_alunos(client, admin_token)
    prato = _criar_prato(client, admin_token)
    # Medida caseira "colher" SEM conversão cadastrada
    client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 1, "medida_caseira": "colher"},
        headers=_auth(admin_token),
    )
    _planejar_almoco_semana(client, admin_token, prato, [0])

    resp = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    item_proj = next(i for i in dados["itens"] if i["item_id"] == item["id"])
    assert item_proj["avaliavel"] is False
    assert item_proj["consumo_semana"] is None
    assert item_proj["saldo_projetado"] is None
    assert item_proj["primeiro_dia_ruptura"] is None
    assert dados["resumo"]["itens_nao_avaliaveis"] == 1
    assert dados["resumo"]["itens_com_ruptura"] == 0


# P5 — Cozinheira não vê a projeção (D-20) → 403
def test_p5_projecao_cozinheira_403(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    resp = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(cozinheira_token))
    assert resp.status_code == 403


# P6 — POST /planejamento não bloqueia por estoque: avisos aditivos (D-18)
def test_p6_post_avisos_nao_bloqueia(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=100.0)
    prato = _criar_prato(client, admin_token)
    client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )

    # Sem config de alunos → 200 com avisos vazios (não bloqueia — D-18)
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
    assert resp.json()["avisos"] == []

    # Com config → 200 e avisos apontando a ruptura projetada (360 kg vs saldo 100)
    _configurar_alunos(client, admin_token)
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
    assert dados["avisos"] == [
        {"item_id": item["id"], "nome": "Arroz", "faltando": 260}
    ]


# P7 — Ruptura granular por SLOT (obs #5): só a Janta rompe no dia; o slot do
# Lanche da Tarde (consumo sem ruptura) e os demais slots não listam o item.
def test_p7_ruptura_por_slot(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=5.0)
    _configurar_alunos(client, admin_token)
    # 0.025 kg/aluno no Lanche da Tarde (80 alunos) = 2 kg; 0.15 kg/aluno na
    # Janta (40 alunos) = 6 kg — valores exatos em ponto flutuante.
    prato_lanche = client.post(
        "/cardapio",
        json={"nome_refeicao": "Mingau de Fubá", "tipo_refeicao": "Lanche"},
        headers=_auth(admin_token),
    ).json()
    client.post(
        f"/cardapio/{prato_lanche['id']}/receita",
        json={"item_id": item["id"], "quantidade": 0.025, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    prato_janta = client.post(
        "/cardapio",
        json={"nome_refeicao": "Sopa de Legumes", "tipo_refeicao": "Janta"},
        headers=_auth(admin_token),
    ).json()
    client.post(
        f"/cardapio/{prato_janta['id']}/receita",
        json={"item_id": item["id"], "quantidade": 0.15, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    for slot, prato in (("Lanche da Tarde", prato_lanche), ("Janta", prato_janta)):
        resp = client.post(
            "/planejamento",
            json={
                "cardapio_item_id": prato["id"],
                "tipo_refeicao": slot,
                "dia_semana": 0,
                "data_inicio_vigencia": "2026-07-27",
            },
            headers=_auth(admin_token),
        )
        assert resp.status_code == 200

    resp = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    dia0 = dados["dias"][0]
    slots = dia0["slots"]
    # Lanche da Tarde consumiu 2 kg (saldo 5 → 3) sem romper: não lista o item
    lanche_tarde = next(s for s in slots if s["slot"] == "Lanche da Tarde")
    assert lanche_tarde["rupturas"] == []
    # Janta consumiu 6 kg (saldo 3 → -3): ruptura só neste slot
    janta = next(s for s in slots if s["slot"] == "Janta")
    assert len(janta["rupturas"]) == 1
    assert janta["rupturas"][0]["item_id"] == item["id"]
    assert janta["rupturas"][0]["faltando"] == 3.0
    # Nenhum outro slot do dia registra o item
    assert all(
        all(r["item_id"] != item["id"] for r in s["rupturas"])
        for s in slots if s["slot"] != "Janta"
    )
    assert dados["resumo"]["itens_com_ruptura"] == 1


# P8 — Rascunho altera a projeção (obs #4): trocar o prato do Almoço do dia 2 por
# um prato que consome Batata faz Batata romper no slot Almoço do dia 2; sem o
# rascunho, Batata não aparece em nenhuma ruptura.
def test_p8_rascunho_altera_projecao(client, admin_user, admin_token):
    arroz = _criar_item(client, admin_token, "Arroz", saldo=5000.0)
    batata = _criar_item(client, admin_token, "Batata", saldo=100.0)
    _configurar_alunos(client, admin_token)

    # Planejado: Almoço com prato que NÃO consome Batata (não rompe)
    prato_sem_batata = client.post(
        "/cardapio",
        json={"nome_refeicao": "Arroz Branco", "tipo_refeicao": "Almoço"},
        headers=_auth(admin_token),
    ).json()
    client.post(
        f"/cardapio/{prato_sem_batata['id']}/receita",
        json={"item_id": arroz["id"], "quantidade": 1, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    _planejar_almoco_semana(client, admin_token, prato_sem_batata, list(range(5)))

    # Candidato do rascunho: prato que consome Batata (1 kg/aluno → 180 kg no Almoço)
    prato_com_batata = client.post(
        "/cardapio",
        json={"nome_refeicao": "Músculo com Batata", "tipo_refeicao": "Almoço"},
        headers=_auth(admin_token),
    ).json()
    client.post(
        f"/cardapio/{prato_com_batata['id']}/receita",
        json={"item_id": batata["id"], "quantidade": 1, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )

    # Sem rascunho: Batata não aparece em ruptura alguma
    sem_rascunho = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(admin_token)).json()
    assert all(
        all(r["item_id"] != batata["id"] for s in d["slots"] for r in s["rupturas"])
        for d in sem_rascunho["dias"]
    )

    # Com rascunho: Batata rompe no slot Almoço do dia 2 (saldo 100 − 180 = −80)
    resp = client.get(
        "/planejamento/projecao?data=2026-07-31",
        params={"rascunho": [f"2|Almoço|{prato_com_batata['id']}"]},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    dados = resp.json()
    dia2 = next(d for d in dados["dias"] if d["dia_semana"] == 2)
    slot_almoco = next(s for s in dia2["slots"] if s["slot"] == "Almoço")
    ruptura = next(r for r in slot_almoco["rupturas"] if r["item_id"] == batata["id"])
    assert ruptura["nome"] == "Batata"
    assert ruptura["faltando"] == 80
    # Demais slots do dia 2 não registram Batata
    assert all(
        all(r["item_id"] != batata["id"] for r in s["rupturas"])
        for s in dia2["slots"] if s["slot"] != "Almoço"
    )


# P9 — Rascunho malformado/slot inválido/prato inexistente é IGNORADO (T-08-14):
# resposta idêntica à consulta sem rascunho, sempre 200 (pré-visualização).
def test_p9_rascunho_malformado_ignorado(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=1000.0)
    _configurar_alunos(client, admin_token)
    prato = _criar_prato(client, admin_token)
    client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 1, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    _planejar_almoco_semana(client, admin_token, prato, [0, 1])

    base = client.get("/planejamento/projecao?data=2026-07-31", headers=_auth(admin_token))
    assert base.status_code == 200

    resp = client.get(
        "/planejamento/projecao",
        params={
            "data": "2026-07-31",
            "rascunho": ["lixo", "2|SlotInexistente|3", "5|Almoço|99999", "1|2|3"],
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json() == base.json()