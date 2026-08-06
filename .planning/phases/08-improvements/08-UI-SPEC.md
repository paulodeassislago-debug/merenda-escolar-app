---
phase: 08
slug: improvements
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-05
---

# Phase 8 — UI Design Contract

> Contrato visual e de interação das melhorias operacionais. Gerado a partir das decisões D-01..D-24 (CONTEXT.md) e do sistema de design existente (`frontend/src/index.css`). Cores guiadas pelos tokens institucionais (`--erro`, `--verde-vivo`, `--verde-tint`, `--alerta`), conforme "OpenCode's Discretion" do CONTEXT.md.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (CSS plain co-localizado — padrão do projeto) |
| Preset | not applicable |
| Component library | none (componentes React próprios) |
| Icon library | none (texto/símbolos simples `⚠`, sem ícones externos) |
| Font | `--fonte-sans` (corpo/labels/controles) + `--fonte-serif` (apenas títulos cerimoniais) |

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gaps internos de badge/tooltip |
| sm | 8px | Espaço compacto (badge no select, sugestões) |
| md | 16px | Espaçamento padrão entre elementos |
| lg | 24px | Padding de seções/painel |
| xl | 32px | Gaps de layout (grade) |
| 2xl | 48px | Quebras maiores entre seções |
| 3xl | 64px | Separadores de página (somente desktop) |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 12px | 400 | 1.2 |
| Heading | 20px | 700 | 1.2 |
| Display | 28px | 700 | 1.2 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F7FAF5` (--fundo) | Fundos de página |
| Secondary (30%) | `#FFFFFF` (--branco) | Cards, painel, tabelas |
| Accent (10%) | `#124C0F` (--verde-escuro) | Ações primárias, títulos de seção |
| Destructive | `#B3261E` (--erro) | Badge de déficit/ruptura, mensagens de bloqueio |

**Acento reservado para:** botões primários, badges de alerta de ruptura (fundo `--erro-fundo` + texto `--erro`), linhas com ruptura no painel, rótulo do banner de avisos. **Nunca** para elementos interativos genéricos.

**Semânticas complementares:**
- Ruptura/déficit: texto `--erro`, fundo `--erro-fundo` (`#FBEDEB`), borda `--erro`.
- Sobra/ok: texto `--verde-escuro` ou `--verde-vivo` sobre `--verde-tint`.
- Aviso (badge de célula): fundo `--erro-fundo` com texto `--erro` (badge), ou `--alerta` apenas como ponto discreto — decisão do executor, limitada a tokens existentes.
- Estados "não avaliável": `--texto-suave` (`#5A6B56`).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Campo limiar (form item) | Label: `Limiar de baixo estoque` — ajuda: `Alerta quando o saldo ficar abaixo deste valor, na unidade de exibição.` |
| Cópia dashboard (substitui L241) | `O alerta considera o limiar configurado de cada item na unidade de exibição.` |
| Ação linha XML sem correspondência | Opção no select: `Cadastrar novo item` |
| Modal item inline | Título: `Cadastrar novo item` — CTA: `Salvar item` — cancelar: `Cancelar` |
| Modal fornecedor inline | Título: `Cadastrar fornecedor` — campos: `Nome` (obrigatório), `CNPJ` (opcional) — CTA: `Salvar fornecedor` |
| Sugestões (linhas XML / fornecedor) | Rótulo: `Sugestões` — cada item: nome + motivo legível (ex.: `3 de 4 palavras batem`) |
| Badge de célula (projeção) | `⚠ {N} item(ns) faltando` — tooltip: `{Item} −{qtd} {unidade}` |
| Painel "Projeção da semana" | Título: `Projeção da semana` — colunas: `Item | Saldo atual | Consumo projetado | Saldo projetado final | 1º dia de ruptura` — resumo: `{N} item(ns) com ruptura prevista` — sem conversão: `não avaliável` |
| Config de alunos vazia (painel) | `Configure os alunos por período para ativar a projeção.` |
| Banner pós-salvar (não-bloqueante) | `Atenção: {N} item(ns) podem faltar nas refeições planejadas.` — ação: `Ver projeção` |
| Config de alunos (página admin) | Título: `Alunos por período` — campos: `Manhã`, `Tarde`, `Noite` — ajuda: `A receita escala pelo total do período de cada refeição.` — CTA: `Salvar configuração` |
| PainelCozinha (avulso) | Select de lançamento avulso: 4 slots — copy de confirmação: `Refeição servida a {N} alunos!` (vinda do backend) |
| Config indisponível (PainelCozinha) | `A configuração de alunos por período ainda não foi definida pelo admin.` |

