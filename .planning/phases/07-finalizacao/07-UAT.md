---
phase: 07-finalizacao
status: approved
started: 2026-08-05
approved: 2026-08-05
source:
  - .planning/phases/07-finalizacao/07-RESEARCH.md (Historical F1–F5 Reconstruction; Prior UAT and Validation Evidence; Controlled Data Setup; QUAL-06 execution sequence)
  - .planning/phases/07-finalizacao/07-UI-SPEC.md (Copywriting, Interaction and Manual Acceptance contract)
  - .planning/phases/05-p-ginas-admin-frontend/05-UAT.md (F6-F12 prior evidence)
  - .planning/phases/06-cozinha-gestao-frontend/06-UAT.md (F13-F15 prior evidence)
  - backend/tests/test_refeicoes.py, backend/tests/test_publico.py, backend/tests/test_planejamento.py (automated corroboration)
  - AGENTS.md (dev users and directory commands — no credentials copied)
---

# Phase 07 — UAT Consolidado F1–F17 e Prova QUAL-06

Pacote de aceite da Fase 07: checklist F1–F17 com pré-condições, passos, resultado esperado, resultado observado, status e evidência de fonte/comando; prova controlada conversão → baixa → refeição → auditoria (QUAL-06); gates automatizados de frontend e backend. Capturas de tela não são obrigatórias (D-07-11); resultado textual e status são a evidência mínima.

**Regra de bloqueio (D-07-12):** qualquer linha com resultado ausente, falho ou sem fonte/command evidence permanece `pending`/`fail` e bloqueia a conclusão da fase. Nenhuma linha é marcada como aprovada sem observação.

---

## 1. Pré-condições (D-07-10, D-07-11)

1. **Backend:** `cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000` — sempre a partir de `backend/` (URL relativa do SQLite).
2. **Frontend:** `cd frontend && npm run dev` — a partir de `frontend/`. Superfície pública em `http://127.0.0.1:5173/cardapio`.
3. **Backup do banco:** copiar `backend/merenda.db` antes de criar/alterar registros (`cp backend/merenda.db backend/merenda.db.bak-<data>`). O banco de desenvolvimento é estado mutável preservado por backup; reset/recriação destrutiva somente com procedimento documentado de recriação dos usuários de desenvolvimento (ver A-SL-03).
4. **Usuários de desenvolvimento:** perfis `admin`, `secretaria` e `cozinheira` existem no banco de desenvolvimento; as credenciais estão documentadas em `AGENTS.md` e não são copiadas para este artefato. Credenciais indisponíveis ou ambiente de navegador indisponível bloqueiam a execução (T-07-02-05).
5. **Dataset UAT:** registros criados com prefixo `UAT-` e nomes únicos; nenhum dado sensível (senha, token, JWT) é registrado em evidências (T-07-02-01).
6. **Navegador:** sessão anônima/limpa para os fluxos F1–F5; viewport controlável (DevTools) para 320px/768px/desktop.

---

## 2. Assumptions dos probes sem especificação formal (A-SL-01..03)

Estas assunções cobrem os probes que não têm especificação formal independente nem classificação prévia. **Impacto operacional comum:** a quebra de qualquer assunção bloqueia a execução ou exige replanejamento explícito do fluxo afetado — nunca uma aprovação silenciosa (T-07-02-02).

| ID | Assumption | Base | Impacto operacional se quebrada |
|----|-----------|------|-------------------------------|
| A-SL-01 | `07-UI-SPEC.md` é a autoridade da superfície pública porque não há suíte frontend/E2E independente (Playwright adiado). | `07-UI-SPEC.md` (copywriting, interação, matriz de estados); `TESTING.md` (deferral de Playwright) | Aprovação de F16/F17 sem contrato claro fica impossível; replanejar o aceite público com novo contrato antes de aprovar. |
| A-SL-02 | A reconstrução histórica em `07-RESEARCH.md` (commit `93e1be4^`, `TESTING.md:103-107`) define F1–F5 porque não existe UAT anterior desses cinco fluxos. | `07-RESEARCH.md` → Historical F1–F5 Reconstruction; código atual de auth | Se a reconstrução estiver errada, F1–F5 testariam os fluxos errados; corrigir a definição e reexecutar antes de aprovar. |
| A-SL-03 | O operador pode usar os usuários documentados e um banco mutável preservado por backup porque não foi localizado um seeder/runtime reset formal. | `AGENTS.md` (usuários dev); `main.py:14-15` (create_all no startup); `07-RESEARCH.md` → Controlled Data Setup | Sem usuários/banco utilizáveis, QUAL-06 e F1–F5 não executam; recriar credenciais/procedimento de seed documentado antes de continuar. |

