---
phase: 08-improvements
verified: 2026-08-05T17:30:00Z
status: human_needed
score: 47/47 must-haves verified (7 roadmap truths + 40 plan truths)
overrides_applied: 0
human_verification:
  - test: "WR-02 fallback branch: lançar refeição ligada a um planejamento cujo ingrediente tem medida_caseira SEM conversão cadastrada em /conversoes, enviando quantidade na medida caseira sem justificativa"
    expected: "Comparação cai no caminho cru histórico (divergente = |esperado - enviado| > 1e-9) sem exceção não tratada; auditoria grava quantidade_original crua e a mensagem de erro (se divergente) usa a medida da receita — fluxo documentado em main.py:1385-1389 e marcado pelo fix WR-02 como 'requires human verification'"
    why_human: "Lógica condicional de decisão de divergência (conversão da medida da receita pode falhar/recuar para comparação crua) — R20 cobre o caminho principal, não o fallback"
  - test: "Fluxo F12 regressão: Entregas — criar entrega manual com fornecedor existente (autocomplete) e com fornecedor novo (modal inline), observações obrigatórias, ação apenas 'recebido'"
    expected: "Form envia payload completo; entrega manual sem observações bloqueada; rascunho preservado ao abrir/fechar modal inline de fornecedor"
    why_human: "Interação de modal + autocomplete com teclado/clique exige browser (sem Playwright — TESTING.md manual)"
  - test: "Fluxo XML + cadastro inline: upload de NF com item não reconhecido, escolher 'Cadastrar novo item', preencher o modal, salvar e verificar vínculo à linha com rascunho preservado"
    expected: "Item criado via POST /itens/inline, linha vinculada, demais linhas/XML/fornecedor/data intactos; sugestões top-3 com motivo exibidas nas linhas sem correspondência; escolher sugestão não altera descricaoNf"
    why_human: "Fluxo de usuário ponta a ponta na UI (D-11/D-12/D-22/D-23)"
  - test: "Fluxo F13 revisado: PainelCozinha — sem campo 'Quantos alunos foram atendidos?', receita escala pelo total do slot, lançamento avulso por um dos 4 slots, config ausente exibe estado explícito"
    expected: "Payload {slot, planejamento_id, itens} sem qtd_alunos/tipo_refeicao; mensagem de sucesso 'Refeição servida a N alunos!'; bloqueio por estoque insuficiente mantido"
    why_human: "Regressão do fluxo validado na Fase 6, agora com contrato revisado (MEAL-02/D-16/D-16b)"
  - test: "Projeção na página Planejamento: badge por célula com tooltip, painel colapsável 'Projeção da semana', banner pós-save com 'Ver projeção' (admin e secretaria); cozinheira sem acesso; config vazia mostra mensagem de ativação"
    expected: "Badge em dia correto mesmo com dia sem consumo no meio da semana (WR-01); painel com ruptura em vermelho/sobra em verde/não avaliável; salvar nunca bloqueia"
    why_human: "Comportamento visual e de scroll/abertura do painel exige browser; grade com dia ocioso precisa de dados reais"
  - test: "Página /admin/alunos: admin configura manhã/tarde/noite; secretaria e cozinheira não acessam a rota; 404 inicial exibe 'Configure os alunos por período para ativar a projeção.'"
    expected: "PUT salva com auditoria updated_at/updated_by; acesso negado para não-admin"
    why_human: "Controle de acesso por rota e estados de UI exigem login manual com os 3 perfis"
gaps: []
---

# Phase 8: Improvements Verification Report

**Phase Goal:** Reduzir alertas de estoque inadequados, evitar interrupcao no recebimento de itens novos, diminuir duplicidades causadas por nomes de fornecedores e ajustar os fluxos operacionais de entregas e refeicoes as regras reais da escola.
**Verified:** 2026-08-05T17:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification (no previous VERIFICATION.md existed for phase 08)

## Goal Achievement

