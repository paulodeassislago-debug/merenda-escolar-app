---
status: partial
phase: 08-improvements
source: [08-VERIFICATION.md]
started: 2026-08-05
updated: 2026-08-05
---

## Current Test

[awaiting human testing — blocos A–I testados em 2026-08-05; 7 observações registradas]

## Tests

### 1. WR-02 — lançamento de refeição com medida sem conversão (fallback)
expected: Lançar refeição com ingrediente de receita cuja medida caseira não possui conversão cadastrada → sem exceção; comparação histórica em modo bruto (sem falso positivo de divergência); justificativa exigida apenas em divergência real.
result: passed — Bloco H sem exceção; justificativa exigida apenas em divergência real (30 ≠ 40 pacotes)

### 2. F12 revisado — entrega manual com fornecedor
expected: Form de Entregas em modo manual: campo fornecedor com autocomplete (sugestões do matching), cadastro inline de fornecedor novo, data editável (default hoje), observações obrigatórias, linhas apenas `recebido`, nota opcional; rascunho preservado ao abrir/fechar modais; entrega salva e visível no histórico.
result: passed — busca e cadastro de fornecedores ok; nota manual perfeita (admin e secretaria). Pendência: detalhes da entrega (obs #2/#3).

### 3. XML + cadastro inline de item
expected: Upload XML: linha sem correspondência oferece `Cadastrar novo item`; modal cria o item (unidade livre/KG-L/fator/limiar 5.0); item vinculado à linha; sugestões top-3 com confiança e motivo (sem associação automática); descrição original da NF preservada; revisão final antes do submit; entrega XML exige número da nota e justificativa por item para alterado/excluído.
result: passed — leitura da nota ok; normalização de itens "perfeita"; sugestões e cadastro inline ok. Pendência: botão "Confirmar recebimento" não responde no admin (obs #1); na secretaria o fluxo XML funcionou.

### 4. F13 revisado — fluxo da cozinheira por slot
expected: PainelCozinha sem campo de alunos; receita escala pelo total do slot derivado da configuração (Lanche Manhã=manhã, Almoço=manhã+tarde, Lanche Tarde=tarde, Janta=noite); lançamento avulso seleciona um dos 4 slots; ajustes exigem justificativa; estoque insuficiente bloqueia; refeição gravada com qtd_alunos da config.
result: passed — fluxo planejado ok; avulso ok; bloqueio de estoque ok. Pendências: foco no diálogo (obs #6); avulsa não ocupa slot com tag EXTRA (obs #7).

### 5. Projeção de estoque na UI do Planejamento
expected: Badge de alerta na célula da grade (tooltip com itens e quanto falta), painel colapsável "Projeção da semana" (item | saldo atual | consumo projetado | saldo projetado final | 1º dia de ruptura), banner não-bloqueante ao salvar com "Ver projeção", mensagem "Configure os alunos por período para ativar a projeção." quando config ausente; admin e secretaria veem; cozinheira não acessa.
result: passed — projeção funcional; hover com item faltante aprovado; banner ok. Pendências: não reativa ao select (obs #4); aviso por dia em vez de por refeição (obs #5).

### 6. Página /admin/alunos
expected: Apenas admin acessa; 3 campos (manhã/tarde/noite) com validação > 0; estado vazio explícito quando config não definida (404); erro de rede recuperável; salvar persiste e GET confirma.
result: passed — estado vazio, validação, persistência 100/80/40, rotas bloqueadas (Bloco B)

## Summary

total: 6
passed: 6
issues: 7
pending: 0
skipped: 0
blocked: 0

## Gaps

Observações a corrigir (registradas em 08-UAT-ISSUES.md, contexto temporário):

1. **#1** — XML: botão "Confirmar recebimento" não responde (rota admin; secretaria funcionou). Causa raiz: `podeSubmeter()` desabilita o botão silenciosamente quando há linha sem item vinculado — sem feedback para o usuário.
2. **#2** — Detalhe de entrega: (a) listagem principal mostra Fornecedor no lugar de "Registrado por"; (b) "Registrado por" fica somente no modal "Ver detalhes"; (c) modal mostra fornecedor + observações + registrado por; (d) mesmo detalhamento na rota da secretaria (/gestao).
3. **#3** — "Registrado por" retorna ID em vez do nome do usuário (backend serializa apenas `id_usuario`).
4. **#4** — Projeção deve atualizar ao mudar a refeição no select da célula, sem salvar.
5. **#5** — Aviso de falta por dia em vez de por refeição: avisar apenas no slot em que o item seria servido.
6. **#6** — Foco não ancorado no aviso "fechar ou salvar" ao fechar rascunho sem salvar (PainelCozinha — acessibilidade).
7. **#7** — Refeição avulsa fica "pendente" mesmo com baixa registrada; deve ocupar o slot correspondente com a tag "EXTRA".