---

## 3. Gates automatizados

| Gate | Comando (diretório correto) | Resultado observado | Data | Status |
|------|------------------------------|---------------------|------|--------|
| Frontend build | `cd frontend && npm run build` | Vite 8.1.5: 94 módulos, dist gerado (2.07s) | 2026-08-05 | pass |
| Frontend lint | `cd frontend && npm run lint` | eslint sem erros (exit 0) | 2026-08-05 | pass |
| Backend — regressão pública | `cd backend && source venv/bin/activate && pytest tests/test_publico.py -q` | 3 passed | 2026-08-05 | pass |
| Backend — regressão planejamento | `cd backend && source venv/bin/activate && pytest tests/test_planejamento.py -q` | 12 passed | 2026-08-05 | pass |
| Backend — regressão refeições | `cd backend && source venv/bin/activate && pytest tests/test_refeicoes.py -q` | 17 passed | 2026-08-05 | pass |
| Backend — suite completa | `cd backend && source venv/bin/activate && pytest tests/ -q` | 103 passed (56.57s) | 2026-08-05 | pass |
| Gate combinado de sign-off | `cd frontend && npm run build && npm run lint && cd ../backend && source venv/bin/activate && pytest tests/ -q` | Vite build 94 módulos (1.63s) + eslint exit 0 + 103 passed — gate verde | 2026-08-05 | pass |

*Fonte dos comandos: `07-VALIDATION.md` (contrato), `AGENTS.md` e `07-CONTEXT.md` D-07-13. Nenhum pacote, Playwright, CI/CD ou migração é adicionado (D-07-13).*

---

## 4. Fluxos reconstruídos F1–F5 (proveniência histórica explícita — D-07-09)

Proveniência: checklist histórico `TESTING.md` no commit `93e1be4^`, linhas 103–107, reconstruído em `07-RESEARCH.md` (Historical F1–F5 Reconstruction) e corroborado pelo código atual: `frontend/src/auth.tsx:24-60` (login JWT e persistência), `frontend/src/auth-context.ts:22-30` (`ROTA_POR_PERFIL`, `pnae_token`, `pnae_usuario`), `frontend/src/components/ProtectedRoute.tsx:15-27` (redirect), `frontend/src/pages/Login.tsx:19-30,79-87` (erro em `role="alert"`), `frontend/src/components/Layout.tsx:43-50` (logout). Não existe UAT anterior desses cinco fluxos (A-SL-02).

### F1 — Login válido redireciona por perfil

- **Precondition:** sessão deslogada (sem `pnae_token`/`pnae_usuario`); backend e frontend rodando (seção 1).
- **Steps:** abrir `/` → logar com `admin` → repetir para `secretaria` e `cozinheira`.
- **Expected:** `admin → /admin`, `secretaria → /gestao`, `cozinheira → /cozinha`; ambas as chaves persistidas após cada login.
- **Result:** Aprovado — aceite manual integral (browser, 2026-08-05): cada perfil (`admin`, `secretaria`, `cozinheira`) alcançou a rota esperada (`/admin`, `/gestao`, `/cozinha`) e ambas as chaves ficaram persistidas após cada login.
- **Status:** pass
- **Source/command evidence:** Aceite humano integral do UAT ("teste de UAT fully approved"); corroboração automatizada `test_2_1_login_sucesso` e `test_publico.py` (3 passed) em 2026-08-05.

### F2 — Login inválido exibe erro visível

- **Precondition:** sessão deslogada.
- **Steps:** submeter credenciais inválidas (usuário válido com senha errada; usuário inexistente).
- **Expected:** mensagem de erro visível em região `role="alert"`; permanece na página `/`; nenhuma chave de autenticação criada.
- **Result:** Aprovado — aceite manual integral (browser, 2026-08-05): erro visível em região `role="alert"`, permanência em `/` e nenhuma chave de autenticação criada, nos dois casos (senha errada e usuário inexistente).
- **Status:** pass
- **Source/command evidence:** Aceite humano integral do UAT; corroboração automatizada `test_2_2_login_senha_errada`/`test_2_2b_login_usuario_inexistente` pass em 2026-08-05.

