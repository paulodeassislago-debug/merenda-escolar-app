# Phase 07: Finalizacao - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 07-Finalizacao
**Areas discussed:** Hierarquia do cardápio público, Slots e ordem do dia, Checklist F1-F17 e evidências

---

## Hierarquia do cardápio público

| Decision | Selected option | Alternatives considered |
|---|---|---|
| Foco de cada bloco | Prato em destaque | Ingredientes em destaque; Somente prato |
| Detalhe dos ingredientes | Somente nomes | Nome + medida; Quantidade completa |
| Prato sem receita | Mostrar só o prato | Indicar ingredientes não informados; Ocultar a refeição |
| Leitura estreita | Resumo com expansão | Lista compacta com quebra natural; Tabela de ingredientes |

**Notes:** O público não deve receber quantidades de ficha técnica. O resumo expansível deve preservar os nomes e ser acessível.

---

## Slots e ordem do dia

| Decision | Selected option | Alternatives considered |
|---|---|---|
| Lanches | Quatro blocos separados | Três blocos por tipo; Agenda compacta |
| Ordem | Ordem do serviço | Ordem do backend; Ordem alfabética |
| Slot vazio | Quatro slots com `A definir` | Apenas preenchidos; Aviso geral |
| Rótulos | Nomes operacionais completos | Nomes simplificados; Nome + horário fixo |

**Notes:** A tela pública deve distinguir os dois lanches sem inventar horários.

---

## Checklist F1-F17 e evidências

| Decision | Selected option | Alternatives considered |
|---|---|---|
| F1-F5 ausentes | Reconstruir pelos artefatos | Definir como smoke inicial; Manter apenas F6-F17 |
| Dados de teste | Cenário controlado reproduzível | Dados existentes; Preparação por fluxo |
| Evidência | `UAT.md` + gates automatizados | Checklist resumido; Capturas de tela por fluxo |
| Falhas | Bloqueiam a conclusão | Registrar e seguir; Separar bloqueantes |

**Notes:** A reconstrução de F1-F5 deve ser uma etapa explícita antes do aceite, e não uma inferência silenciosa.

---

## the agent's Discretion

- Limiar visual do resumo expansível.
- Composição exata dos quatro slots, desde que a ordem e os estados sejam mantidos.
- Organização dos dados controlados e sequência operacional do UAT.

## Deferred Ideas

- Nenhuma ideia nova foi adicionada durante a discussão; os adiamentos já registrados no projeto permanecem válidos.