### Observable Truths (Roadmap Success Criteria — 7/7)

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Cada item tem limiar próprio com fallback de 5 e alertas na unidade de exibição | ✓ VERIFIED | `models.Item.limiar` NOT NULL default 5.0 (models.py:44); `migracao.py` ALTER TABLE backfill; 400 para ≤ 0 em POST/PUT /itens (main.py:202,270); dashboard/Itens.tsx/DashboardGestao.tsx comparam `saldo/fator < limiar`; `LIMIAR_BAIXO_ESTOQUE` removido (grep frontend+backend = 0); testes D5/D6 + test_itens |
| 2   | Item XML não reconhecido é cadastrado no fluxo de Entregas e vinculado à linha sem perder o rascunho | ✓ VERIFIED | `__novo__` no select de linha (Entregas.tsx:1260-1278); modal 'Cadastrar novo item' com nome/unidade/KG-L/fator/limiar; `POST /itens/inline` (main.py:244-255, admin+secretaria); vínculo via setLinhas com spread preservando rascunho; POST /itens permanece admin-only |
| 3   | Nomes de fornecedores normalizados com sugestões explicáveis, sem associação automática | ✓ VERIFIED | `matching.ts`: normalizar/tokenizar/ABREVIACOES (27 entradas)/similaridade com motivo/`sugerirCandidatos` top-3 com confiança; autocomplete em Entregas.tsx:215-216; sugestões por linha XML (1234-1238); nenhum fetch/POST automático no módulo; seleção sempre explícita (D-22) |
| 4   | Toda entrega tem origem/data/fornecedor; manual exige observações, XML exige nota + justificativa por item | ✓ VERIFIED | `EntregaCreate` exige origem/data_entrega/fornecedor_id (schemas.py:156-162); regras por origem no handler (main.py:1021-1047); manual só 'recebido' + justificativa None (main.py:1111); XML exige nota_numero e justificativa para alterado/excluído; fornecedor inexistente → 404; testes E14-E18; CR-01 `Field(ge=0)` (schemas.py:149) + E19 |
| 5   | Admin configura alunos por período; cozinheira lança sem digitar alunos; receita escala pelo total do slot | ✓ VERIFIED | PUT /alunos-por-periodo admin-only com auditoria (main.py:1259-1289); `_total_por_slot` D-15 (manha/manha+tarde/tarde/noite); POST /refeicoes por `{slot, planejamento_id, itens}` com derivação de tipo e qtd_alunos (main.py:1320-1429); PainelCozinha sem campo de alunos (grep qtdAlunos = 0), total exibido por totalDoSlot; payloads tipados RefeicaoCreatePayload; testes R16-R19 |
| 6   | Planejamento avisa (não bloqueia) com projeção cumulativa; lançamento continua bloqueando | ✓ VERIFIED | GET /planejamento/projecao admin+secretaria, cozinheira 403 (main.py:852-867); `_simular_semana` cumulativo dia a dia com `primeiro_dia_ruptura` e 'não avaliável' (D-17); POST /planejamento retorna `avisos` aditivos sem bloquear (main.py:870-919); lançamento bloqueia em `saldo_atual < qtd_oficial` (main.py:1365-1369); Planejamento.tsx badge (lookup por dia_semana — WR-01), painel `<details>` e banner role="status" com 'Ver projeção' |
| 7   | Fluxos existentes de entrega, auditoria, conversão e baixa permanecem íntegros | ✓ VERIFIED | Suíte backend **140 passed** executada nesta verificação (inclui E1-E13, R1-R15 originais + E9b/E14-E19/R16-R20); `npm run build` (typecheck) e `npm run lint` verdes nesta verificação; E9b prova fallback legado `data_entrega→data_hora` (WR-03); R20 prova comparação em unidade única (WR-02) |

**Score:** 7/7 roadmap truths verified — plus 40/40 plan-level must-haves verified (see below)

### Plan Must-Haves (40/40)

