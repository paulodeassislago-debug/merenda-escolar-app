---
phase: 05
slug: p-ginas-admin-frontend
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-02
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → API | React SPA calling FastAPI backend via fetchJson | JWT token (httpOnly for initial login), user data, CRUD payloads |
| API → Browser | Backend responses to frontend | JSON payloads, error messages, 401/403/409/422 status codes |
| File System → Browser | XML NF-e upload via file input | Untrusted XML content parsed client-side by fast-xml-parser |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Spoofing | App.tsx rotas | high | mitigate | ProtectedRoute com verificação de perfil `admin` + validação JWT no backend | closed |
| T-05-02 | Tampering | Todas as páginas CRUD | high | mitigate | PUT/DELETE validam `id` no backend; autorização por JWT; dados nunca confiáveis vindos do cliente | closed |
| T-05-03 | Information Disclosure | Dashboard / Itens | medium | mitigate | fetchJson interrompido em 401 — sem vazar dados; detalhes de erro do backend só exibidos ao admin autenticado | closed |
| T-05-04 | Denial of Service | nfe.ts (XML parser) | high | mitigate | fast-xml-parser config: `ignoreAttributes: false`, `attributeNamePrefix: ""`, sem `allowBooleanAttributes` — parser resistente a XML malformado; sem expansão XXE (puro parser, não DTD resolver) | closed |
| T-05-05 | Elevation of Privilege | Planejamento grade semanal | high | mitigate | Backend valida `tipo_refeicao` e existência de `prato_id` — frontend NÃO tem autoridade de validação do slot; upsert/drop são atômicos por slot no backend | closed |
| T-05-06 | Repudiation | Entregas — justificativa PNAE | high | mitigate | Toda alteração/exclusão registra `acao` com acento ("alterado", "excluído") e `justificativa` obrigatória em modal bloqueante; backend audita `created_at`; justificativa persiste no banco | closed |
| T-05-07 | Repudiation | Entregas — NF-e import | medium | mitigate | Linhas NF-e são revisadas por humano (confirmar/rejeitar) antes de virar registros de entrega; `parseNfe` normaliza e valida `cProd`, `qCom`, `xProd` | closed |

*Status: all closed*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-02 | 7 | 7 | 0 | gsd-secure-phase (short-circuit ASVS L1 — all PLAN.md threat models verified) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-02