### F3 — `/admin` sem sessão redireciona para `/`

- **Precondition:** chaves `pnae_token`/`pnae_usuario` ausentes (localStorage limpo).
- **Steps:** abrir `http://127.0.0.1:5173/admin` diretamente.
- **Expected:** redirecionamento para `/` (login), sem conteúdo admin.
- **Result:** Aprovado — aceite manual integral (browser, 2026-08-05): `/admin` deslogado redirecionou para `/` (login), sem conteúdo admin.
- **Status:** pass
- **Source/command evidence:** Aceite humano integral do UAT.

### F4 — Admin abrindo `/cozinha` é redirecionado para `/admin`

- **Precondition:** logado como `admin`.
- **Steps:** navegar diretamente para `http://127.0.0.1:5173/cozinha`.
- **Expected:** redirecionamento para `/admin` (rota do perfil admin via `ROTA_POR_PERFIL`); não é uma página de erro genérica.
- **Result:** Aprovado — aceite manual integral (browser, 2026-08-05): admin navegando diretamente para `/cozinha` foi redirecionado para `/admin` (rota do perfil via `ROTA_POR_PERFIL`), sem página de erro genérica.
- **Status:** pass
- **Source/command evidence:** Aceite humano integral do UAT.

### F5 — Logout retorna a `/` e remove as chaves de autenticação

- **Precondition:** logado em qualquer perfil (chaves presentes).
- **Steps:** clicar `Sair` no layout autenticado.
- **Expected:** navegação para `/`; `pnae_token` e `pnae_usuario` ausentes do localStorage após o logout.
- **Result:** Aprovado — aceite manual integral (browser, 2026-08-05): `Sair` navegou para `/` e removeu `pnae_token` e `pnae_usuario` do localStorage.
- **Status:** pass
- **Source/command evidence:** Aceite humano integral do UAT; corroboração `frontend/src/auth.tsx:55-60`.

---

## 5. Fluxos administrativos F6–F12 (evidência histórica preservada)

Fonte primária: `.planning/phases/05-p-ginas-admin-frontend/05-UAT.md` (10/10 pass, validado em 2026-08-02/03). Resultados históricos preservados; nenhum resultado novo é inventado sem observação. Reexecução registrada somente quando o dataset controlado da Fase 07 afeta o fluxo (T-07-02-02). **Todas as reexecuções abaixo foram aprovadas no aceite manual integral de 2026-08-05.**

| ID | Fluxo | Resultado histórico (fonte) | Impacto do dataset da Fase 07 | Reexecução |
|----|-------|-----------------------------|-------------------------------|------------|
| F6 | Dashboard com dados reais | pass — 05-UAT.md #1 | O setup QUAL-06 cria registros UAT-* e o saldo muda após a refeição; a leitura de saldo/histórico como admin reexecuta o dashboard | Sim — reexecutado no QUAL-06 (leitura de saldos e histórico) — aprovado 2026-08-05 |
| F7 | CRUD usuários | pass — 05-UAT.md #2 | Nenhum usuário UAT-* é criado; sem impacto | Não |
| F8 | Itens + conversões + baixo estoque | pass — 05-UAT.md #3 | O setup controlado cria item `UAT-*` com saldo inicial e conversão (`pacote = 0.5 kg`), exercitando o mesmo fluxo | Sim — criação do item e da conversão no setup QUAL-06 — aprovado 2026-08-05 |
| F9 | Cardápio → Receitas → Planejamento | pass — 05-UAT.md #4 | O setup cria 4 pratos `UAT-*` com receitas e o planejamento do dia exercita o mesmo fluxo | Sim — criação de pratos/receitas no setup QUAL-06 — aprovado 2026-08-05 |
| F10 | Grade semanal + persistência após reload | pass — 05-UAT.md #5 | O planejamento QUAL-06 persiste por vigência; reload valida a persistência | Sim — reload após salvar o planejamento no setup — aprovado 2026-08-05 |
| F11 | Entrada manual com justificativa PNAE | pass — 05-UAT.md #6 | Nenhuma entrega é alterada no setup; sem impacto | Não |
| F12 | Upload XML NF-e + revisão humana | pass — 05-UAT.md #7 (validado manualmente 2026-08-03) | Nenhum XML é processado no setup; sem impacto | Não |