| Plan | Truths | Status |
| ---- | ------ | ------ |
| 08-01 | limiar NOT NULL default 5.0 (modelos+schemas+serialização); entrega origem/data_entrega/fornecedor + migração legada `data_entrega=date(data_hora)`; fornecedores via GET/POST API (admin+secretaria, 400 nome vazio, 403 cozinheira); types.ts espelhado; `migrar(engine)` após create_all (main.py:16-18); migração idempotente (2ª execução sem efeito) | ✓ 4/4 |
| 08-02 | 400 para limiar ≤ 0 em POST/PUT /itens; todas as superfícies (Itens.tsx badge, /admin/dashboard itens_criticos, DashboardGestao.tsx) usam item.limiar na unidade de exibição; LIMIAR_BAIXO_ESTOQUE eliminada; default 5.0 (D-01/D-03/D-04) | ✓ 4/4 |
| 08-03 | manual exige observações + apenas 'recebido' (justificativa None); xml exige nota_numero + justificativa por item; fornecedor existente exigido (404); POST /itens/inline admin+secretaria com validações compartilhadas, POST /itens admin-only (D-07/D-05/D-13) | ✓ 4/4 |
| 08-04 | normalizador determinístico (caixa/acentos/pontuação/espaços/tokens); score explicável + ABREVIACOES; sugerirCandidatos com confiança/motivo sem vincular; zero escrita de aliases (D-21/D-22/D-24) | ✓ 4/4 |
| 08-05 | form envia origem/data_entrega/fornecedor_id/observacoes/nota_numero; prefill XML (dhEmi→data_entrega, emitente confirmável ≥0.6, nNF); autocomplete + modal inline de fornecedor; manual só 'recebido' (payload força acao/justificativa null); rascunho preservado nos modais (D-05/07/08/09/12) | ✓ 5/5 |
| 08-06 | opção 'Cadastrar novo item' só em linhas XML sem itemId; modal espelha form de Itens (unidade livre, KG/L, fator, limiar default 5.0); vínculo à linha com rascunho preservado; sugestões top-3 com motivo; descricaoNf/unidadeNf nunca alterados (D-11/12/22/23) | ✓ 5/5 |
| 08-07 | GET (3 perfis)/PUT (admin-only) /alunos-por-periodo com auditoria; totais por slot D-15; POST /refeicoes por slot deriva tipo+qtd_alunos, bloqueio de estoque mantido; GET /planejamento/projecao cumulativo com configurado:false e 'não avaliável'; POST /planejamento com avisos aditivos sem bloquear (D-14..D-18) | ✓ 5/5 |
| 08-08 | página /admin/alunos admin-only (rota + nav + ProtectedRoute); PainelCozinha sem campo de alunos, escala por totalDoSlot; lançamento avulso por 4 slots com payload {slot, planejamento_id: null, itens}; config ausente = estado explícito (mensagens em PainelCozinha:424/737/809 e Alunos.tsx:104) | ✓ 4/4 |
| 08-09 | badge por célula com tooltip por item (lookup dia_semana — WR-01 corrigido); painel colapsável 'Projeção da semana' (item/saldo/consumo/projetado/1º ruptura, cores token); banner não-bloqueante role="status" com 'Ver projeção'; config vazia → mensagem sem quebrar grade; secretaria vê (rota admin+secretaria), cozinheira 403 (main.py:856) | ✓ 5/5 |

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `backend/models.py` | Item.limiar; Entrega origem/data_entrega/fornecedor_id/nota_numero/observacoes; Fornecedor; AlunosPorPeriodo | ✓ VERIFIED | Linhas 44, 47-58, 121-133 |
| `backend/migracao.py` | Migração idempotente sem Alembic com backfill | ✓ VERIFIED | `migrar()` com inspect + ALTER TABLE literais fixos; verificado no dev `merenda.db` (colunas presentes; tabelas fornecedores/alunos_por_periodo criadas) |
| `backend/schemas.py` | FornecedorCreate/Response; EntregaCreate; ItemCreate/Update/Response com limiar; AlunosPorPeriodoUpdate; RefeicaoCreate {slot,...}; EntregaItemRequest ge=0 | ✓ VERIFIED | Linhas 43-70, 145-214 |
| `backend/main.py` | Regras por origem; /itens/inline; fornecedores; alunos-por-periodo; refeições por slot; projecao; avisos; dashboard por limiar | ✓ VERIFIED | Endpoints 244/415/852/1007/1237/1259/1320/1506 |
| `backend/tests/*` | 140 testes cobrindo E*, F*, R*, D*, projeção | ✓ VERIFIED | 140 passed (48.5s) nesta verificação; novos E9b/E14-E19/F1-F5/R16-R20/D5/D6 |
| `frontend/src/types.ts` | Fornecedor, OrigemEntrega, EntregaCreatePayload, Item.limiar, AlunosPorPeriodo, RefeicaoCreatePayload, ProjecaoSemana/Dia/Item/Ruptura, PlanejamentoAviso | ✓ VERIFIED | Linhas 48-133, 154-197, 250-260 |
| `frontend/src/pages/admin/matching.ts` | normalizar, ABREVIACOES, similaridade, sugerirCandidatos | ✓ VERIFIED | Exports 17-148; módulo puro TS sem rede |
| `frontend/src/pages/admin/Entregas.tsx` | origem/data/fornecedor/obs/nota; autocomplete; modais inline fornecedor+item; sugestões; regras por origem | ✓ VERIFIED | 3 níveis + dados fluem de `/fornecedores`, `/itens`, `/itens/inline`, `sugerirCandidatos` |
| `frontend/src/pages/admin/Alunos.tsx` | Config 3 períodos com estados explícitos | ✓ VERIFIED | GET/PUT /alunos-por-periodo (linhas 25/70) |
| `frontend/src/pages/PainelCozinha.tsx` | Sem digitação de alunos; escala por slot; avulso por 4 slots | ✓ VERIFIED | totalPorSlot (166-170); payloads {slot, planejamento_id, itens} (432-440, 489-497) |
| `frontend/src/pages/admin/Planejamento.tsx` | badge, painel, banner | ✓ VERIFIED | WR-01 lookup (359-361); details (437); banner (413-431) |
| `frontend/src/pages/admin/Itens.tsx` / `DashboardGestao.tsx` | Campo limiar + badge; copy dinâmica por item.limiar | ✓ VERIFIED | Itens.tsx:486-492/326/340; DashboardGestao.tsx:190/241/253 |
| `frontend/src/App.tsx` + `Layout.tsx` | Rota /admin/alunos admin-only; nav por perfil | ✓ VERIFIED | App.tsx:60-64; Layout.tsx:18-36 |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `backend/main.py` | `backend/migracao.py` | `migrar(engine)` após create_all (main.py:16-18) | WIRED | Verificado no código + dev DB migrado |
| `Entregas.tsx` | `api.ts` | `fetchJson<Fornecedor[]>('/fornecedores')` (152); `POST /fornecedores` modal inline; `POST /itens/inline` (404) | WIRED | Resposta usada em setFornecedores/vinculação |
| `Entregas.tsx` | `matching.ts` | `sugerirCandidatos` no autocomplete (216) e linhas XML (1238) | WIRED | Top-3 com motivo, render condicional |
| `nfe.ts` | `Entregas.tsx` | `NfeParseResult.dataEmissao` (73-79) preenche data_entrega | WIRED | dhEmi validada; campo editável |
| `main.py` | `models.py` | `AlunosPorPeriodo` em `_total_por_slot` (1220) | WIRED | 400 se config ausente no lançamento |
| `main.py` | `main.py` | `_converter_para_unidade_oficial` reutilizada na projeção (698) e no WR-02 (1382) | WIRED | Item sem conversão → 'não avaliável' |
| `PainelCozinha.tsx` | `api.ts` | `fetchJson<AlunosPorPeriodo>('/alunos-por-periodo')` (152) | WIRED | Leitura cozinheira; null → estado explícito |
| `Planejamento.tsx` | `api.ts` | `fetchJson<ProjecaoSemana>('/planejamento/projecao?data=...')` | WIRED | Falha isolada (não derruba a grade) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Planejamento.tsx badge/painel | `projecao` | GET /planejamento/projecao → `_simular_semana` → `_converter_para_unidade_oficial` + `_total_por_slot` + tabela `conversoes` | ✓ Sim — simulação dia a dia sobre saldos reais | ✓ FLOWING |
| PainelCozinha total | `alunosConfig` | GET /alunos-por-periodo → tabela `alunos_por_periodo` | ✓ Sim — PUT admin persiste | ✓ FLOWING |
| Entregas.tsx sugestões | `sugestoesFornecedor`/`sugestoesLinha` | matching.ts sobre GET /fornecedores e /itens | ✓ Sim — dados reais do catálogo | ✓ FLOWING |
| Entregas.tsx payload | `payload` | campos do form → POST /entregas | ✓ Sim — persistido com origem/data/fornecedor | ✓ FLOWING |
| Itens.tsx badge | `item.limiar` | GET /itens → `ItemResponse.limiar` | ✓ Sim — default 5.0 persistido | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Suíte backend completa | `venv/bin/python -m pytest tests/ -q` (backend/) | **140 passed**, 3 warnings pré-existentes | ✓ PASS |
| Build frontend (typecheck) | `npm run build` (frontend/) | ✓ built (js/css gerados) | ✓ PASS |
| Lint frontend | `npm run lint` (frontend/) | 0 issues | ✓ PASS |
| Constante global removida | grep `LIMIAR_BAIXO_ESTOQUE` frontend/src + backend/main.py | 0 ocorrências | ✓ PASS |
| Migração aplicada no dev DB | sqlite3 `PRAGMA table_info(entregas/itens)` | 5 colunas novas em entregas + limiar em itens; tabelas fornecedores/alunos_por_periodo existem | ✓ PASS |
| Anti-padrões (TODO/FIXME/placeholder/stub) | grep em 12 arquivos-chave | 0 ocorrências | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| IMP-01 | 08-02 | Limiar individual com default 5.0 | ✓ SATISFIED | models.py:44; main.py:202/270; testes D5/D6/test_itens |
| IMP-02 | 08-02 | Listagens/dashboard/alertas pelo limiar na unidade de exibição; inválidos rejeitados | ✓ SATISFIED | main.py:1513-1526; Itens.tsx:326/340; DashboardGestao.tsx:190/253; 400 handler |
| IMP-03 | 08-03, 08-06 | Cadastro inline de item no fluxo de Entregas sem perder rascunho | ✓ SATISFIED | Entregas.tsx:1260-1278/1674+; main.py:244-255 |
| IMP-04 | 08-04, 08-05, 08-06 | Normalização + sugestões com confirmação humana | ✓ SATISFIED | matching.ts:17-148; seleção explícita (D-22) |
| IMP-05 | 08-04, 08-06 | Sugestões ambíguas com motivo/confiança; zero fusão silenciosa | ✓ SATISFIED | similaridade() motivo PT-BR; sugerirCandidatos top-3 |
| IMP-06 | 08-01, 08-03, 08-05 | Toda entrega com origem/data/fornecedor; xml nota obrigatória | ✓ SATISFIED | schemas.py:156-162; main.py:1021-1047; testes E14-E18 |
| IMP-07 | 08-01, 08-05 | Tabela fornecedores; escolher existente ou cadastrar inline (admin+secretaria) | ✓ SATISFIED | models.py:47-53; main.py:415-443; autocomplete+modal |
| IMP-08 | 08-03, 08-05 | Manual exige observações; justificativa só alterado/excluído XML | ✓ SATISFIED | main.py:1033-1047; testes E14/E16 |
| IMP-09 | 08-07, 08-08 | Admin configura alunos por período; slot derivado; receita escala | ✓ SATISFIED | main.py:1212-1227; Alunos.tsx; PainelCozinha.tsx:166-170 |
| IMP-10 | 08-07, 08-08 | qtd_alunos derivado sem digitação; dedução + bloqueio mantidos | ✓ SATISFIED | main.py:1338/1365-1369/1410; payload sem qtd_alunos |
| IMP-11 | 08-07, 08-09 | Planejamento não bloqueia; projeção cumulativa com avisos | ✓ SATISFIED | main.py:708-834/852-919; Planejamento.tsx badge/painel/banner |
| DELIV-05 (revisado) | 08-01, 08-03 | Justificativa por item só em entregas XML | ✓ SATISFIED | main.py:1057-1066; E8 revisado |
| DELIV-06 (revisado) | 08-01, 08-03 | Item registra ação/qtd/justificativa/fator; manual registra descrição no nível da entrega | ✓ SATISFIED | main.py:1089-1113 (observacoes nível entrega; justificativa None manual) |
| MEAL-02 (revisado) | 08-07, 08-08 | Lançamento registra tipo/qtd_alunos derivados da config; cozinheira não informa quantidade | ✓ SATISFIED | schemas.py:207-214 extra="forbid"; main.py:1332-1338; R16-R19 |

