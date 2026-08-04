---
status: complete
phase: 06-cozinha-gestao-frontend
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-VALIDATION.md]
started: 2026-08-04T15:16:44-03:00
updated: 2026-08-04T17:54:00-03:00
---

## Current Test

[testing complete]

## Automated Gates

- `cd frontend && npm run build` — passed
- `cd frontend && npm run lint` — passed
- `cd backend && source venv/bin/activate && pytest tests/ -q` — 103 passed

## Tests

### 1. Planejamento do dia na cozinha
expected: Com uma sessão de `cozinheira`, abrir `/cozinha`, selecionar uma data com planejamento e ver os quatro slots na ordem fixa. Slots preenchidos mostram prato e vigência como Disponível; slots sem entrada continuam visíveis como Pendente.
result: pass

### 2. Escala da receita e medidas cadastradas
expected: Abrir um slot preenchido, confirmar que os ingredientes ficam ocultos até informar um número inteiro positivo de alunos e, depois disso, verificar que as quantidades aparecem como receita-base x alunos. Cada ingrediente oferece somente um select com medidas previamente cadastradas.
result: pass

### 3. Conversão ausente bloqueia confirmação
expected: Em um item sem conversão cadastrada, a linha fica inválida, a confirmação é bloqueada e a mensagem orienta o cadastro prévio pelo admin. Não existe campo de medida livre nem controle de criação, edição ou exclusão de conversão na cozinha.
result: pass

### 4. Ajustes auditáveis e baixa real
expected: Alterar uma quantidade exige justificativa visível; adicionar ingrediente exige justificativa; remover mantém a linha com quantidade zero, badge Removido e justificativa. Confirmar almoço e lanche em slots separados mostra sucesso somente após a resposta real e atualiza o saldo do estoque.
result: pass

### 5. Dialog e recuperação da cozinha
expected: O editor funciona por teclado: foco inicial e retorno são coerentes, Tab fica contido, Esc e Fechar funcionam e descartar alterações pede confirmação textual. Loading, erro, retry, sessão expirada e falha de envio preservam o rascunho quando aplicável.
result: pass

### 6. Gestão com dados reais e conversão de estoque
expected: Com uma sessão de `secretaria`, abrir `/gestao`, selecionar uma data e ver estoque, refeições, planejamento e entregas reais. O saldo aparece na unidade de exibição, o alerta usa limiar de 5 nessa unidade e os quatro slots de planejamento aparecem mesmo quando algum está vazio.
result: pass

### 7. Estados independentes e sessão expirada na gestão
expected: Uma falha em uma seção não apaga conteúdo válido das outras; cada seção oferece loading, vazio, erro e retry próprios. Uma resposta 401 mostra `Sua sessão expirou. Entre novamente.` e a ação `Entrar novamente` encerra a sessão e retorna ao login.
result: pass

### 8. Navegação e layouts responsivos
expected: As CTAs `Abrir planejamento` e `Ver entregas` levam às rotas protegidas existentes. Em 320px, 768px e desktop, os conteúdos permanecem legíveis, justificativas longas quebram corretamente, tabelas rolam somente no container e controles têm foco visível e área de toque adequada.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

none — all 8 flows validated in browser on 2026-08-04, including F13–F15 acceptance from 06-VALIDATION.md.