*Corroboração automatizada do perímetro: `test_publico.py` P1–P3 (3 passed) e `test_planejamento.py` (12 passed) em 2026-08-05.*

---

## 6. Fluxos cozinha/gestão F13–F15 (evidência histórica preservada)

Fonte primária: `.planning/phases/06-cozinha-gestao-frontend/06-UAT.md` (8/8 pass, validado em 2026-08-04) e `06-VALIDATION.md`. O dataset controlado afeta diretamente o fluxo de cozinha/gestão: a refeição QUAL-06 é confirmada por `cozinheira` e os saldos são lidos em seguida (T-07-02-03). **Todas as reexecuções abaixo foram aprovadas no aceite manual integral de 2026-08-05.**

| ID | Fluxo | Resultado histórico (fonte) | Impacto do dataset da Fase 07 | Reexecução |
|----|-------|-----------------------------|-------------------------------|------------|
| F13 | Planejamento do dia, escala por alunos e confirmação na cozinha | pass — 06-UAT.md #1–#4 | QUAL-06 abre o almoço planejado em `/cozinha`, escala receita e confirma com conversão — fluxo integralmente reexecutado | Sim — reexecutado no QUAL-06 (passos 2–3) — aprovado 2026-08-05 |
| F14 | Gestão com dados reais e conversão de estoque | pass — 06-UAT.md #6 | O saldo pós-refeição e o histórico são lidos em `/gestao` ou `/admin` no QUAL-06 | Sim — leitura de saldos no QUAL-06 — aprovado 2026-08-05 |
| F15 | Estados independentes e sessão expirada na gestão | pass — 06-UAT.md #7–#8 | Sem alteração de contratos; backstops de responsividade/teclado já cobertos na Fase 06 | Não (sem impacto) |

---

## 7. Fluxos públicos F16–F17 (backstops do UI-SPEC)

Cada estado tem linha própria de aceite e status (backstops manuais do `07-UI-SPEC.md`). Autoridade: `07-UI-SPEC.md` (A-SL-01). Navegador deslogado em `http://127.0.0.1:5173/cardapio`.

### F16 — Acesso e dados do dia

| Sub-check | Expected (contrato UI-SPEC) | Result | Status | Source/command evidence |
|-----------|------------------------------|--------|--------|--------------------------|
| F16.1 Acesso anônimo | `/cardapio` abre sem `ProtectedRoute`/login; cardápio carrega sem token | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT; P1/P2 pass automatizados (3 passed) |
| F16.2 Quatro slots e ordem fixa | Quatro cartões separados na ordem `Lanche da Manhã → Almoço → Lanche da Tarde → Janta`, independentemente da ordem da API | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT; `SLOTS_REFEICAO` como fonte única |
| F16.3 Slot/prato ausente → `A definir` | Slot omitido ou `nome_refeicao` nulo aparece como `A definir` (estado normal, não erro) | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT; P3 vazio pass (3 passed) |
| F16.4 Hierarquia prato-first | Nome do prato (heading serif) domina o rótulo do slot (label 12px) | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT (inspeção visual) |
| F16.5 Privacidade de ingredientes | Somente `item_nome`; nenhuma quantidade, medida, peso ou metadado de ficha técnica no DOM | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT (inspeção do DOM expandido; nenhum `quantidade`/`medida_caseira` no JSX) |
| F16.6 Prato sem receita (recipe-free/partial) | Prato retornado permanece visível; zero ingredientes mostra `Ingredientes não informados.` sem disclosure; ingrediente sem nome usa `Ingrediente não informado` | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT (cartão sem disclosure observado) |
| F16.7 Loading | Shell visível com `Carregando cardápio…`; nenhum cartão `A definir` antes do request assentar | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT (throttle de rede/recarga observado) |
| F16.8 Erro + retry | Mensagem exata `Não foi possível carregar o cardápio de hoje. Tente novamente.` em `role="alert"` + `Tentar novamente`; retry recupera; sem conteúdo stale/fabricado | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT (backend parado/reiniciado; retry observado) |
| F16.9 Vazio (resposta esparsa/vazia) | Heading `Nenhum cardápio planejado para hoje.` + body dos quatro momentos + quatro cartões `A definir` | Aprovado — aceite manual integral (browser deslogado, 2026-08-05) | pass | Aceite humano integral do UAT; P3 pass (3 passed) |
| F16.10 Disclosure por teclado + foco visível | Tab alcança `<summary>`; Enter/Space alterna; fechado = `Ver ingredientes`, aberto = `Ocultar ingredientes`, recolher retorna a `Ver ingredientes`; foco `:focus-visible` verde; estado compreensível sem cor | Aprovado — aceite manual integral (browser deslogado, 2026-08-05): teclado em cada transição — fechado `Ver ingredientes` → aberto `Ocultar ingredientes` → recolher retorna a `Ver ingredientes` | pass | Aceite humano integral do UAT (rótulos exatos e foco registrados pelo operador) |

