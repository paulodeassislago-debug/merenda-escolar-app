---
phase: 06
slug: cozinha-gestao-frontend
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-04
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Cozinheira → React client | Operator supplies date, student count, quantities, measures, and justifications. | Untrusted form values and API responses |
| Secretaria → React client | Secretary supplies the selected date and receives operational history. | Untrusted filter values and API responses |
| Browser → FastAPI | Authenticated React pages call the backend through `fetchJson`. | Bearer JWT, meal payloads, filters, and retry requests |
| FastAPI → SQLite | Backend validates authorization, contracts, conversion, stock, and audit data before persistence. | Validated identifiers, quantities, audit fields, and stock mutations |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-06-01 | Spoofing / Elevation | Kitchen route and meal launch | high | mitigate | `ProtectedRoute`, `fetchJson` Bearer JWT, cook-only `POST /refeicoes`, and backend-derived `id_usuario`; legacy `/refeicoes/lancar` removed. | closed |
| T-06-02 | Tampering / Repudiation | Meal draft and ingredient audit | high | mitigate | Payload preserves item IDs, scaled quantities, zero-valued removals, and per-row justifications; backend persists audit fields and preserves drafts on failed POST. | closed |
| T-06-03 | Denial of Service / Integrity | Async page loads and meal submission | medium | mitigate | Submission lock, request IDs, date/slot guards for rereads, disabled date control during POST, and refetch after success/failure. | closed |
| T-06-04 | Information Disclosure / Tampering | API messages and dashboard history | medium | mitigate | API values are rendered as React text; no `dangerouslySetInnerHTML` or raw HTML insertion is used. | closed |
| T-06-05 | Elevation / Tampering | Meal conversions and conversion endpoint | high | mitigate | Cook has read-only conversion access; conversion mutations remain admin-only; nested and top-level meal fields are strict and reject `peso_em_kg`/`id_usuario`; only registered measures are accepted. | closed |
| T-06-06 | Integrity / Tampering | Recipe scaling and stock deduction | high | mitigate | Positive student count and non-negative meal quantities are enforced by client and Pydantic; backend recalculates scaled expectations before deduction and persists them. | closed |
| T-06-07 | Information Disclosure / Availability | Secretary dashboard responses | medium | mitigate | Four authenticated sections have independent loading/error/empty/retry states, safe text rendering, stale-response protection, and 401 re-login handling. | closed |
| T-06-08 | Repudiation | Secretary meal history | low | mitigate | History displays meal ID, timestamp, type, student count, user ID, planning ID, item ID, expected quantity, adjusted quantity, and justifications. | closed |
| T-06-SC | Dependency Tampering | npm/pip manifests and lockfiles | high | mitigate | No dependency installation or manifest changes were made during Phase 6; existing package and Python manifests remain authoritative. | closed |

*Status: all closed.*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-04 | 9 | 9 | 0 | gsd-security-auditor, continuation audit |

The initial continuation audit found three high-severity gaps and one incomplete dashboard surface. Backend validation, legacy-route removal, dashboard completion, stale-response guards, and audit-history display were corrected and re-audited before this verification.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-04
