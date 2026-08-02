# Spec.md — Especificações Técnicas

## 1. Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Backend | Python 3 + FastAPI | 0.139.x |
| ORM | SQLAlchemy | 2.0.x |
| Banco | SQLite (dev) / PostgreSQL (prod) | — |
| Servidor ASGI | Uvicorn | 0.51.x |
| Auth | python-jose (JWT) + passlib (bcrypt) | — |
| Frontend | React + Vite + TypeScript | 19.x / 8.x / ~6.0 |
| Roteamento | React Router DOM | 7.x |
| Estilização | CSS plain (.css) | — |
| XML parsing | fast-xml-parser (frontend) | — |
| Deploy | Docker + Coolify | — |

## 2. Modelo de Dados (SQLAlchemy)

### 2.1 Tabelas

```sql
usuarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT UNIQUE NOT NULL,
  senha_hash  TEXT NOT NULL,
  perfil      TEXT NOT NULL CHECK(perfil IN ('admin','secretaria','cozinheira'))
)

itens (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                TEXT UNIQUE NOT NULL,
  unidade_oficial     TEXT NOT NULL CHECK(unidade_oficial IN ('KG','L')),
  saldo_atual         REAL DEFAULT 0.0
)

conversoes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id         INTEGER NOT NULL REFERENCES itens(id),
  medida_caseira  TEXT NOT NULL,
  peso_em_kg      REAL NOT NULL,
  UNIQUE(item_id, medida_caseira)
)

cardapio_itens (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_refeicao   TEXT NOT NULL,
  tipo_refeicao   TEXT NOT NULL CHECK(tipo_refeicao IN ('Lanche da Manhã','Almoço','Lanche da Tarde','Janta'))
)

receitas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  cardapio_item_id  INTEGER NOT NULL REFERENCES cardapio_itens(id),
  item_id           INTEGER NOT NULL REFERENCES itens(id),
  quantidade        REAL NOT NULL,
  medida_caseira    TEXT NOT NULL
)

planejamento (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  cardapio_item_id      INTEGER NOT NULL REFERENCES cardapio_itens(id),
  tipo_refeicao         TEXT NOT NULL,
  dia_semana            INTEGER NOT NULL CHECK(dia_semana BETWEEN 0 AND 6),
  data_inicio_vigencia  DATE NOT NULL
)

entregas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  data_hora   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_usuario  INTEGER NOT NULL REFERENCES usuarios(id)
)

itens_entrega (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entrega_id      INTEGER NOT NULL REFERENCES entregas(id),
  item_id         INTEGER NOT NULL REFERENCES itens(id),
  quantidade      REAL NOT NULL,
  justificativa   TEXT,
  acao            TEXT NOT NULL CHECK(acao IN ('recebido','alterado','excluído'))
)

refeicoes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  data_hora           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo_refeicao       TEXT NOT NULL,
  id_usuario          INTEGER NOT NULL REFERENCES usuarios(id),
  qtd_alunos          INTEGER NOT NULL,
  planejamento_id     INTEGER REFERENCES planejamento(id)
)

refeicao_itens (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  refeicao_id           INTEGER NOT NULL REFERENCES refeicoes(id),
  item_id               INTEGER NOT NULL REFERENCES itens(id),
  quantidade_original   REAL NOT NULL,
  quantidade_ajustada   REAL NOT NULL,
  medida_caseira        TEXT NOT NULL,
  justificativa         TEXT
)
```

## 3. API Endpoints

### 3.1 Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login` | — | Retorna `{ access_token, perfil }` |
| GET | `/auth/me` | JWT | Retorna dados do usuário logado |

### 3.2 Usuários (Admin)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/usuarios` | Admin | Listar todos |
| POST | `/usuarios` | Admin | Criar |
| PUT | `/usuarios/{id}` | Admin | Editar |
| DELETE | `/usuarios/{id}` | Admin | Excluir |