**Orphaned requirements:** Nenhum — todos os IDs declarados em ROADMAP/REQUIREMENTS para a Fase 8 (IMP-01..IMP-11, DELIV-05, DELIV-06, MEAL-02) aparecem em planos e foram verificados.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | Nenhum (grep TODO/FIXME/placeholder/`return null` em stubs vazios) | — | — |

### Review Round (CR-01, WR-01..WR-04) — verificação das correções

| Finding | Fix verificado | Regressão |
| ------- | -------------- | --------- |
| CR-01 quantidade negativa | `EntregaItemRequest.quantidade: float = Field(ge=0)` (schemas.py:149) | E19 (422, saldo inalterado) ✓ |
| WR-01 badge desalinhado | lookup `projecao.dias.find(d => d.dia_semana === diaIdx)` (Planejamento.tsx:359-361) | build/lint ✓ |
| WR-02 comparação em medidas mistas | comparação sempre em kg/L + `quantidade_original` na medida enviada; fallback cru documentado (main.py:1372-1396) | R20 ✓; **fallback exige verificação humana** |
| WR-03 filtro por data_hora | `func.date(func.coalesce(data_entrega, data_hora))` (main.py:1131-1133) | E9 + E9b (fallback legado) ✓ |
| WR-04 erro XML silencioso | `erroSubmit` renderizado no modal `fluxo === 'escolha'` (Entregas.tsx:1015-1017) | lint ✓ |
| Info IN-01..IN-07 | Fora do escopo do round (info) — IN-02 (data_entrega nullable) é inerte na UI atual (DashboardGestao renderiza data_hora, não data_entrega); IN-04/IN-07 consistentes com D-24 (aliases adiados) | não bloqueante |