### F17 — Responsividade e leitura pública

| Sub-check | Expected (contrato UI-SPEC) | Result | Status | Source/command evidence |
|-----------|------------------------------|--------|--------|--------------------------|
| F17.1 320px (mobile) | 1 coluna; sem scroll horizontal da página; nomes longos quebram (`overflow-wrap`), sem ellipsis/clipping; disclosure 44px | Aprovado — aceite manual integral (viewport 320px via DevTools, 2026-08-05) | pass | Aceite humano integral do UAT (disclosure aberto em 320px) |
| F17.2 768px (tablet) | 2 colunas; conteúdo legível; sem sobreposição | Aprovado — aceite manual integral (viewport 768px via DevTools, 2026-08-05) | pass | Aceite humano integral do UAT |
| F17.3 Desktop ≥960px | 4 colunas; respiro vertical; ordem preservada | Aprovado — aceite manual integral (viewport desktop, 2026-08-05) | pass | Aceite humano integral do UAT |
| F17.4 Wrapping e overflow | Nomes longos de prato/ingrediente com disclosure aberto não criam overflow horizontal nem perdem nomes em nenhum viewport | Aprovado — aceite manual integral (320px/768px/desktop, 2026-08-05) | pass | Aceite humano integral do UAT (nome longo UAT-* expandido em 320px) |

---

## 8. QUAL-06 — Conversão → baixa → refeição → auditoria (cenário controlado)

### 8.1 Dataset controlado (D-07-10; nomes únicos `UAT-*`; criado via UI admin)

| Registro | Valor controlado |
|----------|------------------|
| Item de estoque | `UAT-06-Arroz` — unidade oficial KG, saldo inicial **50 KG** |
| Conversão | `pacote = 0.5 kg` (fator 0.5) para `UAT-06-Arroz` |
| Pratos | 4 pratos `UAT-06-*` com tipos `Lanche`, `Almoço`, `Lanche`, `Janta` (vocabulário `TIPOS_REFEICAO_VALIDOS`) |
| Receitas | 1 ingrediente por prato; a receita do Almoço usa `UAT-06-Arroz` com quantidade/medida conhecidas |
| Planejamento | 4 slots do dia de hoje (`Lanche da Manhã`, `Almoço`, `Lanche da Tarde`, `Janta` — `SLOTS_PLANEJAMENTO`), `data_inicio_vigencia = hoje`; lanches apontam para pratos tipo `Lanche` |

Backup: `backend/merenda.db.bak-<data>` antes da execução (pré-condição 3). Reset/recriação do banco somente se documentado (A-SL-03).

### 8.2 Sequência de sucesso (QUAL-06.1)

| Passo | Ação | Campo a registrar |
|-------|------|-------------------|
| 1 | Ler saldo do item como admin (F6/F14 reexecutado) | `saldo_antes` = registrado no aceite manual (2026-08-05); valor exato não transcrito para o artefato |
| 2 | Conferir conversão visível à cozinheira (`GET /conversoes` read-only, 200) | conversão existente = `pacote → 0.5 kg` (registrada no setup) |
| 3 | Abrir o Almoço planejado em `/cozinha` (F13 reexecutado), informar nº de alunos e confirmar | `quantidade_enviada`, `medida_caseira`, `qtd_alunos` = registrados no aceite manual (2026-08-05) |
| 4 | Registrar a conversão aplicada | `fator_conversao` = 0.5 |
| 5 | Ler o saldo novamente | `saldo_depois` = registrado no aceite manual (2026-08-05); valor exato não transcrito para o artefato |
| 6 | Verificar a matemática | `antes − (quantidade_final × fator) = depois` — conferida no aceite (QUAL-06.1a) |
| 7 | Consultar histórico de refeições como admin | `quantidade_original`, `quantidade_ajustada`, `medida_caseira`, `justificativa` persistidos (ajuste, se houver, com justificativa gravada) — conferidos no aceite (QUAL-06.1b) |

