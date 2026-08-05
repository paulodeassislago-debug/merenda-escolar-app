# Fase 3.2 — Entregas (E1–E5 de .planning/codebase/TESTING.md; somente admin+secretaria)
# Fase 8 — payloads com origem/data_entrega/fornecedor_id (D-05) e testes F1-F5 de fornecedores.


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _criar_item(client, admin_token, nome, saldo=10.0) -> dict:
    return client.post(
        "/itens",
        json={"nome": nome, "unidade_oficial": "KG", "saldo_atual": saldo},
        headers=_auth(admin_token),
    ).json()


def _criar_fornecedor(client, token, nome="Fornecedor Teste") -> dict:
    return client.post(
        "/fornecedores",
        json={"nome": nome},
        headers=_auth(token),
    ).json()


def _payload_entrega(itens: list, **campos) -> dict:
    """Corpo padrão de entrega com os campos obrigatórios da Fase 8 (D-05).

    D-07: origem xml exige nota_numero — o helper fornece um default para que
    os testes de saldo/ações (E1-E13) continuem exercendo o comportamento alvo.
    """
    payload = {
        "origem": "xml",
        "data_entrega": "2026-08-05",
        "fornecedor_id": campos.get("fornecedor_id"),
        "nota_numero": campos.get("nota_numero", "NF-TESTE"),
        "itens": itens,
    }
    for chave in ("nota_numero", "observacoes"):
        if chave in campos:
            payload[chave] = campos[chave]
    return payload


def _saldo(client, admin_token, item_id) -> float:
    itens = client.get("/itens", headers=_auth(admin_token)).json()
    return next(i["saldo_atual"] for i in itens if i["id"] == item_id)