---

## Component and Interaction Inventory

### Itens (`/admin/itens`)
- Form de item ganha campo numérico `Limiar de baixo estoque` (obrigatório, mínimo 0.01, default 5.0).
- Badge existente de baixo estoque passa a comparar com o limiar do item (unidade de exibição).

### Dashboard secretaria (`/gestao`)
- Texto de ajuda L241 dinâmico (ver copy); badge por item usa `item.limiar`.

### Entregas (`/admin/entregas`) — maior superfície
1. **Cabeçalho do form:** origem determinada pelo fluxo — `Entrega manual` (data default hoje) ou `Upload XML` (data/fornecedor/nota pré-preenchidos da NF).
2. **Campos novos:** `Data da entrega` (date, obrigatório), `Fornecedor` (autocomplete com sugestões + opção `Cadastrar fornecedor`), `Observações` (textarea, obrigatório se manual), `Número da nota` (obrigatório se XML).
3. **Linhas:** origem manual → somente ação `recebido`; origem XML → ações atuais com modal de justificativa (inalterado).
4. **Linha XML sem correspondência:** select ganha opção `Cadastrar novo item`; lista de sugestões (top 3) com confiança/motivo para seleção rápida; nenhuma associação automática.
5. **Modais inline** (item e fornecedor): abrem sobre o rascunho — fechar/cancelar não perde linhas nem XML parseado.

### Alunos por período (nova página `/admin/alunos`)
- 3 campos numéricos (Manhã/Tarde/Noite), validação > 0, botão `Salvar configuração`, feedback de sucesso/erro; estado vazio: `Configure os alunos por período...` com CTA.

### PainelCozinha (`/cozinha`)
- Campo `qtd-alunos` removido; receita escala pelo total do slot (config).
- Lançamento avulso: seleção de slot (4 opções) em vez de tipo; estado de config indisponível explícito.

### Planejamento (`/admin/planejamento`)
1. **Badge de alerta na célula:** quando o dia tem déficit projetado → badge `⚠ N item(ns) faltando` com tooltip por item (`Arroz −12,5 kg`).
2. **Painel colapsável "Projeção da semana"** abaixo da grade (disclosure nativo `<details>` — padrão da Fase 7): tabela `Item | Saldo atual | Consumo projetado | Saldo projetado final | 1º dia de ruptura`; linhas com ruptura em vermelho (`--erro`), sobra em verde; resumo `X item(ns) com ruptura prevista`; itens sem conversão como `não avaliável`.
3. **Banner não-bloqueante ao salvar:** lista refeições afetadas e itens faltantes; ação `Ver projeção` rola até o painel.
4. Config de alunos vazia → painel exibe a mensagem de ativação (não quebra a grade).

---

## Responsive and Accessibility Contract

- Grid do painel de projeção: tabela com `min-width: 0`, wrapping de nomes longos, sem overflow horizontal (padrão `DashboardGestao.css`).
- Badges/tooltips: tooltip via `title` nativo ou texto visível — nunca apenas hover; contraste `--erro` sobre `--erro-fundo` mantido (AA).
- Modais inline: foco inicial no primeiro campo, `Escape` fecha, retorno de foco ao abrir (padrão `PainelCozinha.tsx` `handleDialogKeyDown`).
- Autocomplete de fornecedor: navegável por teclado (setas + Enter), rótulo associado ao input (`aria-label`/`label`).
- Disclosure do painel: `<details>/<summary>` nativo (Fase 7), acionável por teclado.
- Viewports 320px/768px/desktop: sem clipping; campos date/textarea com largura fluida.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | — | not required |

Nenhum componente externo, ícone ou biblioteca de UI entra nesta fase (D-21: sem dependência nova).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (contrato acima fixa todos os textos novos)
- [ ] Dimension 2 Visuals: PASS (tokens existentes; badges/painel/banner especificados)
- [ ] Dimension 3 Color: PASS (apenas `--erro`, `--erro-fundo`, `--verde-vivo`, `--verde-tint`, `--texto-suave`, `--alerta`)
- [ ] Dimension 4 Typography: PASS (escala existente, sem novas famílias)
- [ ] Dimension 5 Spacing: PASS (escala 4/8/16/24/32/48/64)
- [ ] Dimension 6 Registry Safety: PASS (zero dependências novas)

**Approval:** pending (gerado em modo auto — revisar durante execução)
