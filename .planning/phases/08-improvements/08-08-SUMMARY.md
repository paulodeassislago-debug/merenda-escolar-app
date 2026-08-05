---
phase: 08-improvements
plan: 08
subsystem: ui
tags: [react, typescript, fetchjson, painelcozinha, alunos-por-periodo]

# Dependency graph
requires:
  - phase: 08-07
    provides: "GET/PUT /alunos-por-periodo (admin configura, cozinheira lê) e POST /refeicoes com payload {slot, planejamento_id?, itens} — tipo e qtd_alunos derivados no backend"
provides:
  - "Página admin /admin/alunos com 3 campos (Manhã/Tarde/Noite), GET na abertura, PUT no salvar, estados de vazio (404)/erro/sucesso e rota protegida admin-only (T-08-14)"
  - "PainelCozinha sem campo de alunos digitados: receita escala pelo total do slot derivado da configuração (D-15/D-16), estado explícito quando a config falta (D-19)"
  - "Lançamento avulso por um dos 4 slots (D-16b) com payload {slot, planejamento_id: null, itens}; qtd_alunos/tipo_refeicao nunca enviados pelo cliente (T-08-11)"
  - "types.ts: AlunosPorPeriodo, RefeicaoCreatePayload e RefeicaoItemRequest espelhando os schemas do backend"
