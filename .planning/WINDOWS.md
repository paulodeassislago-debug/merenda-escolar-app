---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-02T05:19:41.668Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 05 | deviation | frontend/src/pages/admin/Entregas.tsx |  | Plan 05-06 deviation: 6 inline style attributes replaced with co-located CSS classes | open |  | 2026-08-02T05:19:41.668Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "05",
    "file": "frontend/src/pages/admin/Entregas.tsx",
    "line": null,
    "description": "Plan 05-06 deviation: 6 inline style attributes replaced with co-located CSS classes",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-02T05:19:41.668Z",
    "resolved_at": null
  }
]
````
