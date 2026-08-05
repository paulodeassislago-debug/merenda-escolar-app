# Fase 3.3 — Refeições (R1–R6 de .planning/codebase/TESTING.md)
# POST somente cozinheira; GET /refeicoes admin+sec; GET /refeicoes/hoje admin+cozinheira
# Fase 5.7 — Tipo "Lanche" unificado
# 08-07 — Payload por slot (R-5/D-16b): sem tipo_refeicao/qtd_alunos; backend deriva
#         tipo e total da configuração de alunos por período (D-14/D-15/D-16)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_item(client, admin_token, nome, saldo=10.0) -> dict:
    return client.post(
        "/itens",
        json={"nome": nome, "unidade_oficial": "KG", "saldo_atual": saldo},
        headers=_auth(admin_token),
    ).json()


def _criar_conversao(client, admin_token, item_id, medida, peso) -> dict:
    return client.post(
        "/conversoes",
        json={"item_id": item_id, "medida_caseira": medida, "peso_em_kg": peso},
        headers=_auth(admin_token),
    ).json()


def _saldo(client, admin_token, item_id) -> float:
    itens = client.get("/itens", headers=_auth(admin_token)).json()
    return next(i["saldo_atual"] for i in itens if i["id"] == item_id)


# Config padrão da suíte: manha 100, tarde 80, noite 40
# → Lanche da Manhã 100, Lanche da Tarde 80, Janta 40, Almoço 180 (D-15)
def _configurar_alunos(client, admin_token) -> None:
    resp = client.put(
        "/alunos-por-periodo",
        json={"manha": 100, "tarde": 80, "noite": 40},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200


# R1 — Lançar refeição com medidas caseiras → conversão aplicada, estoque deduzido
def test_r1_conversao_aplicada_estoque_deduzido(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _criar_conversao(client, admin_token, item["id"], "pacote", 0.5)  # 1 pacote = 0.5 kg
    _configurar_alunos(client, admin_token)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": 4, "medida_caseira": "pacote"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 200
    # 4 pacotes × 0.5 kg = 2 kg deduzidos
    assert _saldo(client, admin_token, item["id"]) == 8.0


# R2 — Item com justificativa → refeicao_itens.justificativa gravada
def test_r2_justificativa_gravada(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _configurar_alunos(client, admin_token)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [
                {"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg", "justificativa": "A pedido da nutricionista"},
            ],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 200

    historico = client.get("/refeicoes", headers=_auth(admin_token)).json()
    assert len(historico) == 1
    assert historico[0]["itens"][0]["justificativa"] == "A pedido da nutricionista"


# R3 — Medida caseira sem conversão → retorna erro claro (400)
def test_r3_medida_sem_conversao(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _configurar_alunos(client, admin_token)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": 4, "medida_caseira": "colher"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 400
    assert "conversão" in resp.json()["detail"].lower()
    # Saldo inalterado
    assert _saldo(client, admin_token, item["id"]) == 10.0


# R4 — Item inexistente no estoque → retorna erro claro (400)
def test_r4_item_inexistente(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    _configurar_alunos(client, admin_token)
    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": 9999, "quantidade": 1, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 400
    assert "não encontrado" in resp.json()["detail"].lower()


# R5 — GET /refeicoes/hoje → status pendente/confirmado por tipo (3 tipos: Lanche, Almoço, Janta)
def test_r5_refeicoes_hoje_status(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _configurar_alunos(client, admin_token)

    # Antes do lançamento: tudo pendente (3 tipos)
    status = client.get("/refeicoes/hoje", headers=_auth(cozinheira_token)).json()
    assert len(status) == 3
    assert all(s["status"] == "pendente" for s in status)

    # Lança o almoço (Almoço = manha + tarde = 180)
    client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )

    status = client.get("/refeicoes/hoje", headers=_auth(admin_token)).json()
    por_tipo = {s["tipo_refeicao"]: s for s in status}
    assert por_tipo["Almoço"]["status"] == "confirmado"
    assert por_tipo["Almoço"]["alunos"] == 180
    assert por_tipo["Lanche"]["status"] == "pendente"
    assert por_tipo["Janta"]["status"] == "pendente"


# R6 — Estoque insuficiente → retorna erro (saldo não fica negativo)
def test_r6_estoque_insuficiente(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=1.0)
    _configurar_alunos(client, admin_token)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": 5, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 400
    assert "insuficiente" in resp.json()["detail"].lower()
    # Saldo não ficou negativo nem foi alterado
    assert _saldo(client, admin_token, item["id"]) == 1.0


# R7 — Sem token → 401 em todas as rotas
def test_r7_sem_token(client):
    assert client.get("/refeicoes").status_code == 401
    assert client.get("/refeicoes/hoje").status_code == 401
    assert client.post(
        "/refeicoes",
        json={"slot": "Almoço", "itens": [{"item_id": 1, "quantidade": 1, "medida_caseira": "kg"}]},
    ).status_code == 401


# R8 — Perfil errado: POST é exclusivo da cozinheira; histórico exclusivo admin+sec
def test_r8_perfil_errado(client, admin_user, admin_token, cozinheira_user, cozinheira_token, secretaria_user, secretaria_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    payload = {
        "slot": "Almoço",
        "itens": [{"item_id": item["id"], "quantidade": 1, "medida_caseira": "kg"}],
    }

    # Admin e secretaria NÃO lançam refeição (exclusivo da cozinheira)
    assert client.post("/refeicoes", json=payload, headers=_auth(admin_token)).status_code == 403
    assert client.post("/refeicoes", json=payload, headers=_auth(secretaria_token)).status_code == 403

    # Cozinheira NÃO vê o histórico geral (admin+sec apenas)
    assert client.get("/refeicoes", headers=_auth(cozinheira_token)).status_code == 403

    # Secretaria vê o histórico; cozinheira vê o status de hoje
    assert client.get("/refeicoes", headers=_auth(secretaria_token)).status_code == 200
    assert client.get("/refeicoes/hoje", headers=_auth(cozinheira_token)).status_code == 200


# R9 — Refeição ligada a planejamento: receita escala por aluno e ajuste exige justificativa
def test_r9_ajuste_sem_justificativa(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    from datetime import date
    hoje = date.today()

    item = _criar_item(client, admin_token, "Arroz", saldo=50.0)
    _configurar_alunos(client, admin_token)
    prato = client.post(
        "/cardapio",
        json={"nome_refeicao": "Músculo com Batata", "tipo_refeicao": "Almoço"},
        headers=_auth(admin_token),
    ).json()
    # Receita planejada: 2 kg de arroz
    client.post(
        f"/cardapio/{prato['id']}/receita",
        json={"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"},
        headers=_auth(admin_token),
    )
    plan = client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Almoço",
            "dia_semana": hoje.weekday(),
            "data_inicio_vigencia": hoje.isoformat(),
        },
        headers=_auth(admin_token),
    ).json()

    # Receita-base de 2 kg × 180 alunos (manha+tarde) = 360 kg. Ajuste para 7 kg sem justificativa → 400
    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "planejamento_id": plan["id"],
            "itens": [{"item_id": item["id"], "quantidade": 7, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 400
    assert "justificativa" in resp.json()["detail"].lower()

    # Com justificativa → 200 e auditoria gravada (original=360 escalada, ajustada=7)
    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "planejamento_id": plan["id"],
            "itens": [
                {"item_id": item["id"], "quantidade": 7, "medida_caseira": "kg", "justificativa": "Mais quantidade final que a receita escalada"},
            ],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 200

    historico = client.get("/refeicoes", headers=_auth(admin_token)).json()
    item_lancado = historico[0]["itens"][0]
    assert item_lancado["quantidade_original"] == 360
    assert item_lancado["quantidade_ajustada"] == 7
    assert item_lancado["justificativa"] == "Mais quantidade final que a receita escalada"
    # 7 kg deduzidos (a quantidade final enviada, não a quantidade-base)
    assert _saldo(client, admin_token, item["id"]) == 43.0


# R10 — Refeição conforme a receita planejada (sem divergência) → não exige justificativa
def test_r10_conforme_receita_sem_justificativa(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    from datetime import date
    hoje = date.today()

    item = _criar_item(client, admin_token, "Arroz", saldo=400.0)
    _configurar_alunos(client, admin_token)
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
    plan = client.post(
        "/planejamento",
        json={
            "cardapio_item_id": prato["id"],
            "tipo_refeicao": "Almoço",
            "dia_semana": hoje.weekday(),
            "data_inicio_vigencia": hoje.isoformat(),
        },
        headers=_auth(admin_token),
    ).json()

    # Receita escalada: 2 kg × 180 alunos = 360 kg — conforme, sem justificativa
    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "planejamento_id": plan["id"],
            "itens": [{"item_id": item["id"], "quantidade": 360, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 200
    # /refeicoes/hoje exibe o prato planejado
    status = client.get("/refeicoes/hoje", headers=_auth(admin_token)).json()
    almoco = next(s for s in status if s["tipo_refeicao"] == "Almoço")
    assert almoco["status"] == "confirmado"
    assert almoco["prato"] == "Músculo com Batata"
    historico = client.get("/refeicoes", headers=_auth(admin_token)).json()
    item_lancado = historico[0]["itens"][0]
    assert item_lancado["quantidade_original"] == 360
    assert item_lancado["quantidade_ajustada"] == 360
    assert item_lancado["justificativa"] is None
    assert _saldo(client, admin_token, item["id"]) == 40.0


# B10-1 — POST /refeicoes com slot "Lanche da Manhã" → tipo derivado "Lanche" (200)
def test_refeicoes_tipo_lanche(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _configurar_alunos(client, admin_token)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Lanche da Manhã",
            "itens": [{"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 8.0
    historico = client.get("/refeicoes", headers=_auth(admin_token)).json()
    assert historico[0]["tipo_refeicao"] == "Lanche"
    assert historico[0]["qtd_alunos"] == 100  # Lanche da Manhã = manha


# B10-2 — POST /refeicoes com contrato antigo (tipo_refeicao no payload) → 422
def test_refeicoes_tipo_antigo_rejeitado(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    resp = client.post(
        "/refeicoes",
        json={
            "tipo_refeicao": "Lanche da Manhã",
            "itens": [{"item_id": 1, "quantidade": 2, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 422


# R11 — A cozinha não pode cadastrar conversão durante o preparo
def test_r11_medida_nova_com_peso_rejeitada(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10)
    _configurar_alunos(client, admin_token)
    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{
                "item_id": item["id"],
                "quantidade": 4,
                "medida_caseira": "Concha",
                "peso_em_kg": 0.25,
            }],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 422
    assert _saldo(client, admin_token, item["id"]) == 10

    conversoes = client.get(
        f"/conversoes?item_id={item['id']}", headers=_auth(admin_token)
    ).json()
    assert conversoes == []


# R12 — Campo de conversão livre não é aceito
def test_r12_medida_com_peso_invalido(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10)
    _configurar_alunos(client, admin_token)
    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{
                "item_id": item["id"],
                "quantidade": 4,
                "medida_caseira": "Concha",
                "peso_em_kg": 0,
            }],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 422
    assert _saldo(client, admin_token, item["id"]) == 10


# R13 — Quantidade negativa não pode aumentar o estoque
def test_r13_quantidade_negativa_rejeitada(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10)
    _configurar_alunos(client, admin_token)
    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": -1, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 422
    assert _saldo(client, admin_token, item["id"]) == 10


# R14 — A rota legada de lançamento não permanece disponível sem autenticação
def test_r14_rota_legada_de_lancamento_removida(client):
    resp = client.post(
        "/refeicoes/lancar",
        json={
            "alunos_atendidos": 1,
            "id_usuario": 1,
            "ingredientes": [],
        },
    )
    assert resp.status_code == 404


# R15 — Campos de conversão/identidade não podem atravessar o envelope da refeição
def test_r15_campos_livres_no_envelope_rejeitados(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10)
    _configurar_alunos(client, admin_token)
    for campo, valor in (("peso_em_kg", 0.25), ("id_usuario", 999)):
        resp = client.post(
            "/refeicoes",
            json={
                "slot": "Almoço",
                campo: valor,
                "itens": [{"item_id": item["id"], "quantidade": 1, "medida_caseira": "kg"}],
            },
            headers=_auth(cozinheira_token),
        )
        assert resp.status_code == 422
    assert _saldo(client, admin_token, item["id"]) == 10


# R16 — Derivação de qtd_alunos por slot (D-15/D-16b): 100/80/40 →
# Lanche da Manhã 100, Lanche da Tarde 80, Janta 40, Almoço 180
def test_r16_derivacao_por_slot(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _configurar_alunos(client, admin_token)

    esperados = {
        "Lanche da Manhã": 100,
        "Lanche da Tarde": 80,
        "Janta": 40,
        "Almoço": 180,
    }
    for slot, qtd_esperada in esperados.items():
        resp = client.post(
            "/refeicoes",
            json={
                "slot": slot,
                "itens": [{"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"}],
            },
            headers=_auth(cozinheira_token),
        )
        assert resp.status_code == 200, f"slot {slot}: {resp.text}"
        historico = client.get("/refeicoes", headers=_auth(admin_token)).json()
        assert historico[0]["qtd_alunos"] == qtd_esperada, f"slot {slot}"


# R17 — Config de alunos ausente → 400 claro (estado explícito, não silencioso)
def test_r17_config_ausente_400(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Configure os alunos por período antes de lançar a refeição"
    # Nada foi deduzido
    assert _saldo(client, admin_token, item["id"]) == 10.0


# R18 — Slot inválido (fora de SLOTS_PLANEJAMENTO) → 400
def test_r18_slot_invalido_400(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _configurar_alunos(client, admin_token)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Brunch",
            "itens": [{"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 400
    assert "inválido" in resp.json()["detail"].lower()
    assert _saldo(client, admin_token, item["id"]) == 10.0


# R19 — Avulso sem planejamento (D-16b): slot → 200, qtd_alunos derivado, estoque deduzido
def test_r19_avulso_sem_planejamento(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=10.0)
    _configurar_alunos(client, admin_token)

    resp = client.post(
        "/refeicoes",
        json={
            "slot": "Almoço",
            "itens": [{"item_id": item["id"], "quantidade": 2, "medida_caseira": "kg"}],
        },
        headers=_auth(cozinheira_token),
    )
    assert resp.status_code == 200
    historico = client.get("/refeicoes", headers=_auth(admin_token)).json()
    assert historico[0]["planejamento_id"] is None
    assert historico[0]["qtd_alunos"] == 180
    assert historico[0]["tipo_refeicao"] == "Almoço"
    # 2 kg deduzidos do estoque
    assert _saldo(client, admin_token, item["id"]) == 8.0
