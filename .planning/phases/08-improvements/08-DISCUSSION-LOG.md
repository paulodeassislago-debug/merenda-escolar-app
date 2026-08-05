# Phase 8: Improvements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-05
**Phase:** 08-improvements
**Areas discussed:** Escopo da fase, entregas com origem/fornecedor/auditoria, alunos fixos por período, projeção cumulativa de estoque, limiar individual, cadastro inline de item, sugestão de correspondência

---

## Escopo da Fase 8

| Option | Description | Selected |
|--------|-------------|----------|
| Manter backlog IMP-01..IMP-05 original | Só limiar, cadastro inline e matching | |
| Expandir com correções de fluxo do usuário | + entregas com origem/fornecedor, alunos fixos, projeção de estoque | ✓ |

**User's choice:** Trazer três correções de fluxo de usuário como parte da Fase 8: (1) justificativa de entrega só para origem XML + descrição da entrega avulsa; (2) cozinheira deixa de digitar alunos — admin cadastra números fixos; (3) planejamento com projeção de estoque não-bloqueante.
**Notes:** A fase deixa de ser "só melhorias" e passa a revisar fluxos operacionais contratados (DELIV-05/06, MEAL-02/07/08). A fase 8 é legítima para isso porque 5-7 já concluíram.

---

## Entregas: origem, data, fornecedor e auditoria

| Option | Description | Selected |
|--------|-------------|----------|
| Sem origem (status quo) | Justificativa por item em todas as entregas | |
| Campo `origem` no payload | Frontend envia origem; backend valida por origem | ✓ |
| Campos estruturados vs. texto livre | "entregador/observações" em campos separados | |
| Fornecedor como campo de texto | Sem tabela própria | |
| Tabela `fornecedores` + associação | FK obrigatória; cadastro inline com sugestão | ✓ |
| Número da nota sempre | Obrigatório em qualquer origem | |
| Nota opcional no manual | Obrigatório só no XML | ✓ |
| Observações obrigatórias no manual | Substitui a justificativa por item | ✓ |

**User's choice:** "O modelo Entrega agora deve receber o campo origem (xml ou manual), deve ter obrigatoriamente uma data associada, um fornecedor associado (podemos também criar uma tabela de fornecedores...). O admin ou secretaria pode, dentro do form de entrega, tanto cadastrar um fornecedor novo, quanto escolher um existente (campo com sugestão). A nota manual deve obrigatoriamente ter justificativa/observações. A nota xml não precisa. O número da nota fica salvo na entrega por xml, enquanto na entrega manual a adição do número pode ser opcional, mas não obrigatória."
**Notes:** Ficou decidido que no fluxo manual as linhas são sempre `recebido` (sem ações alterado/excluído nem justificativa por item). CNPJ do fornecedor foi adotado como opcional (pré-preenchido do emitente da NF). XML pré-preenche data de emissão, emitente e número da nota, com confirmação humana.

---

## Alunos fixos por período

| Option | Description | Selected |
|--------|-------------|----------|
| Cozinheira digita alunos (status quo) | MEAL-02 atual; rejeitado para o dia-a-dia | |
| Número fixo por tipo de refeição | 3 números (Lanche/Almoço/Janta) | |
| Número fixo por período/grupo | 3 grupos (manhã/tarde/noite); total do slot derivado | ✓ |
| Configuração em página própria | Página administrativa dedicada | |
| Configuração na página de Cardápio | Bloco "Alunos por refeição" (recomendação adotada) | ✓ |

**User's choice:** "Decidi que não vou deixar para as cozinheiras cadastrarem o número de alunos servidos... Caberá ao admin cadastrar um número fixo de alunos que recebem cada refeição... temos 3 grupos de alunos, manhã, tarde e noite, onde: lanche da manhã serve alunos da manhã, almoço serve alunos da manhã + alunos da tarde; janta serve alunos da noite."
**Notes:** Lanche da Manhã = manhã; Almoço = manhã + tarde; Lanche da Tarde = tarde; Janta = noite. Refeição avulsa usa o total do período do slot selecionado (4 slots, não o tipo — elimina ambiguidade entre os dois lanches). `qtd_alunos` gravado na refeição = valor configurado no momento (auditoria). Ajustes de ingredientes continuam exigindo justificativa.