### Human Verification Required

1. **Fallback do WR-02 (auditoria de refeição com medida de receita sem conversão)** — Teste: lançar refeição planejada cujo ingrediente tem `medida_caseira` da receita sem entrada em `/conversoes`. Esperado: comparação crua histórica sem exceção não tratada, auditoria consistente. Por que humano: lógica condicional de decisão de divergência — R20 cobre apenas o caminho principal.
2. **Fluxo F12 (Entregas manual)** — fornecedor por autocomplete, cadastro inline de fornecedor, observações obrigatórias, ação apenas recebido, rascunho preservado nos modais.
3. **Fluxo XML + cadastro inline de item** — NF com item não reconhecido → 'Cadastrar novo item' → vínculo à linha → submit completo; sugestões top-3 com motivo; descrição original preservada.
4. **Fluxo F13 revisado (PainelCozinha)** — lançamento por slot sem digitar alunos, avulso por 4 slots, mensagem 'Refeição servida a N alunos!', bloqueio por estoque, config ausente com estado explícito.
5. **Projeção na UI (Planejamento)** — badge por célula (dias com/sem consumo), painel colapsável com cores, banner pós-save e 'Ver projeção', visibilidade admin/secretaria, cozinheira bloqueada.
6. **Página /admin/alunos** — acesso admin-only, estados 404/erro/sucesso, auditoria updated_at.

### Gaps Summary

Nenhuma lacuna de implementação bloqueante. As 7 metas do roadmap e os 40 must-haves dos 9 planos estão verificados no código com evidência de nível 4 (dados fluindo de fontes reais), suíte backend de 140 testes executada nesta verificação (verde), build + lint frontend executados (verdes) e as 5 correções do round de revisão (CR-01 + WR-01..WR-04) confirmadas no código com testes de regressão (E19, E9b, R20). A fase deixa 6 itens de verificação humana: o fallback do WR-02 (marcado pelo próprio fix como "requires human verification") e 5 fluxos de UI que o projeto testa manualmente (padrão UAT F12/F13 — sem Playwright). Status `human_needed` até a conclusão dessas verificações manuais no browser.

---

_Verified: 2026-08-05T17:30:00Z_
_Verifier: OpenCode (gsd-verifier)_