### 3.3 Itens / Estoque

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/itens` | Admin, Sec, Coz | Listar estoque |
| POST | `/itens` | Admin | Criar item |
| PUT | `/itens/{id}` | Admin | Editar item |
| DELETE | `/itens/{id}` | Admin | Excluir item |

### 3.4 Conversões

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/conversoes?item_id=` | Admin, Sec | Listar conversões de um item |
| POST | `/conversoes` | Admin | Criar conversão |
| DELETE | `/conversoes/{id}` | Admin | Excluir conversão |

### 3.5 Cardápio e Receitas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/cardapio` | Admin, Sec | Listar itens do cardápio |
| POST | `/cardapio` | Admin | Criar item do cardápio |
| PUT | `/cardapio/{id}` | Admin | Editar |
| DELETE | `/cardapio/{id}` | Admin | Excluir |
| GET | `/cardapio/{id}/receita` | Admin, Sec, Coz | Ingredientes da receita |
| POST | `/cardapio/{id}/receita` | Admin | Adicionar ingrediente à receita |
| PUT | `/cardapio/{id}/receita/{receita_id}` | Admin | Editar qtd na receita |
| DELETE | `/cardapio/{id}/receita/{receita_id}` | Admin | Remover ingrediente da receita |

### 3.6 Planejamento Semanal

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/planejamento?data=` | Admin, Sec, Coz | Cardápio planejado para a semana a partir da data |
| POST | `/planejamento` | Admin, Sec | Definir/alterar planejamento de um dia |
| DELETE | `/planejamento/{id}` | Admin, Sec | Remover planejamento |

### 3.7 Entregas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/entregas` | Admin, Sec | Listar entregas (filtro por data) |
| POST | `/entregas` | Admin, Sec | Criar entrega (já confirmada, com itens) |
| GET | `/entregas/{id}` | Admin, Sec | Detalhe da entrega com itens |

**Request body do `POST /entregas`:**
```json
{
  "itens": [
    { "item_id": 1, "quantidade": 10, "acao": "recebido" },
    { "item_id": 2, "quantidade": 8, "acao": "alterado", "justificativa": "Faltou no fornecedor" },
    { "item_id": 3, "quantidade": 0, "acao": "excluído", "justificativa": "Produto vencido" }
  ]
}
```

### 3.8 Refeições

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/refeicoes?data=` | Admin, Sec | Histórico de refeições |
| POST | `/refeicoes` | Coz | Lançar refeição |
| GET | `/refeicoes/hoje` | Admin, Coz | Refeições do dia (status de cada tipo) |

**Request body do `POST /refeicoes`:**
```json
{
  "tipo_refeicao": "Almoço",
  "qtd_alunos": 200,
  "planejamento_id": 5,
  "itens": [
    { "item_id": 1, "quantidade": 9, "medida_caseira": "pacotes" },
    { "item_id": 2, "quantidade": 10, "medida_caseira": "kg" },
    { "item_id": 3, "quantidade": 3, "medida_caseira": "kg", "justificativa": "A pedido da nutricionista" }
  ]
}
```

**Response do `GET /refeicoes/hoje`:**
```json
[
  { "tipo_refeicao": "Lanche da Manhã", "status": "pendente", "prato": null },
  { "tipo_refeicao": "Almoço", "status": "confirmado", "prato": "Músculo com Batata", "alunos": 200 }
]
```

### 3.9 Cardápio Público

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/publico/cardapio?data=` | — | Cardápio do dia (sem auth) |