# E1 — Criar entrega com 3 itens → itens_entrega gravados com ações corretas
def test_e1_criar_entrega_3_itens(client, admin_user, admin_token, secretaria_user, secretaria_token):
    item1 = _criar_item(client, admin_token, "Arroz")
    item2 = _criar_item(client, admin_token, "Feijão")
    item3 = _criar_item(client, admin_token, "Óleo")
    fornecedor = _criar_fornecedor(client, secretaria_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [
                {"item_id": item1["id"], "quantidade": 10, "acao": "recebido"},
                {"item_id": item2["id"], "quantidade": 8, "acao": "alterado", "justificativa": "Faltou no fornecedor"},
                {"item_id": item3["id"], "quantidade": 0, "acao": "excluído", "justificativa": "Produto vencido"},
            ],
            fornecedor_id=fornecedor["id"],
        ),
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
    fornecedor = _criar_fornecedor(client, admin_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [{"item_id": item["id"], "quantidade": 5, "acao": "recebido"}],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 15.0


# E3 — Item alterado → justificativa gravada, saldo atualizado com a quantidade alterada
def test_e3_alterado_justificativa_saldo(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Feijão", saldo=10.0)
    fornecedor = _criar_fornecedor(client, admin_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [
                {"item_id": item["id"], "quantidade": 3, "acao": "alterado", "justificativa": "Veio menos que o pedido"},
            ],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 13.0

    detalhe = client.get(f"/entregas/{resp.json()['id']}", headers=_auth(admin_token)).json()
    assert detalhe["itens"][0]["justificativa"] == "Veio menos que o pedido"


# E4 — Item excluído → justificativa gravada, saldo inalterado
def test_e4_excluido_justificativa_saldo_inalterado(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Óleo", saldo=10.0)
    fornecedor = _criar_fornecedor(client, admin_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [
                {"item_id": item["id"], "quantidade": 0, "acao": "excluído", "justificativa": "Produto vencido"},
            ],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 10.0

    detalhe = client.get(f"/entregas/{resp.json()['id']}", headers=_auth(admin_token)).json()
    assert detalhe["itens"][0]["justificativa"] == "Produto vencido"


# E5 — Criar entrega sem itens → erro 422
def test_e5_entrega_sem_itens(client, admin_user, admin_token):
    fornecedor = _criar_fornecedor(client, admin_token)
    resp = client.post(
        "/entregas",
        json=_payload_entrega([], fornecedor_id=fornecedor["id"]),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 422


# E6 — Sem token → 401 em todas as rotas
def test_e6_sem_token(client):
    assert client.get("/entregas").status_code == 401
    assert client.get("/entregas/1").status_code == 401
    assert client.post(
        "/entregas",
        json={
            "origem": "xml",
            "data_entrega": "2026-08-05",
            "fornecedor_id": 1,
            "itens": [{"item_id": 1, "quantidade": 1, "acao": "recebido"}],
        },
    ).status_code == 401


# E7 — Perfil errado (cozinheira) → 403 em todas as rotas
def test_e7_perfil_errado(client, cozinheira_user, cozinheira_token):
    assert client.get("/entregas", headers=_auth(cozinheira_token)).status_code == 403
    assert client.get("/entregas/1", headers=_auth(cozinheira_token)).status_code == 403
    assert client.post(
        "/entregas",
        json={
            "origem": "xml",
            "data_entrega": "2026-08-05",
            "fornecedor_id": 1,
            "itens": [{"item_id": 1, "quantidade": 1, "acao": "recebido"}],
        },
        headers=_auth(cozinheira_token),
    ).status_code == 403


# E8 — Ação alterado/excluído sem justificativa → 400 (regra de auditoria; origem xml)
def test_e8_acao_sem_justificativa(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz")
    fornecedor = _criar_fornecedor(client, admin_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [{"item_id": item["id"], "quantidade": 3, "acao": "alterado"}],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [{"item_id": item["id"], "quantidade": 0, "acao": "excluído"}],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400
    # Saldo deve permanecer inalterado (nada foi gravado)
    assert _saldo(client, admin_token, item["id"]) == 10.0


# E9 — GET /entregas?data= filtra pelo dia
def test_e9_filtro_por_data(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz")
    fornecedor = _criar_fornecedor(client, admin_token)
    client.post(
        "/entregas",
        json=_payload_entrega(
            [{"item_id": item["id"], "quantidade": 5, "acao": "recebido"}],
            fornecedor_id=fornecedor["id"],
        ),
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


# E10 — Unidade diferente da oficial usa fator informado e persiste por item
def test_e10_entrega_unidade_diferente_persiste_conversao_por_item(client, admin_user, admin_token):
    item = client.post(
        "/itens",
        json={
            "nome": "Banana",
            "unidade_oficial": "Cartela",
            "unidade_interna": "KG",
            "fator_conversao": 2.5,
            "saldo_atual": 0,
        },
        headers=_auth(admin_token),
    ).json()
    fornecedor = _criar_fornecedor(client, admin_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [{
                "item_id": item["id"],
                "quantidade": 3,
                "unidade": "Caixa",
                "fator_conversao": 4.0,
                "acao": "recebido",
            }],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 12.0

    conversoes = client.get(
        f"/conversoes?item_id={item['id']}",
        headers=_auth(admin_token),
    ).json()
    assert conversoes[0]["medida_caseira"] == "Caixa"
    assert conversoes[0]["peso_em_kg"] == 4.0

    detalhe = client.get(f"/entregas/{resp.json()['id']}", headers=_auth(admin_token)).json()
    assert detalhe["itens"][0]["unidade"] == "Caixa"
    assert detalhe["itens"][0]["fator_conversao"] == 4.0


# E11 — Conversão já cadastrada pode ser reutilizada sem reenviar o fator
def test_e11_entrega_reutiliza_conversao_do_item(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz", saldo=0)
    _criar_conversao = client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "Saca", "peso_em_kg": 30},
        headers=_auth(admin_token),
    )
    assert _criar_conversao.status_code == 200
    fornecedor = _criar_fornecedor(client, admin_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [{
                "item_id": item["id"],
                "quantidade": 2,
                "unidade": "saca",
                "acao": "recebido",
            }],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 60.0


# E12 — Unidade diferente sem conversão nem fator é rejeitada sem alterar estoque
def test_e12_entrega_sem_conversao_rejeitada(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Feijão", saldo=10)
    fornecedor = _criar_fornecedor(client, admin_token)
    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [{
                "item_id": item["id"],
                "quantidade": 2,
                "unidade": "Fardo",
                "acao": "recebido",
            }],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 400
    assert "fardo" in resp.json()["detail"].lower()
    assert _saldo(client, admin_token, item["id"]) == 10


# E13 — Fator informado atualiza a conversão já associada ao mesmo item
def test_e13_entrega_atualiza_conversao_do_item(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Batata", saldo=0)
    client.post(
        "/conversoes",
        json={"item_id": item["id"], "medida_caseira": "Caixa", "peso_em_kg": 10},
        headers=_auth(admin_token),
    )
    fornecedor = _criar_fornecedor(client, admin_token)

    resp = client.post(
        "/entregas",
        json=_payload_entrega(
            [{
                "item_id": item["id"],
                "quantidade": 2,
                "unidade": "Caixa",
                "fator_conversao": 12,
                "acao": "recebido",
            }],
            fornecedor_id=fornecedor["id"],
        ),
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    assert _saldo(client, admin_token, item["id"]) == 24
    conversao = client.get(
        f"/conversoes?item_id={item['id']}", headers=_auth(admin_token)
    ).json()[0]
    assert conversao["peso_em_kg"] == 12


# --- Fase 8 — Fornecedores (F1-F5; D-06/D-08) ---

# F1 — POST /fornecedores persiste nome/cnpj e GET /fornecedores lista
def test_f1_criar_fornecedor(client, admin_user, admin_token):
    resp = client.post(
        "/fornecedores",
        json={"nome": "Distribuidora Rural", "cnpj": "12.345.678/0001-90"},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    criado = resp.json()
    assert criado["nome"] == "Distribuidora Rural"
    assert criado["cnpj"] == "12.345.678/0001-90"

    lista = client.get("/fornecedores", headers=_auth(admin_token)).json()
    assert any(f["id"] == criado["id"] and f["nome"] == "Distribuidora Rural" for f in lista)


# F2 — POST /fornecedores com nome vazio → 400
def test_f2_fornecedor_sem_nome(client, admin_user, admin_token):
    resp = client.post("/fornecedores", json={"nome": ""}, headers=_auth(admin_token))
    assert resp.status_code == 400


# F3 — POST/GET /fornecedores com perfil errado (cozinheira) → 403
def test_f3_fornecedor_perfil_errado(client, cozinheira_user, cozinheira_token):
    assert client.get("/fornecedores", headers=_auth(cozinheira_token)).status_code == 403
    assert client.post(
        "/fornecedores",
        json={"nome": "Qualquer"},
        headers=_auth(cozinheira_token),
    ).status_code == 403


# F4 — POST /entregas sem origem/data_entrega/fornecedor_id → 422 (Pydantic, D-05)
def test_f4_entrega_exige_campos_novos(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Arroz")
    corpo_sem_campos_novos = {
        "itens": [{"item_id": item["id"], "quantidade": 1, "acao": "recebido"}],
    }
    resp = client.post("/entregas", json=corpo_sem_campos_novos, headers=_auth(admin_token))
    assert resp.status_code == 422

    fornecedor = _criar_fornecedor(client, admin_token)
    resp = client.post(
        "/entregas",
        json={
            "origem": "xml",
            "data_entrega": "2026-08-05",
            "itens": [{"item_id": item["id"], "quantidade": 1, "acao": "recebido"}],
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 422
    resp = client.post(
        "/entregas",
        json={
            "origem": "xml",
            "fornecedor_id": fornecedor["id"],
            "itens": [{"item_id": item["id"], "quantidade": 1, "acao": "recebido"}],
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 422
    resp = client.post(
        "/entregas",
        json={
            "data_entrega": "2026-08-05",
            "fornecedor_id": fornecedor["id"],
            "itens": [{"item_id": item["id"], "quantidade": 1, "acao": "recebido"}],
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 422
    assert _saldo(client, admin_token, item["id"]) == 10.0


# F5 — GET /entregas/{id} devolve os campos novos da entrega
def test_f5_detalhe_entrega_campos_novos(client, admin_user, admin_token):
    item = _criar_item(client, admin_token, "Feijão", saldo=10.0)
    fornecedor = _criar_fornecedor(client, admin_token, nome="Laticínios ABC")

    resp = client.post(
        "/entregas",
        json={
            "origem": "manual",
            "data_entrega": "2026-08-05",
            "fornecedor_id": fornecedor["id"],
            "nota_numero": "NF-999",
            "observacoes": "Recebido no turno da manhã",
            "itens": [{"item_id": item["id"], "quantidade": 5, "acao": "recebido"}],
        },
        headers=_auth(admin_token),
    )
    assert resp.status_code == 200
    entrega_id = resp.json()["id"]

    detalhe = client.get(f"/entregas/{entrega_id}", headers=_auth(admin_token)).json()
    assert detalhe["origem"] == "manual"
    assert detalhe["data_entrega"] == "2026-08-05"
    assert detalhe["fornecedor_id"] == fornecedor["id"]
    assert detalhe["fornecedor_nome"] == "Laticínios ABC"
    assert detalhe["nota_numero"] == "NF-999"
    assert detalhe["observacoes"] == "Recebido no turno da manhã"
