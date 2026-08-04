---
phase: 06
slug: cozinha-gestao-frontend
status: approved
shadcn_initialized: false
preset: none
created: 2026-08-03
---

# Phase 6 — UI Design Contract

> Contrato visual e de interação para a modernização do painel da cozinheira e do painel da secretaria.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — sistema manual existente |
| Preset | not applicable; não há `components.json` |
| Component library | none; React + HTML semântico e padrões CSS existentes |
| Icon library | none; usar texto, estados e controles nativos, sem dependência nova |
| Font | `var(--fonte-sans)` (`system-ui`, `-apple-system`, `Segoe UI`, sans-serif) |

Fonte: `.planning/PROJECT.md`, `AGENTS.md`, `frontend/src/index.css`, `Layout.css` e páginas admin. Tailwind permanece apenas como dependência/configuração existente; não é linguagem de componentes desta fase.

**Herança obrigatória:** as páginas continuam dentro de `Layout`/`ProtectedRoute`, herdam sidebar verde-escura, header branco e espaçamento do shell. A logo JPG só aparece no container branco já definido pelo shell; não renderizar a logo sobre verde, amarelo ou fundo transparente.

## Spacing Scale

Declarar e aplicar exclusivamente os valores abaixo, todos múltiplos de 4:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Espaço entre ícone/texto, bordas internas de badge |
| sm | 8px | Gap de controles, padding compacto de linhas |
| md | 16px | Padding de cards, grupos de formulário e linhas |
| lg | 24px | Padding de seções e distância entre blocos |
| xl | 32px | Gap entre colunas e blocos principais |
| 2xl | 48px | Respiro entre cabeçalho e conteúdo/áreas de trabalho |
| 3xl | 64px | Apenas estados vazios de página e áreas de destaque |

Exceptions: controles operacionais e botões devem ter `min-height: 44px` em telas touch; o shell legado pode manter a altura atual fora das superfícies desta fase. Não criar valores intermediários arbitrários.

## Typography

Usar somente quatro tamanhos e dois pesos nas duas páginas. Não usar serif, emoji como sinal de estado ou títulos decorativos.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label / supporting text | 14px | 600 | 1.5 |
| Heading | 20px | 600 | 1.2 |
| Display / primary metric | 28px | 600 | 1.2 |

Mapeamento: texto de tabela e ajuda pode usar Body; labels, badges, captions e metadados usam Label; títulos de página/seção e título do prato usam Heading; contagens de resumo da secretaria e quantidade de alunos em destaque usam Display. Preservar `var(--fonte-sans)` e `var(--texto)`; não introduzir fontes externas.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F7FAF5` / `var(--fundo)` | Fundo das páginas e áreas de respiro |
| Secondary (30%) | `#FFFFFF` / `var(--branco)` | Cards, tabelas, formulários, modal, header e container da logo |
| Accent (10%) | `#124C0F` / `var(--verde-escuro)` | Sidebar herdada, títulos operacionais, CTA primária, link ativo e bordas de seleção |
| Success | `#48BB2C` / `var(--verde-vivo)` | Confirmação de refeição/baixa, foco visível e estado estável; sempre acompanhado de texto |
| Warning / audit | `#C5D227` / `var(--amarelo)` | Slot pendente, divergência que exige justificativa e alerta de estoque baixo |
| Destructive | `#B3261E` / `var(--erro)` | Erro, sessão expirada e ações de remoção; somente em contexto destrutivo |

`var(--verde-tint)` (`#EDF4EA`) é a superfície auxiliar de seleção, sucesso e conteúdo auditável. Manter `var(--borda)` (`#D9E4D4`) para separação, nunca cinza azulado das telas legadas.