### 3.10 Dashboard Admin

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/admin/dashboard` | Admin | Métricas agregadas |

**Response:**
```json
{
  "estoque": {
    "total_itens": 45,
    "baixo_estoque": 3,
    "itens_criticos": [
      { "id": 1, "nome": "Arroz Parboilizado", "saldo_atual": 2.5 }
    ]
  },
  "refeicoes_hoje": [
    { "tipo": "Lanche da Manhã", "prato": "Cuscuz", "status": "confirmado", "alunos": 100 },
    { "tipo": "Almoço", "prato": "Músculo com Batata", "status": "pendente", "alunos": null }
  ],
  "entregas": {
    "ultimos_7_dias": 3,
    "ultimos_30_dias": 12,
    "ultima_data": "2026-07-30"
  },
  "alunos_hoje": {
    "total": 300,
    "por_tipo": { "Lanche da Manhã": 100, "Almoço": 200 }
  }
}
```

## 4. Estrutura de Arquivos (pós-implementação)

```
backend/
  main.py              # app FastAPI + todos os endpoints
  models.py             # todos os modelos SQLAlchemy
  database.py           # engine + session (inalterado)
  auth.py               # funções JWT + hash senha
  schemas.py            # todos os modelos Pydantic
  requirements.txt      # + python-jose, passlib[bcrypt], pytest, httpx
  merenda.db
  tests/
    __init__.py
    conftest.py         # fixtures: client, db, tokens por perfil
    test_auth.py        # testes de autenticação
    test_usuarios.py    # CRUD usuários
    test_itens.py       # CRUD itens
    test_conversoes.py  # CRUD conversões
    test_cardapio.py    # CRUD cardápio + receitas
    test_planejamento.py
    test_entregas.py    # E1–E5
    test_refeicoes.py   # R1–R6
    test_dashboard.py   # D1–D2
    test_publico.py     # P1–P2

frontend/src/
  main.tsx
  App.tsx               # rotas atualizadas
  types.ts              # interfaces expandidas
  api.ts                # fetch wrapper com token JWT
  auth.tsx              # AuthContext (login/logout/estado)
  components/
    ProtectedRoute.tsx  # wrapper que verifica perfil
    Layout.tsx          # sidebar + header para páginas autenticadas
  pages/
    Login.tsx           # atualizado com JWT real
    CardapioPublico.tsx # novo — acesso público
    admin/
      Dashboard.tsx     # novo
      Usuarios.tsx      # novo
      Itens.tsx         # novo
      Cardapio.tsx      # novo
      Receitas.tsx      # novo
      Planejamento.tsx  # novo
      Entregas.tsx      # novo
    Gestao.tsx          # adaptado para secretaria
    PainelCozinha.tsx   # evoluído com ajustes auditados
