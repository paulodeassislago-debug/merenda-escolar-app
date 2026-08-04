# Phase 8 Discussion Log

**Phase:** 08-improvements
**Date:** 2026-08-03
**Mode:** Product improvement backlog capture

## User-provided improvements

1. Cadastro de limiar de baixo estoque individual por item, porque itens possuem volumes de consumo diferentes.
2. Opção `Cadastrar novo item` dentro do select de correspondência de uma linha XML não reconhecida, preservando o fluxo na aba Entregas.
3. Normalização inteligente de nomes de fornecedores para sugerir correspondências e evitar duplicações, mantendo confirmação humana.

## Scope guard

As melhorias foram registradas como Phase 8, depois da Phase 7. Nenhum plano de implementação ou alteração funcional foi iniciado. A Fase 6 permanece com os planos aprovados e sem dependência nova da Fase 8.

## Decisions requiring research before execution

- Unidade e fallback do limiar individual.
- Permissão de criação inline para admin e secretaria.
- Estratégia de normalização, score de similaridade, dicionário de abreviações e eventual persistência de aliases.
- Impacto em migração SQLite, schemas, testes de atomicidade e auditoria.

---

*Phase 8 captured: 2026-08-03*