---

## Projeção cumulativa de estoque no planejamento

| Option | Description | Selected |
|--------|-------------|----------|
| Sem projeção (status quo) | Planejamento ignora estoque | |
| Aviso por refeição isolada | Compara só a refeição salva com saldo atual | |
| Projeção cumulativa da semana | Simulação dia a dia da vigência | ✓ |
| Bloquear planejamento sem estoque | Impede salvar o slot | |
| Não bloquear, apenas avisar | Salva e retorna avisos | ✓ |

**User's choice:** "quando planejo uma receita para sexta-feira, por exemplo, o sistema não deve bloquear esse planejamento, mas avisar ao admin quais são os itens que faltarão naquela determinada refeição" + "queremos projeção cumulativa" + "lançamento de refeição segue bloqueando, planejamento não bloqueia, pois posso providenciar o item ou uma substituição do mesmo no momento do cadastro da refeição".
**Notes:** Exibição delegada à criatividade: proposta de badge na célula da grade + painel colapsável "Projeção da semana" + banner não-bloqueante ao salvar foi apresentada e aceita. Backend é autoridade do cálculo; itens sem conversão = "não avaliável". O bloqueio no lançamento da refeição permanece.

---

## Limiar individual (IMP-01/02)

| Option | Description | Selected |
|--------|-------------|----------|
| Limiar fixo 5 (status quo) | `LIMIAR_BAIXO_ESTOQUE` no frontend | |
| Coluna `limiar` NOT NULL default 5 | Migração grava 5; sem null | ✓ |
| Coluna `limiar` nullable = fallback | null significa 5 | |

**User's choice:** Adotada a recomendação: coluna com default 5.0 e migração dos itens existentes; sem valores nulos.
**Notes:** Limiar na unidade de exibição (saldo/fator). Frontend remove o 5 hardcoded; todas as superfícies consomem o limiar da API. Zero/negativo/ausente rejeitados.

---

## Cadastro inline de item (IMP-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Sem cadastro inline (status quo) | Linha sem match exige item pré-existente | |
| Modal inline com form completo de Itens | Mesmos campos e validações; preserva rascunho | ✓ |
| Admin-only | `POST /itens` permanece administrativo | |
| Admin + secretaria no fluxo inline | Mesmo escopo do fornecedor inline | ✓ |

**User's choice:** Não respondeu explicitamente à pergunta de autorização; adotada a recomendação de permitir à secretaria o cadastro inline dentro de Entregas (paridade com o fornecedor inline). Decisão registrada em D-13 com a exigência de escopo mínimo testado.
**Notes:** O modal não confirma a linha automaticamente — revisão humana permanece antes do submit.

---

## Sugestão de correspondência (IMP-04/05)

| Option | Description | Selected |
|--------|-------------|----------|
| Sem sugestões (status quo) | Nomes digitados/revisados manualmente | |
| Normalização determinística local | Caixa, acentos, pontuação, tokens + dicionário de abreviações + score | ✓ |
| IA externa / serviço de matching | Fora do escopo; exige demonstração de custo | |

**User's choice:** Não respondeu explicitamente; mantido o desenho do contexto original (IMP-04/05): sugestões assistivas com motivo legível, nunca seleção/fusão silenciosa.
**Notes:** O mecanismo serve itens XML e fornecedores. Persistência de aliases adiada.

---

## OpenCode's Discretion

- Exibição fina do badge/painel/banner da projeção (tokens `--erro`/`--verde-vivo`).
- Estratégia de migração SQLite (ALTER TABLE no startup; sem Alembic nesta fase).
- Implementação do score de similaridade e dicionário de abreviações.
- Mecânica do autocomplete de fornecedor e do modal inline de item.

## Deferred Ideas

- Fusão automática/exclusão de itens duplicados — fase futura.
- Persistência de aliases de normalização — fase futura.
- Histórico de edições da configuração de alunos — fase futura.
- Projeção multi-semana/horizonte mensal — fase futura.
- Validação fiscal formal NF-e — fora do escopo (mantido).

---

*Phase: 08-improvements*
*Discussion log generated: 2026-08-05*