Accent reserved for: CTA `Confirmar refeição e dar baixa`, CTA de abrir o planejamento/entregas, títulos de página e seção, link ativo do shell e identificação do prato planejado. Não pintar todos os controles de verde; ações secundárias permanecem brancas com borda verde.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA — cozinha | `Confirmar refeição e dar baixa` |
| Primary CTA — gestão | `Abrir planejamento` (CTA complementar: `Ver entregas`) |
| Empty state — cozinha | Heading: `Nenhum planejamento para hoje` · Body: `A secretaria ainda não publicou um prato para este horário. Consulte o planejamento antes de lançar uma refeição.` |
| Empty state — slot ausente | `Pendente` · `Nenhum prato definido para este horário.` |
| Empty state — gestão | Heading: `Nenhum registro para esta data` · Body: `Não há registros para a data selecionada. Escolha outra data ou abra Planejamento/Entregas para cadastrar dados.` |
| Error state | `Não foi possível carregar os dados. Tente novamente.` + botão `Tentar novamente`; quando houver `ApiError.detail` acionável, mostrar o detalhe sem reescrevê-lo. Para 401: `Sua sessão expirou. Entre novamente.` |
| Success — cozinha | `Refeição registrada e estoque atualizado.` Só exibir depois de resposta 2xx e nova leitura dos dados. |
| Loading | `Carregando dados…` e, para receita, `Carregando receita…`; usar estado de progresso, não tela vazia silenciosa. |
| Audit helper | `Alterações, inclusões e remoções exigem justificativa por ingrediente para a prestação de contas do PNAE.` |
| Destructive confirmation | `Remover ingrediente`: não apagar a linha silenciosamente; manter a linha visível com quantidade `0`, badge `Removido` e campo obrigatório `Justificativa da remoção`. Cancelar/fechar com rascunho alterado exige confirmação `Descartar alterações?` / `Continuar editando` / `Descartar`. |

## UI Considerations

Applicable state considerations resolved: 17 covered, 2 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | Página cozinha e gestão | ✅ covered | Mostrar `Carregando dados…` em `role="status"` com `aria-live="polite"`; em refetch pós-submit manter contexto e desabilitar ações afetadas. |
| loading | Receita do prato selecionado | ✅ covered | Exigir quantidade positiva de alunos antes de carregar/mostrar a receita; manter slot selecionado, mostrar `Carregando receita…` no editor e não permitir confirmação antes da receita chegar. |
| error | Carga de qualquer página/seção | ✅ covered | Mostrar `role="alert"`, mensagem definida em Copywriting, detalhe do `ApiError` quando acionável e botão `Tentar novamente`; não usar `alert()` nativo. |
| error | POST de refeição | ✅ covered | Preservar modal, rascunho e justificativas; mostrar erro inline acima das ações. Refazer leitura relevante após falha para evitar saldo/planejamento stale. |
| session | 401 em cozinha/gestão | ✅ covered | Mensagem explícita de sessão expirada, sem mascarar como falha de rede; manter caminho para nova entrada pelo fluxo de autenticação existente. |
| empty | Quatro slots do dia | ✅ covered | Sempre renderizar `Lanche da Manhã`, `Almoço`, `Lanche da Tarde`, `Janta`; entrada ausente é `Pendente`, não erro. Lanches continuam visualmente separados, embora o POST use tipo `Lanche`. |
| empty | Gestão: estoque, refeições, planejamento, entregas | ✅ covered | Cada seção mostra heading/body de vazio e CTA/navegação correspondente; listas vazias não quebram cards nem tabelas. |
| populated | Cozinha | ✅ covered | Card do slot mostra horário/slot, prato e vigência; editor mostra alunos e receita retornada pela API, nunca `cardapiosPadrao`. |
| populated | Gestão | ✅ covered | Compor somente `/itens`, `/refeicoes`, `/planejamento` e `/entregas`; exibir dados observáveis e contagens da resposta, sem inventar KPI ou usar `/admin/dashboard`. |
| partial | Planejamento do dia | ✅ covered | Mistura de slots preenchidos e ausentes é normal; cada card mantém seu próprio estado e a página continua utilizável. |
| audit | Ingredientes divergentes | ✅ covered | Quantidade alterada, ingrediente incluído ou removido revela justificativa no próprio row antes de habilitar confirmação; texto é enviado e permanece visualmente associado à linha. |
| zero-one-many | Métricas e listas da gestão | ✅ covered | Exibir `0` explicitamente; um registro usa o mesmo componente de lista; muitos registros usam tabela/lista com overflow controlado. |
| overflow | Tabelas e nomes/justificativas longos | ✅ covered | Permitir quebra de nomes e justificativas; encapsular tabela em rolagem horizontal somente no container, sem overflow no body; modal tem rolagem vertical própria. |
| success | Confirmação de refeição | ✅ covered | Banner `Refeição registrada e estoque atualizado.` fica no contexto do slot confirmado e some ao trocar data/slot. Não marcar os dois slots de lanche juntos: a API não fornece status persistente por slot. |
| validation | Campos do editor | ✅ covered | Alunos deve ser informado primeiro como inteiro positivo; somente então a receita é exibida e cada quantidade inicial é `quantidade_base × alunos`. Quantidades não negativas; item, quantidade e medida devem existir. Medida é obrigatoriamente um `select` com conversões previamente cadastradas para o item; sem opções, bloquear confirmação e orientar o cadastro pelo admin. Erros aparecem próximos ao campo e também no resumo do formulário. Escala, conversão, auditoria e baixa ficam alinhadas no backend. |
| long-text | Justificativa e `ApiError.detail` | 🧪 backstop | Texto deve quebrar, conservar espaços/acentos e permanecer legível em largura mobile; verificar manualmente com texto longo. |
| responsive | Modal/editor e dashboard | 🧪 backstop | Verificar manualmente em 320px, 768px e desktop: nenhuma ação ou justificativa pode sair da viewport. |