affects: [08-09, 08-VALIDATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Payload de lançamento tipado com RefeicaoCreatePayload (satisfies do contrato: sem qtd_alunos/tipo_refeicao)"
    - "Total do slot derivado no frontend com totalPorSlot espelhando D-15 (backend é a autoridade; UI apenas exibe)"
    - "Config ausente = estado explícito na UI (mensagem de ativação) em vez de crash (D-19)"

key-files:
  created:
    - frontend/src/pages/admin/Alunos.tsx
    - frontend/src/pages/admin/Alunos.css
  modified:
    - frontend/src/App.tsx
    - frontend/src/components/Layout.tsx
    - frontend/src/types.ts
    - frontend/src/pages/PainelCozinha.tsx
    - frontend/src/pages/PainelCozinha.css

key-decisions:
  - "Submit do PainelCozinha passou ao payload {slot, planejamento_id, itens} já na task 2 (não na task 3 como o plano dividia): remover o estado qtdAlunos tornava o corpo antigo impossível de compilar, e o backend 08-07 rejeita tipo_refeicao/qtd_alunos com extra=forbid — commit intermediário quebrado não seria aceitável (Rule 1/3)"
  - "Config de alunos com falha de leitura (404 ou erro de rede) → alunosConfig = null, mesmo estado explícito"
  - "Lançamento avulso abre o mesmo modal do editor (padrão de diálogo com foco/Escape), sem receita-base: ingredientes adicionados manualmente com a regra de justificativa atual"

patterns-established:
  - "Bloco compartilhado de ingredientes (controlesIngredientes) reutilizado entre editor planejado e lançamento avulso"
  - "Rota admin nova segue o padrão ProtectedRoute perfis={['admin']} + Layout + item de navegação em Layout.tsx"

requirements-completed: [IMP-09, IMP-10, MEAL-02]

# Metrics
duration: 25min
completed: 2026-08-05
---

# Phase 8 Plan 8: Página admin de alunos por período + PainelCozinha sem digitação de alunos

**Admin configura alunos por período (manhã/tarde/noite) em página própria protegida; a cozinheira lança refeições planejadas e avulsas sem digitar alunos — a receita escala pelo total do slot derivado da configuração e o payload virou {slot, planejamento_id, itens}**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-05T15:06:00Z
- **Completed:** 2026-08-05T15:31:23Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Página `/admin/alunos` (rota admin-only) com 3 campos numéricos, GET na abertura, PUT no salvar, `updated_at` legível e estados explícitos: 404 → `Configure os alunos por período para ativar a projeção.`, 401 → sessão expirada, sucesso → `Configuração salva.`
- PainelCozinha sem o campo "Quantos alunos foram atendidos?": a receita carrega automaticamente com o total do slot (Lanche da Manhã=manha, Almoço=manha+tarde, Lanche da Tarde=tarde, Janta=noite — D-15); config ausente → mensagem explícita e carregamento desabilitado (D-19)
- Lançamento avulso por um dos 4 slots (`SLOTS_REFEICAO.map`): seleção abre o modal com o fluxo de itens manuais e submit `{slot, planejamento_id: null, itens}`; mensagem de sucesso do backend (`Refeição servida a N alunos!...`) exibida (D-16b)
- Payload de lançamento tipado como `RefeicaoCreatePayload` — `qtd_alunos` e `tipo_refeicao` nunca saem do cliente (T-08-11); backend deriva tipo e total

## task Commits

Each task was committed atomically:

1. **task 1: Página admin Alunos.tsx com rota /admin/alunos** - `89c341c` (feat)
2. **task 2: PainelCozinha — remover input de alunos e escalar pela configuração** - `48482b8` (feat)
3. **task 3: Lançamento avulso por slot e payload RefeicaoCreate revisado** - `b915607` (feat)

**Plan metadata:** commit da SUMMARY em andamento (docs: complete plan)

## Files Created/Modified
- `frontend/src/pages/admin/Alunos.tsx` - Página de configuração (3 campos, GET/PUT `/alunos-por-periodo`, estados 404/401/erro/sucesso, `Atualizado em {data pt-BR}`)
- `frontend/src/pages/admin/Alunos.css` - Estilos co-localizados (tokens: card, form-grid 3 colunas, avisos, botão primário)
- `frontend/src/App.tsx` - Rota `/admin/alunos` com `ProtectedRoute perfis={['admin']}` + Layout
- `frontend/src/components/Layout.tsx` - Item de navegação "Alunos" no menu do admin
- `frontend/src/types.ts` - `AlunosPorPeriodo`, `RefeicaoItemRequest` e `RefeicaoCreatePayload`
- `frontend/src/pages/PainelCozinha.tsx` - `alunosConfig` + `totalPorSlot` (D-15), auto-carga da receita, seção "Lançamento avulso", modal compartilhado (planejado/avulso), submits tipados
- `frontend/src/pages/PainelCozinha.css` - Estilos da seção avulsa e do select de período

## Decisions Made
- Payload novo aplicado na task 2 em vez da divisão do plano (task 3) — ver deviation 2
- Falha de leitura da config (404 ou rede) trata como config ausente → mesmo estado explícito
- Avulso reutiliza o modal do editor (acessibilidade/foco/escape) com o bloco de ingredientes compartilhado

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Item de navegação "Alunos" adicionado ao Layout admin**
- **Found during:** task 1 (Página admin Alunos.tsx com rota)
- **Issue:** O plano listava apenas `Alunos.tsx`, `Alunos.css` e `App.tsx` — sem o item de nav, a página nova ficaria acessível só por URL digitada
- **Fix:** Adicionado `{ para: '/admin/alunos', rotulo: 'Alunos' }` em `NAV_POR_PERFIL` do admin
- **Files modified:** `frontend/src/components/Layout.tsx`
- **Verification:** build + lint verdes; rota e menu consistentes
- **Committed in:** `89c341c` (task 1 commit)

**2. [Rule 1/3 - Bug/Blocking] Payload {slot, planejamento_id, itens} aplicado na task 2, não na task 3**
- **Found during:** task 2 (remoção do estado `qtdAlunos`)
- **Issue:** Remover `qtdAlunos` tornava o corpo antigo (`qtd_alunos: qtdAlunos`) impossível de compilar; manter `tipo_refeicao`/`qtd_alunos` no body quebraria o POST /refeicoes do 08-07 (`extra="forbid"` → 422). O plano dividia a troca do payload para a task 3, o que deixaria um commit intermediário com o fluxo quebrado
- **Fix:** O submit planejado já envia `{slot, planejamento_id, itens}` no commit da task 2; a task 3 acrescentou o fluxo avulso e o tipo `RefeicaoCreatePayload` nos dois submits
- **Files modified:** `frontend/src/pages/PainelCozinha.tsx`
- **Verification:** grep `qtd_alunos` → 0; `tipo_refeicao` apenas como leitura do campo do planejamento (nunca como chave do payload); build + lint verdes
- **Committed in:** `48482b8` (task 2 commit)

**3. [Rule 3 - Blocking] Tipos RefeicaoItemRequest/RefeicaoCreatePayload adicionados a types.ts**
- **Found during:** task 3 (payload RefeicaoCreate revisado)
- **Issue:** O plano exigia `RefeicaoCreatePayload` com `itens: RefeicaoItemRequest[]`, mas `RefeicaoItemRequest` não existia em types.ts (o payload era montado inline)
- **Fix:** Criados os dois tipos espelhando o schema do backend (`slot: string; planejamento_id?: number | null; itens: RefeicaoItemRequest[]`) e os submits tipados
- **Files modified:** `frontend/src/types.ts`, `frontend/src/pages/PainelCozinha.tsx`
- **Verification:** build (tsc) + lint verdes
- **Committed in:** `b915607` (task 3 commit)

**4. [Rule 2 - Missing] Estilos co-localizados da seção de lançamento avulso em PainelCozinha.css**
- **Found during:** task 3 (seção "Lançamento avulso")
- **Issue:** O plano listava apenas `PainelCozinha.tsx` e `types.ts`; a nova seção precisava de estilos próprios (card, select de período, mensagem de sucesso)
- **Fix:** Classes `.avulso-secao`, `.avulso-controles` e ajustes responsivos, reutilizando tokens existentes
- **Files modified:** `frontend/src/pages/PainelCozinha.css`
- **Verification:** build + lint verdes
- **Committed in:** `b915607` (task 3 commit)

---

**Total deviations:** 4 auto-fixed (2 missing critical, 2 blocking)
**Impact on plan:** Todos os auto-fixes necessários para corretude, acessibilidade e não-quebra do contrato do backend. Sem mudança de escopo.

## Issues Encountered
- Interrupção de execução anterior: `App.tsx`, `Layout.tsx`, `types.ts` já estavam modificados e `Alunos.tsx`/`Alunos.css` criados, porém **sem commit** — a task 1 foi validada, verificada (build/lint) e commitada a partir desse estado, sem retrabalho
- O bloco de ingredientes do editor (antes inline no form planejado) precisou virar `controlesIngredientes` compartilhado para o avulso; a linha "Esperada para {N} alunos" usa `totalExibicao ?? 0` para satisfazer o narrowing do TS nos dois modos

## Known Stubs
None - toda a UI criada/modificada está ligada a dados reais da API (GET/PUT `/alunos-por-periodo`, POST `/refeicoes`).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: none | — | Nenhuma superfície nova fora do threat_model do plano: PUT /alunos-por-periodo e POST /refeicoes já estavam registrados (T-08-11, T-08-14) e continuam com dupla camada (rota protegida + require_perfil no backend) |

## Verification Results

- `npm run build` (tsc -b && vite build) — PASS
- `npm run lint` (eslint .) — PASS
- Grep `qtdAlunos` / "Quantos alunos foram atendidos?" em frontend/src — 0 ocorrências
- Grep payload: `qtd_alunos` ausente; `tipo_refeicao` apenas como leitura do slot do planejamento
- `Alunos.tsx` contém labels Manhã/Tarde/Noite, CTA `Salvar configuração`, GET+PUT `/alunos-por-periodo` e a mensagem exata de 404
- `App.tsx` contém `path="/admin/alunos"` com `ProtectedRoute perfis={['admin']}`
- `totalPorSlot` com as 4 regras D-15 e a string exata `A configuração de alunos por período ainda não foi definida pelo admin.`
- `RefeicaoCreatePayload` em types.ts com `slot` e sem `qtd_alunos`/`tipo_refeicao`
- Select de avulso com `SLOTS_REFEICAO.map` e submit avulso com `planejamento_id: null`

## User Setup Required
None - nenhum serviço externo ou configuração manual necessária.

## Next Phase Readiness
- IMP-09: admin configura alunos por período na nova página; receita escala pelo total derivado (D-14/D-15)
- IMP-10 + MEAL-02: cozinheira não digita alunos; avulso por slot (D-16b); `qtd_alunos` gravado vem da configuração (backend 08-07)
- Pendente de validação manual (08-VALIDATION.md): cozinheira lança do planejamento e avulso sem digitar alunos; admin configura na nova página; estados de config ausente no PainelCozinha

## Self-Check: PASSED

Verificação das afirmações desta SUMMARY:

- [x] `frontend/src/pages/admin/Alunos.tsx` existe
- [x] `frontend/src/pages/admin/Alunos.css` existe
- [x] `89c341c` existe (`git log --oneline | grep`)
- [x] `48482b8` existe
- [x] `b915607` existe
- [x] Grep gates e build/lint executados e verdes após cada task
- [x] Nenhuma modificação em `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `PROJECT.md` nem em `backend/*`

---
*Phase: 08-improvements*
*Completed: 2026-08-05*
