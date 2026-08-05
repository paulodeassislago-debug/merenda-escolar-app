---
status: partial
phase: 08-improvements
source: [08-VERIFICATION.md]
started: 2026-08-05
updated: 2026-08-05
---

## Current Test

[awaiting human testing]

## Tests

### 1. WR-02 — lançamento de refeição com medida sem conversão (fallback)
expected: Lançar refeição com ingrediente de receita cuja medida caseira não possui conversão cadastrada → sem exceção; comparação histórica em modo bruto (sem falso positivo de divergência); justificativa exigida apenas em divergência real.
result: [pending]

### 2. F12 revisado — entrega manual com fornecedor
expected: Form de Entregas em modo manual: campo fornecedor com autocomplete (sugestões do matching), cadastro inline de fornecedor novo, data editável (default hoje), observações obrigatórias, linhas apenas `recebido`, nota opcional; rascunho preservado ao abrir/fechar modais; entrega salva e visível no histórico.
result: [pending]

### 3. XML + cadastro inline de item
expected: Upload XML: linha sem correspondência oferece `Cadastrar novo item`; modal cria o item (unidade livre/KG-L/fator/limiar 5.0); item vinculado à linha; sugestões top-3 com confiança e motivo (sem associação automática); descrição original da NF preservada; revisão final antes do submit; entrega XML exige número da nota e justificativa por item para alterado/excluído.
result: [pending]

### 4. F13 revisado — fluxo da cozinheira por slot
expected: PainelCozinha sem campo de alunos; receita escala pelo total do slot derivado da configuração (Lanche Manhã=manhã, Almoço=manhã+tarde, Lanche Tarde=tarde, Janta=noite); lançamento avulso seleciona um dos 4 slots; ajustes exigem justificativa; estoque insuficiente bloqueia; refeição gravada com qtd_alunos da config.
result: [pending]

### 5. Projeção de estoque na UI do Planejamento
expected: Badge de alerta na célula da grade (tooltip com itens e quanto falta), painel colapsável "Projeção da semana" (item | saldo atual | consumo projetado | saldo projetado final | 1º dia de ruptura), banner não-bloqueante ao salvar com "Ver projeção", mensagem "Configure os alunos por período para ativar a projeção." quando config ausente; admin e secretaria veem; cozinheira não acessa.
result: [pending]

### 6. Página /admin/alunos
expected: Apenas admin acessa; 3 campos (manhã/tarde/noite) com validação > 0; estado vazio explícito quando config não definida (404); erro de rede recuperável; salvar persiste e GET confirma.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