```

## 5. Steps de Implementação

### Step 1: Dependências e Configuração Inicial
- `backend/requirements.txt` — adicionar `python-jose[cryptography]`, `passlib[bcrypt]`, `pytest`, `httpx`
- Instalar novas dependências no venv
- Criar `backend/tests/` com `__init__.py` e `conftest.py` (fixtures base)
- `frontend/` — `npm install fast-xml-parser`

### Step 2: Autenticação JWT (Backend)

**Criar** `backend/auth.py`:
- `SECRET_KEY`, `ALGORITHM = "HS256"`
- `criar_hash_senha(senha)`, `verificar_senha(senha, hash)`
- `criar_token(usuario_id, perfil)`, `decodificar_token(token)`
- `get_usuario_atual(db, token)` — dependência FastAPI que extrai o token do header `Authorization: Bearer <token>`

**Modificar** `backend/main.py`:
- Adicionar `POST /auth/login` — recebe `{ nome, senha }`, verifica, retorna `{ access_token, perfil }`
- Adicionar `GET /auth/me` — retorna dados do usuário autenticado

**Criar** `backend/tests/test_auth.py` — testes 2.1 a 2.5 da rotina de testes
**Criar** `backend/tests/conftest.py` — fixtures: `client` (TestClient com banco em memória), `db`, seed de usuário admin

### Step 3: Refatorar Modelos e Criar Novas Tabelas

**Modificar** `backend/models.py`:
- Manter `Usuario` — adicionar validação do campo `perfil`
- Renomear `Estoque` para `Item` (coluna `id_ingrediente` → `id`)
- Renomear `DicionarioConversoes` para `Conversao` (adicionar `item_id` FK referenciando `itens.id`)
- Renomear `CardapioBase` para `CardapioItem`
- Renomear `RegistroRefeicoes` para `Refeicao`
- **Novas tabelas**: `Receita`, `Planejamento`, `Entrega`, `ItemEntrega`, `RefeicaoItem`

**Apagar** `merenda.db` para recriar com a nova estrutura na inicialização.

### Step 4: Schemas Pydantic (Backend)

**Criar** `backend/schemas.py` com todos os modelos Pydantic de request/response:
- `LoginRequest`, `LoginResponse`
- `UsuarioCreate`, `UsuarioUpdate`, `UsuarioResponse`
- `ItemCreate`, `ItemUpdate`, `ItemResponse`
- `ConversaoCreate`, `ConversaoResponse`
- `CardapioItemCreate/Update/Response`, `ReceitaCreate`, `ReceitaUpdate`, `ReceitaResponse`
- `PlanejamentoCreate`, `PlanejamentoResponse`
- `EntregaCreate`, `EntregaItemRequest`, `EntregaResponse`
- `RefeicaoCreate`, `RefeicaoItemRequest`, `RefeicaoResponse`
- `DashboardResponse`, `RefeicaoHojeResponse`

### Step 5: Endpoints CRUD (Backend)

**Modificar** `backend/main.py` — implementar todos os endpoints na ordem:

1. **Usuários** (`GET/POST /usuarios`, `PUT/DELETE /usuarios/{id}`) — protegidos com `get_usuario_atual`, apenas admin
   - **Criar** `backend/tests/test_usuarios.py`
2. **Itens** (`GET/POST /itens`, `PUT/DELETE /itens/{id}`) — admin pode criar/editar/excluir, todos podem listar
   - **Criar** `backend/tests/test_itens.py`
3. **Conversões** (`GET /conversoes?item_id=`, `POST /conversoes`, `DELETE /conversoes/{id}`) — admin gerencia
   - **Criar** `backend/tests/test_conversoes.py`
4. **Cardápio** (`GET/POST /cardapio`, `PUT/DELETE /cardapio/{id}`) — admin + sec
   - **Criar** `backend/tests/test_cardapio.py`
5. **Receitas** (`GET /cardapio/{id}/receita`, `POST /cardapio/{id}/receita`, `PUT/DELETE /cardapio/{id}/receita/{id}`) — admin gerencia
6. **Planejamento** (`GET /planejamento?data=`, `POST /planejamento`, `DELETE /planejamento/{id}`) — admin + sec
   - **Criar** `backend/tests/test_planejamento.py`
7. **Entregas** (`GET/POST /entregas`, `GET /entregas/{id}`) — admin + sec, com lógica de atualização de estoque no `POST`
   - **Criar** `backend/tests/test_entregas.py` — testes E1–E5
8. **Refeições** (`GET /refeicoes?data=`, `POST /refeicoes`, `GET /refeicoes/hoje`) — cozinheira cria, admin/sec leem. Lógica de conversão + dedução de estoque + auditoria
   - **Criar** `backend/tests/test_refeicoes.py` — testes R1–R6
9. **Dashboard** (`GET /admin/dashboard`) — admin, queries agregadas
   - **Criar** `backend/tests/test_dashboard.py` — testes D1–D2
10. **Cardápio público** (`GET /publico/cardapio?data=`) — sem auth
    - **Criar** `backend/tests/test_publico.py` — testes P1–P2

### Step 6: API Client e Auth Context (Frontend)

**Criar** `frontend/src/api.ts`:
- Função `fetchWithAuth(url, options)` que anexa token JWT do localStorage no header `Authorization`

**Criar** `frontend/src/auth.tsx`:
- `AuthContext` + `AuthProvider` com estado `{ user, token, perfil }`
- `login(nome, senha)` — chama `/auth/login`, armazena token no localStorage
- `logout()` — limpa token e estado
- `isAuthenticated`, `isAdmin`, `isSecretaria`, `isCozinheira`

**Criar** `frontend/src/components/ProtectedRoute.tsx`:
- Verifica se está autenticado e se o perfil tem acesso à rota
- Redireciona para `/` caso contrário

**Criar** `frontend/src/components/Layout.tsx`:
- Sidebar com links condicionais baseados no perfil
- Header com nome do usuário e botão de logout

### Step 7: Atualizar Login (Frontend)

**Modificar** `frontend/src/pages/Login.tsx`:
- Substituir lógica de redirect simulado por chamada real `POST /auth/login`
- Usar `AuthContext.login()`
- Redirecionar baseado no perfil retornado

### Step 8: Páginas do Admin (Frontend)

Criar em `frontend/src/pages/admin/`:

1. **Dashboard.tsx** — 4 cards/seções com métricas do `GET /admin/dashboard`
2. **Usuarios.tsx** — tabela CRUD com modal de criação/edição
3. **Itens.tsx** — tabela do estoque com CRUD e destaque visual para baixo estoque
4. **Cardapio.tsx** — lista de pratos do cardápio com CRUD
5. **Receitas.tsx** — editor de receita para um prato específico (adicionar/remover ingredientes, definir qtd + medida caseira)
6. **Planejamento.tsx** — grade semanal (dias × tipos de refeição), dropdown para selecionar prato em cada slot
7. **Entregas.tsx**:
   - Botão "Nova entrega" → modal com escolha: manual ou upload XML
   - Upload XML → parse com `fast-xml-parser` → popula tabela de itens
   - Tabela editável com botão de lápis por item → abre campos de quantidade + justificativa
   - Botão X para excluir item da entrega (com justificativa)
   - Botão "Confirmar recebimento" → `POST /entregas`

### Step 9: Evoluir Painel da Cozinheira (Frontend)

**Modificar** `frontend/src/pages/PainelCozinha.tsx`:
- Remover `cardapiosPadrao` hardcoded
- Ao selecionar tipo de refeição, buscar `GET /planejamento?data=hoje` → carregar receita do planejamento
- Exibir ingredientes da receita com quantidades
- Botão "+" para adicionar ingrediente extra (busca no `GET /itens`)
- Botão de lápis em cada item → modal com campo de quantidade + justificativa
- Botão X para remover item (abre campo de justificativa)
- Marcar visualmente itens que foram alterados/adicionados/removidos
- Confirmar → `POST /refeicoes` com a lista final de itens

### Step 10: Adaptar Gestão para Secretaria (Frontend)

**Modificar** `frontend/src/pages/Gestao.tsx` (atual `DashboardGestao.tsx`):
- Manter visão de estoque existente
- Adicionar links/navegação para entregas e planejamento
- Proteger rota para perfil `secretaria`

### Step 11: Cardápio Público (Frontend)

**Criar** `frontend/src/pages/CardapioPublico.tsx`:
- Chamar `GET /publico/cardapio?data=hoje`
- Exibir refeições do dia com nome do prato e lista de ingredientes
- Layout limpo e responsivo, sem elementos de navegação autenticada

### Step 12: Atualizar Rotas (Frontend)

**Modificar** `frontend/src/App.tsx`:
- Envolver tudo em `AuthProvider`
- Adicionar rotas novas protegidas com `ProtectedRoute`:
  - `/admin` → Dashboard (admin)
  - `/admin/usuarios` → Usuarios (admin)
  - `/admin/itens` → Itens (admin)
  - `/admin/cardapio` → Cardapio (admin)
  - `/admin/receitas/:id` → Receitas (admin)
  - `/admin/planejamento` → Planejamento (admin, sec)
  - `/admin/entregas` → Entregas (admin, sec)
  - `/cozinha` → PainelCozinha (cozinheira)
  - `/gestao` → Gestao (secretaria)
- Adicionar rota pública `/cardapio` → CardapioPublico

### Step 13: Verificação e Ajustes Finais

- Rodar `pytest backend/tests/ -v` — todos os testes devem passar
- Rodar `npm run build` no frontend para validar TypeScript
- Rodar `npm run lint` para validar ESLint
- Testar fluxos completos no Swagger UI (`/docs`)
- Executar checklist de testes manuais do frontend (F1–F17)
- Verificar conversão de medidas caseiras e dedução de estoque