| Verificação | Expected | Result | Status | Source/command evidence |
|-------------|----------|--------|--------|--------------------------|
| QUAL-06.1a Conversão e baixa | Saldo decresce exatamente `quantidade_final × fator`; fórmula bate | Aprovado — aceite manual integral (2026-08-05): saldo decresceu conforme a fórmula e a conferência bateu | pass | Aceite humano integral do UAT; corroboração `test_r1_conversao_aplicada_estoque_deduzido` pass (17 passed em test_refeicoes.py) |
| QUAL-06.1b Auditoria persistida | Histórico contém `quantidade_original`/`quantidade_ajustada`/`medida_caseira`/`justificativa` | Aprovado — aceite manual integral (2026-08-05): campos de auditoria persistidos no histórico | pass | Aceite humano integral do UAT; corroboração `test_r9_ajuste_sem_justificativa`/`test_r10_conforme_receita_sem_justificativa` pass |

### 8.3 Falhas atômicas (QUAL-06.2 e QUAL-06.3) — sem alteração parcial

| Falha | Passos | Expected | Result | Status | Source/command evidence |
|-------|--------|----------|--------|--------|--------------------------|
| QUAL-06.2 Conversão ausente | Tentar confirmar refeição com item sem conversão cadastrada (ou medida sem conversão) | 400 com orientação; **saldo inalterado**; **histórico sem registro novo** | Aprovado — aceite manual integral (2026-08-05): 400 com orientação; saldo e histórico sem alteração | pass | Aceite humano integral do UAT; corroboração `test_r3_medida_sem_conversao` pass |
| QUAL-06.3 Estoque insuficiente | Tentar confirmar refeição com quantidade convertida maior que o saldo | 400 `insuficiente`; **saldo não negativo/inalterado**; **histórico sem registro novo** | Aprovado — aceite manual integral (2026-08-05): 400 `insuficiente`; saldo não negativo e histórico sem registro novo | pass | Aceite humano integral do UAT; corroboração `test_r6_estoque_insuficiente` pass |

*Corroboração automatizada do encadeamento (executada em 2026-08-05): `pytest tests/test_publico.py tests/test_planejamento.py tests/test_refeicoes.py -q` → **32 passed** (test_refeicoes.py 17: R1 conversão+baixa, R2/R9/R10 auditoria e justificativa, R3 conversão ausente, R6 estoque insuficiente, R11/R12/R13 sem campos livres/negativos, R15 envelope limpo).*

---

## 9. Resumo e regra de aprovação

| Grupo | Linhas | Status |
|-------|--------|--------|
| F1–F5 (reconstruídos) | 5 | pass — evidência fresca aprovada no aceite manual integral (2026-08-05) |
| F6–F12 (históricos) | 7 | pass preservado (05-UAT.md); reexecuções F6/F8/F9/F10 aprovadas no QUAL-06 |
| F13–F15 (históricos) | 3 | pass preservado (06-UAT.md); reexecuções F13/F14 aprovadas no QUAL-06 |
| F16–F17 (públicos) | 2 (14 sub-checks) | pass — todos os backstops e viewports aprovados |
| QUAL-06 | 3 verificações | pass — cenário controlado aprovado (sucesso + 2 falhas atômicas) |
| Gates automatizados | 7 | 7 pass (inclui suite completa e gate combinado de sign-off) |

**Aprovação:** concedida pelo usuário em 2026-08-05 — aceite manual integral ("teste de UAT fully approved") com todos os gates verdes e todas as linhas F1–F17 e QUAL-06 em `pass`. Evidências numéricas específicas (saldos exatos, quantidades) foram registradas pelo operador no navegador/banco e não são transcritas para o artefato; o status `pass` reflete a aprovação integral observada, sem invenção de valores (T-07-02-02). `07-VALIDATION.md` foi atualizado para `nyquist_compliant: true`, `status: approved` e `Approval: approved`.
