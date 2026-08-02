---
status: complete
phase: 05-p-ginas-admin-frontend
source: [05-VERIFICATION.md]
started: 2026-08-02T02:30:00Z
updated: 2026-08-02T02:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. F6 — Dashboard com dados reais
expected: 4 cards com valores numéricos + 3 seções populadas do backend
result: pass

### 2. F7 — CRUD Usuários completo
expected: Criar/editar/excluir usuários via /admin/usuarios. Campos: nome, email, perfil (select), senha. Operações refletem no backend imediatamente.
result: pass

### 3. F8 — Itens + conversões + baixo estoque
expected: CRUD de itens. Campo de unidade restrito a KG/L. Badge "Baixo estoque" visível quando saldo < 5.0. Modal de conversões por item com adição/edição/remoção.
result: pass

### 4. F9 — Cardápio → Receitas → Planejamento
expected: Criar prato em /admin/cardapio, clicar "Editar receita", adicionar/editar/remover ingredientes em /admin/receitas/:id. O prato aparece disponível no dropdown do Planejamento.
result: pass

### 5. F10 — Grade semanal + persistência após reload
expected: Grade 7×4 visível em /admin/planejamento. Selecionar prato em uma célula, salvar. Recarregar a página — planejamento persiste. Navegação de semana funcional.
result: pass

### 6. F11 — Entrada manual com justificativa PNAE
expected: Adicionar entrega manual. Alterar quantidade — modal de justificativa obrigatória. Excluir entrega — modal de justificativa obrigatória. Ações registradas com acento ("alterado", "excluído").
result: pass

### 7. F12 — Upload XML NF-e + revisão humana
expected: Fazer upload de arquivo XML NF-e. Parser extrai itens e popula a tabela de revisão. Confirmar ou rejeitar cada linha. Itens confirmados viram registros de entrega.
result: skipped
reason: "Deferred follow-up: test later"

### 8. Layout responsivo (backstop overflow)
expected: Páginas com tabelas largas (Itens, Entregas) mantêm usabilidade em viewport estreita (360px). Sem transbordamento horizontal que esconda dados.
result: pass

### 9. Textos longos (backstop long-text)
expected: Nomes longos de itens/pratos quebram linha em células de tabela e modais. Sem truncamento que oculte informação.
result: pass

### 10. Cópia de sessão expirada
expected: Ao expirar o token JWT, qualquer chamada de API exibe "Sua sessão expirou. Entre novamente." com link para /login.
result: pass

## Summary

total: 10
passed: 9
issues: 0
pending: 0
skipped: 1
blocked: 0

## Deferred Follow-Ups

- test: 7
  idea: "test later (F12 — Upload XML NF-e + revisão humana)"
  deferred_at: 2026-08-02

## Gaps