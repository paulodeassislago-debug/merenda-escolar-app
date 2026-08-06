# 08-07 — Configuração de alunos por período (IMP-09/10, D-14/D-15)
# GET admin+secretaria+cozinheira; PUT somente admin; totais derivados por slot


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


PAYLOAD_CONFIG = {"manha": 120, "tarde": 90, "noite": 40}


# a1 — Config inexistente → 404 com mensagem clara
def test_a1_config_inexistente_404(client, admin_user, admin_token):
    resp = client.get("/alunos-por-periodo", headers=_auth(admin_token))
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Configuração de alunos por período ainda não definida"


# a2 — Admin configura os três períodos → PUT 200 e GET confirma os valores
def test_a2_put_admin_configura(client, admin_user, admin_token):
    resp = client.put("/alunos-por-periodo", json=PAYLOAD_CONFIG, headers=_auth(admin_token))
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["manha"] == 120
    assert dados["tarde"] == 90
    assert dados["noite"] == 40
    assert dados["updated_by"] == admin_user.id

    consulta = client.get("/alunos-por-periodo", headers=_auth(admin_token)).json()
    assert consulta["manha"] == 120
    assert consulta["tarde"] == 90
    assert consulta["noite"] == 40


# a3 — Valor inválido (manha=0) → 422 do Pydantic (gt=0)
def test_a3_put_valor_invalido(client, admin_user, admin_token):
    resp = client.put(
        "/alunos-por-periodo",
        json={"manha": 0, "tarde": 90, "noite": 40},
        headers=_auth(admin_token),
    )
    assert resp.status_code == 422


# a4 — Cozinheira NÃO edita (403, D-14)
def test_a4_put_cozinheira_negado(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    resp = client.put("/alunos-por-periodo", json=PAYLOAD_CONFIG, headers=_auth(cozinheira_token))
    assert resp.status_code == 403


# a4b — Secretaria NÃO edita (403, D-14)
def test_a4b_put_secretaria_negado(client, admin_user, admin_token, secretaria_user, secretaria_token):
    resp = client.put("/alunos-por-periodo", json=PAYLOAD_CONFIG, headers=_auth(secretaria_token))
    assert resp.status_code == 403


# a5 — Cozinheira pode LER após configurado (200 — leitura liberada)
def test_a5_get_cozinheira_permite_leitura(client, admin_user, admin_token, cozinheira_user, cozinheira_token):
    client.put("/alunos-por-periodo", json=PAYLOAD_CONFIG, headers=_auth(admin_token))
    resp = client.get("/alunos-por-periodo", headers=_auth(cozinheira_token))
    assert resp.status_code == 200
    assert resp.json()["manha"] == 120
    assert resp.json()["tarde"] == 90
    assert resp.json()["noite"] == 40