## Component and Interaction Inventory

### Painel da cozinheira (`/cozinha`)

1. **Cabeçalho operacional:** título `Painel da cozinha`, data de referência legível e controle nativo de data com label visível. CTA `Atualizar dados` é secundária; não exibir cardápio fixo. **Focal point:** o slot selecionado e a CTA `Confirmar refeição e dar baixa` devem dominar a hierarquia visual.
2. **Grade de quatro slots:** quatro cards em ordem fixa. Card preenchido é selecionável por botão/link com nome do prato, slot, `data_inicio_vigencia` formatada e estado `Disponível`. Card ausente é não selecionável, amarelo apenas como estado pendente e texto definido acima.
3. **Editor de refeição:** abrir `dialog` acessível ao selecionar um card, mas começar por uma etapa de quantidade de alunos. O bloco de receita permanece oculto até um inteiro positivo ser informado. Depois, o título combina slot e prato, por exemplo `Almoço — Arroz com feijão`, e cada ingrediente mostra a quantidade final calculada para aqueles alunos.
4. **Receita auditável:** cada item mostra quantidade-base, quantidade final (`base × alunos`), quantidade atual editável, um `select` de medidas/conversões cadastradas para o item e estado. Quantidade atual diferente da quantidade final esperada revela imediatamente textarea `Justificativa da alteração`. O controle textual `Adicionar ingrediente` abre a seleção de um item do catálogo e carrega as opções previamente cadastradas antes de criar a linha como `Adicionado` com justificativa obrigatória; removido permanece como `Removido`, quantidade `0` e justificativa obrigatória. Não há campo livre para unidade ou peso de conversão.
5. **Revisão antes do envio:** bloco `Revise antes de confirmar` lista alunos, prato, ingredientes divergentes e justificativas; a CTA fica no rodapé do editor e usa `salvando` durante POST.
6. **Contrato de confirmação:** preservar o slot selecionado no estado visual, mapear os dois slots de lanche para tipo de refeição `Lanche` apenas no payload e não enviar `id_usuario`. Após 2xx, refazer leitura e mostrar sucesso; em erro, manter o rascunho editável.

### Painel da secretaria (`/gestao`)

1. **Cabeçalho e filtro:** título `Gestão da merenda`, subtítulo operacional, data selecionada e botão `Atualizar dados`. Todas as seções refletem a data, salvo estoque que representa o saldo atual. **Focal point:** o resumo de estoque/refeições e os CTAs `Abrir planejamento` e `Ver entregas` devem orientar a primeira leitura.
2. **Resumo curto:** cards com `Itens cadastrados`, `Itens em baixo estoque`, `Refeições na data` e `Entregas na data`. Valores zero continuam visíveis; não chamar `/admin/dashboard`.
3. **Estoque real:** seção com saldo convertido para unidade de exibição (`saldo_atual / fator_conversao` quando aplicável), unidade oficial e status textual `Baixo estoque` ou `Estável`. O limiar de 5 é aplicado na unidade exibida. Nunca mostrar saldo interno como se fosse Pacote, Dúzia ou outra unidade livre.
4. **Refeições e planejamento:** seção de refeições reais com prato, tipo/slot quando disponível, alunos e ajustes/justificativas visíveis; seção de planejamento com os quatro slots e pendências. Não inferir status durável dos dois slots de lanche a partir de uma lista agrupada por tipo.
5. **Entregas reais:** mostrar data/hora, quantidade de itens e usuário/identificador retornado; permitir `Ver entregas` via `/admin/entregas`. O link `Abrir planejamento` usa `/admin/planejamento`. Nenhum link deve levar à rota legada `/estoque`.
6. **Estados por seção:** uma falha em estoque não deve esconder dados já carregados de refeições, planejamento ou entregas; indicar a seção afetada e oferecer retry local ou global.

