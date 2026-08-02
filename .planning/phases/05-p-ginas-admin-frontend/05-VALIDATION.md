---
phase: 5
slug: p-ginas-admin-frontend
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-31
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsc (typecheck via `vite build`) + eslint 9 (frontend); pytest (backend, regression guard) |
| **Config file** | `frontend/tsconfig.json`, `frontend/eslint.config.js`, `backend/tests/` |
| **Quick run command** | `cd frontend && npm run lint` |
| **Full suite command** | `cd frontend && npm run build && npm run lint && cd ../backend && source venv/bin/activate && pytest tests/ -q` |
| **Estimated runtime** | ~60 seconds (build ~15s, lint ~10s, pytest ~50s) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run lint`
- **After every plan wave:** Run full suite command (build + lint + pytest)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 05-01 | 1 | F7 | T-05-01-01, T-05-01-02 | Rotas admin com perfis explícitos (ProtectedRoute); senha omitida do PUT quando vazia | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de rotas/tipos/role="alert" | ✅ | ✅ green |
| 05-01-02 | 05-01 | 1 | F6 | T-05-01-01 | Dashboard via fetchJson; nulls tratados (prato/ultima_data) | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de copies de null | ✅ | ✅ green |
| 05-02-01 | 05-02 | 2 | F8 | T-05-02-01 | Saldo/badge por LIMIAR_BAIXO_ESTOQUE; select KG/L restrito | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de limiar/badge | ✅ | ✅ green |
| 05-02-02 | 05-02 | 2 | F8 | T-05-02-02 | Conversões por item; exclusão via modal destrutivo | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de /conversoes | ✅ | ✅ green |
| 05-03-01 | 05-03 | 2 | F9 | T-05-03-02 | Tipo restrito a TIPOS_REFEICAO (fonte única) | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de TIPOS_REFEICAO | ✅ | ✅ green |
| 05-03-02 | 05-03 | 2 | F9 | T-05-03-01 | :id coagido via Number(id); refetch/merge de item_nome | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de useParams/receita | ✅ | ✅ green |
| 05-04-01 | 05-04 | 2 | F10 | T-05-04-01, T-05-04-02 | Dropdown filtrado por tipo (backend não valida); conversão (jsDay+6)%7 | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de filter/getDay | ✅ | ✅ green |
| 05-04-02 | 05-04 | 2 | F10 | T-05-04-01 | Upsert por slot+vigência; DELETE ao limpar slot vigente | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de POST/DELETE/data_inicio_vigencia | ✅ | ✅ green |
| 05-05-01 | 05-05 | 2 | F12 | T-05-05-01 | Parse XML sem eval; raiz nfeProc/NFe tolerante; det normalizado | typecheck+lint+grep+node-smoke | `cd frontend && npm run build && npm run lint` + node --input-type=module (smoke parser) | ✅ | ✅ green |
| 05-05-02 | 05-05 | 2 | F11 | T-05-05-02, T-05-05-04 | Justificativa obrigatória na UI (backend 400 é a autoridade); ações via AcaoEntrega | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de justificativa/badges | ✅ | ✅ green |
| 05-05-03 | 05-05 | 2 | F12 | T-05-05-01, T-05-05-03 | accept=".xml"; erro de parse capturado; não-reconhecidos com seleção manual | typecheck+lint+grep | `cd frontend && npm run build && npm run lint` + greps de parseNfe/accept/copies | ✅ | ✅ green |
| 05-06-01 | 05-06 | 3 | D-12 | T-05-06-01 | Varredura de anti-padrões (fetch cruo, hex, innerHTML, ação sem acento) | full suite | `cd frontend && npm run build && npm run lint && cd ../backend && source venv/bin/activate && pytest tests/ -q` + 8 greps | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*12 tasks em 6 planos (waves 1–3). Spec-less probe fallback pulado visivelmente: fase sem REQ-IDs (projeto sem REQUIREMENTS.md); baseline = ROADMAP fase 5 + F6–F12.*

---

## Wave 0 Requirements

- [x] Infra existente cobre a fase: typecheck via `npm run build` (tsc), lint via `npm run lint`, backend pytest (77 testes) como guarda de regressão — nenhuma instalação necessária

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard admin exibe 4 cards com dados reais | F6 | Sem framework E2E (Playwright adiado) | Login admin → `/admin` → 4 seções com números do `GET /admin/dashboard` |
| CRUD usuários com feedback visual | F7 | idem | `/admin/usuarios` → criar, editar, excluir → toast/estado visível |
| CRUD itens + destaque baixo estoque | F8 | idem | `/admin/itens` → CRUD; item com saldo ≤ 5.0 aparece destacado |
| Cardápio + receitas: prato, ingredientes, remover | F9 | idem | `/admin/cardapio` → novo prato → `/admin/receitas/:id` → add/remover ingrediente |
| Planejamento persiste após reload | F10 | idem | `/admin/planejamento` → selecionar pratos nos slots → salvar → F5 → seleções mantidas |
| Entrega manual com justificativa | F11 | idem | `/admin/entregas` → alterar/excluir item → modal de justificativa obrigatória → confirmar |
| Entrega XML: upload, parse, editar, confirmar | F12 | idem | Upload de NF-e XML → tabela populada → editar → confirmar → estoque atualizado |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (nenhuma — infra completa)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved by exit-gate plan 05-06 — build ✅, lint ✅, pytest ✅ (77 passed), zero anti-patterns, all 12 tasks ✅ green
