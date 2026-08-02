# Rotina de Testes — Sistema de Cozinha Escolar

## Verificações universais (executar antes de concluir qualquer step)

| # | Verificação | Comando |
|---|---|---|
| V1 | Backend sobe sem erros | `source backend/venv/bin/activate && uvicorn main:app --port 8000` — sem tracebacks |
| V2 | Swagger acessível | Abrir `http://127.0.0.1:8000/docs` — endpoints listados corretamente |
| V3 | Testes backend passam | `pytest backend/ -v` — todos verdes |
| V4 | Frontend compila | `npm run build` (inclui `tsc -b`) — zero erros |
| V5 | Frontend lint limpo | `npm run lint` — zero warnings/errors |
| V6 | Dev server funciona | `npm run dev` — carrega no navegador sem erros de console |

---

## Step 2: Autenticação JWT

| # | Teste automatizado (pytest) |
|---|---|
| 2.1 | `POST /auth/login` com credenciais válidas → 200 + `access_token` |
| 2.2 | `POST /auth/login` com senha errada → 401 |
| 2.3 | `GET /auth/me` com token válido → 200 + dados do usuário |
| 2.4 | `GET /auth/me` sem token → 401 |
| 2.5 | `GET /auth/me` com token inválido/expirado → 401 |

---

## Step 3: Refatoração de Modelos

| # | Teste |
|---|---|
| 3.1 | Deletar `merenda.db`, subir backend → arquivo recriado automaticamente |
| 3.2 | `GET /docs` → schemas refletem as novas tabelas |
| 3.3 | Inserir 1 registro em cada tabela via Swagger → sem erros de FK/constraint |

---

## Step 4: Schemas Pydantic

| # | Teste |
|---|---|
| 4.1 | Backend sobe sem erros de importação de schemas |
| 4.2 | Swagger exibe os schemas de request/response corretamente |

---

## Step 5: Endpoints CRUD

### Testes genéricos (para cada grupo: usuários, itens, cardápio, conversões, planejamento)

| # | Teste automatizado |
|---|---|
| 5.1 | `POST` → cria registro, 200, dados conferem |
| 5.2 | `GET` → lista inclui o registro criado |
| 5.3 | `PUT` → atualiza, `GET` confirma alteração |
| 5.4 | `DELETE` → remove, `GET` confirma ausência |
| 5.5 | Rota protegida sem token → 401 |
| 5.6 | Rota com perfil errado → 403 |

### 5.7: Entregas

| # | Teste automatizado |
|---|---|
| E1 | Criar entrega com 3 itens → `itens_entrega` gravados com ações corretas |
| E2 | Item `recebido` → `itens.saldo_atual` incrementado corretamente |
| E3 | Item `alterado` → justificativa gravada, saldo atualizado com qtd alterada |
| E4 | Item `excluído` → justificativa gravada, saldo inalterado |
| E5 | Criar entrega sem itens → erro 422 |

### 5.8: Refeições

| # | Teste automatizado |
|---|---|
| R1 | Lançar refeição com medidas caseiras → conversão aplicada, estoque deduzido |
| R2 | Item com justificativa → `refeicao_itens.justificativa` gravada |
| R3 | Medida caseira sem conversão → retorna erro claro (400) |
| R4 | Item inexistente no estoque → retorna erro claro (400) |
| R5 | `GET /refeicoes/hoje` → retorna status pendente/confirmado por tipo |
| R6 | Estoque insuficiente → retorna erro (saldo não fica negativo) |

### 5.9: Dashboard

| # | Teste automatizado |
|---|---|
| D1 | `GET /admin/dashboard` → 4 seções presentes (valores podem ser zero) |
| D2 | Após criar entrega + refeição → métricas atualizadas |

### 5.10: Cardápio público

| # | Teste automatizado |
|---|---|
| P1 | `GET /publico/cardapio?data=2026-07-31` sem token → 200 |
| P2 | `GET /publico/cardapio` sem data → usa data atual |

---

## Steps 6–12: Frontend

### Testes manuais (navegador)

| # | Teste |
|---|---|
| F1 | Login com credenciais válidas → redireciona para rota correta por perfil |
| F2 | Login com credenciais inválidas → mensagem de erro visível |
| F3 | Acessar `/admin` sem login → redirecionado para `/` |
| F4 | Acessar `/cozinha` com perfil admin → redirecionado/bloqueado |
| F5 | Logout → volta para `/`, token removido do localStorage |
| F6 | Dashboard admin → 4 cards/seções exibem dados reais |
| F7 | CRUD de usuários → criar, editar, excluir com feedback visual |
| F8 | CRUD de itens → criar, editar, excluir com feedback visual |
| F9 | Cardápio + receitas → adicionar prato, ingredientes, remover |
| F10 | Planejamento → selecionar prato em cada slot, salvar, recarregar persiste |
| F11 | Entregas manual → criar, editar item (abre justificativa), confirmar |
| F12 | Entregas XML → upload, parse, editar, confirmar |
| F13 | Cozinheira → selecionar refeição carrega planejamento do dia |
| F14 | Cozinheira → alterar qtd (abre justificativa), adicionar item, remover item |
| F15 | Cozinheira → confirmar preparo, verificar estoque deduzido |
| F16 | Cardápio público → acessível sem login, mostra dados do dia |
| F17 | Cardápio público → responsivo em mobile/tablet |

---

## Automação de Testes (pytest)

Os testes de API (Steps 2 a 5) são automatizados com **pytest + httpx (TestClient)**.

### Estrutura

```
backend/
  tests/
    __init__.py
    conftest.py           # fixtures: client, db, admin_token, cozinheira_token
    test_auth.py          # Step 2
    test_usuarios.py      # Step 5 (CRUD usuários)
    test_itens.py         # Step 5 (CRUD itens)
    test_conversoes.py    # Step 5 (CRUD conversões)
    test_cardapio.py      # Step 5 (CRUD cardápio + receitas)
    test_planejamento.py  # Step 5 (planejamento semanal)
    test_entregas.py      # E1–E5
    test_refeicoes.py     # R1–R6
    test_dashboard.py     # D1–D2
    test_publico.py       # P1–P2
```

### Fixtures principais (`conftest.py`)

- **`client`**: `TestClient(app)` com banco em memória (`sqlite:///:memory:`) para isolamento total
- **`db`**: sessão de banco limpa por teste
- **`admin_token`**: cria usuário admin, faz login, retorna token JWT
- **`cozinheira_token`**: cria usuário cozinheira, faz login, retorna token
- **`secretaria_token`**: cria usuário secretaria, faz login, retorna token
- **`item_teste`**: cria um item no banco para uso nos testes

### Execução

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

---

## Critério de conclusão de cada step

Um step só está concluído quando:

1. Todos os testes automatizados do step passam (`pytest`)
2. `npm run build` compila sem erros
3. `npm run lint` passa limpo
4. O backend sobe sem erros (`uvicorn main:app`)
5. Os testes manuais de frontend aplicáveis são executados sem falhas