## Responsive and Accessibility Contract

- **Breakpoints:** a partir de 1024px, gestão usa grade de quatro cards e cozinha usa grade de quatro slots; entre 768px e 1023px, usar duas colunas; abaixo de 768px, uma coluna e controles em largura total. Herdar a transformação do `Layout` para sidebar no topo em telas estreitas.
- **Mobile:** editor/dialog ocupa quase toda a viewport com padding de 16px, rolagem vertical interna e ações empilhadas; não usar tabela de ingredientes que exija rolagem horizontal. Tabelas da gestão podem rolar horizontalmente dentro de container identificado.
- **Touch/keyboard:** controles primários, selects, inputs, fechar e retry têm alvo mínimo de 44px; ordem de tab segue leitura; `:focus-visible` usa contorno verde-vivo com contraste; não depender de hover.
- **Semântica:** usar `main`, `header`, `section` com heading hierárquico, labels associados por `htmlFor`, tabela com `th scope="col"`, botões para ações e links para navegação. Status de loading usa `role="status"`; falhas usam `role="alert"`.
- **Dialog:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, fechamento por Esc e botão textual `Fechar`; conter o foco dentro do dialog enquanto aberto, com foco entrando no título/primeiro campo e retornando ao card que abriu o editor. Usar `aria-describedby` para o texto de auditoria/erro quando existir. Não fechar ao clicar fora se houver rascunho sem confirmação.
- **Formulários:** quantidade de alunos recebe foco antes do editor e campos inválidos recebem `aria-invalid="true"` e `aria-describedby`; justificativa fica ao lado da linha correspondente e é obrigatória para qualquer divergência da quantidade final esperada. Não ocultar exigências somente por cor.
- **Contraste:** manter texto principal `var(--texto)` e headings `var(--verde-escuro)` em superfícies claras; badges sempre trazem texto (`Pendente`, `Baixo estoque`, `Removido`, `Confirmado`), não apenas cor.
- **Conteúdo dinâmico:** mensagens de sucesso/erro e mudanças de loading devem ser anunciadas sem mover o foco de forma inesperada; renderizar conteúdo da API como texto React, nunca HTML injetado.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | Nenhum bloco externo; não há shadcn inicializado | not applicable — `components.json` ausente e nenhum registry declarado |

## Implementation Boundaries

- Alterar somente as superfícies de UI necessárias em `PainelCozinha.tsx/.css` e `DashboardGestao.tsx/.css`, além de tipos/helpers se o shape existente realmente exigir. A única alteração backend permitida é a leitura autorizada de conversões para a cozinheira, acompanhada de teste de autorização; não alterar regras de negócio, `Layout`, identidade global ou código não relacionado.
- Todas as chamadas passam por `fetchJson`/`fetchWithAuth`; não usar `fetch` cru, host literal, `/estoque`, `/refeicoes/lancar`, `cardapiosPadrao` ou `id_usuario` hardcoded. A única alteração de backend permitida é autorizar leitura de `/conversoes` para a cozinheira, mantendo POST/DELETE admin-only.
- Reutilizar `SLOTS_REFEICAO`, `TIPOS_REFEICAO`, `LIMIAR_BAIXO_ESTOQUE`, classes/tokens e padrões de estados das páginas admin. CSS continua plain e co-localizado. Medidas da cozinha são sempre selecionadas de conversões existentes; não usar input livre, `peso_em_kg` ad hoc ou mutação de conversões.
- Validar visual e funcionalmente com `npm run build`, `npm run lint`, suíte backend e fluxos manuais F13–F15. Playwright, tema escuro, novos endpoints de agregação e cardápio público permanecem fora desta fase.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved by gsd-ui-checker after measure-select responsibility refinement on 2026-08-03
