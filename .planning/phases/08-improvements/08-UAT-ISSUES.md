# UAT Fase 8 — Observações Manuais (contexto temporário)

**Data:** 2026-08-05
**Status:** Aguardando planejamento das correções
**Ambiente:** seed genérico + `admin/admin123` · frontend em `http://163.176.169.67:5173`
**Blocos:** A–I

## Resultado por bloco

| Bloco | Status | Notas |
|-------|--------|-------|
| A — Login/navegação | ✅ | — |
| B — Página Alunos | ✅ | estado vazio, validação >0, persistência 100/80/40, rotas bloqueadas |
| C — Dashboard/Itens/limiar | ✅ | baixo estoque=2, badges, unidade livre, conversões |
| D — Entregas | ✅ | com obs #1, #2, #3 |
| E — Entrega XML | ✅* | leitura ok, normalização "perfeita"; obs #1 em aberto (*bloco todo funcional exceto pendências já reportadas) |
| F — Planejamento/projeção | ✅ | com obs #4, #5; hover com item faltante aprovado |
| G — Cozinheira | ✅ | com obs #6, #7 |
| H — WR-02 fallback | ✅ | sem exceção, justificativa só em divergência real |
| I — Secretaria | ✅ | tudo funcional, inclusive XML; obs #2d em aberto |

## Observações a corrigir (7)

1. **#1 — XML: botão "Confirmar recebimento" não responde** (rota admin; na secretaria o fluxo XML funcionou — pista para diagnóstico)
2. **#2 — Detalhe de entrega:**
   - (a) a listagem principal deve mostrar **Fornecedor** no lugar de "Registrado por"
   - (b) "Registrado por" fica **somente no modal "Ver detalhes"**
   - (c) o modal deve mostrar **fornecedor + observações + registrado por**
   - (d) o mesmo detalhamento (fornecedor + observações) na **rota da secretaria** (/gestao)
3. **#3 — "Registrado por" retorna o ID** em vez do nome do usuário (backend serializa só `id_usuario`; resolver nome, padrão `fornecedor_nome`)
4. **#4 — Projeção não é reativa:** deve atualizar assim que a refeição muda no select da célula, **sem salvar**
5. **#5 — Aviso de falta por dia em vez de por refeição:** o aviso deve aparecer **apenas no slot/refeição** em que o item seria servido
6. **#6 — Foco não ancorado** no aviso "fechar ou salvar" ao fechar rascunho sem salvar (PainelCozinha — acessibilidade)
7. **#7 — Refeição avulsa fica "pendente"** mesmo com baixa registrada; deve **ocupar o slot correspondente com a tag "EXTRA"**

## Destaques positivos (preservar)

- Normalização de itens XML "perfeita"; sugestões e cadastro inline ok
- Busca e cadastro de fornecedores ok
- Projeção funcional + hover com item faltante aprovado
- WR-02 sem exceção; bloqueio de estoque ok; fluxo avulso ok

---
*Contexto temporário para planejamento das correções — não é artefato canônico de fase.*
