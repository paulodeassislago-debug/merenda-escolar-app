# Phase 8 — Pattern Map

> Análogos de código para as frentes da Fase 8. Extraído de CONTEXT.md e da análise do código existente.

---

## Frente 1 — Limiar de item (IMP-01/02)

| Novo trabalho | Análogo existente | Trechos-chave |
|---------------|-------------------|---------------|
| `Item.limiar` + validação 400 | `backend/schemas.py` `ItemCreate/Update` (L43-56) | Padrão `Field(max_length=50)`; adicionar `limiar: float = Field(5.0, gt=0)` |
| Dashboard críticos por item | `backend/main.py` `dashboard_admin` L1068-1078 | `saldo_atual / (fator_conversao or 1.0) < LIMIAR_BAIXO_ESTOQUE` → trocar constante por `i.limiar` |
| Badge de item | `frontend/src/pages/admin/Itens.tsx` L315, L329 | `saldo / fator < LIMIAR_BAIXO_ESTOQUE` → `< item.limiar` |
| Texto dinâmico | `frontend/src/pages/DashboardGestao.tsx` L241, L253 | `saldoExibicao(item) < item.limiar`; remover import da constante |

## Frente 2 — Entregas origem/fornecedor (IMP-06/07/08)

| Novo trabalho | Análogo existente | Trechos-chave |
|---------------|-------------------|---------------|
| Validação por origem | `backend/main.py` `registrar_entrega` L757-787 | Bloco "validar tudo antes de gravar"; `ACOES_ENTREGA_VALIDAS` L42 |
| Fornecedores CRUD | `backend/main.py` rotas `/conversoes` L301-373 | Padrão GET lista + POST cria com `require_perfil` |
| Autocomplete fornecedor | `frontend/src/pages/admin/nfe.ts` `normalizarTexto` L31-37 | Base do matching (ver Frente 6) |
| Form/XML prefill | `frontend/src/pages/admin/Entregas.tsx` L330 (`parseNfe`) + `nfe.ts` L64-68 | `ide.nNF` → nota; `emit.xNome` → fornecedor; `ide.dhEmi` → data |

## Frente 3 — Item inline (IMP-03)

| Novo trabalho | Análogo existente | Trechos-chave |
|---------------|-------------------|---------------|
| Modal com form de item | `frontend/src/pages/admin/Itens.tsx` form L100-165 | Campos nome/unidade_oficial/saldo/unidade_interna/fator_conversao (+limiar) |
| Preservar rascunho | `frontend/src/pages/admin/Entregas.tsx` estados `linhas`, `numeroNota`, `emitente` L41-44 | Modal não reseta esses estados |
| Endpoint inline | `backend/main.py` `criar_item` L181-224 | Mesma validação; `require_perfil("admin", "secretaria")` |

## Frente 4 — Alunos por período (IMP-09/10)

| Novo trabalho | Análogo existente | Trechos-chave |
|---------------|-------------------|---------------|
| Tabela config + endpoints | `backend/models.py` `Conversao` L46-56 (tabela simples) | Padrão de tabela de configuração com FK de usuário |
| Derivação de slot | `frontend/src/pages/PainelCozinha.tsx` `tipoParaLancamento` L59-61 | Lanche da Manhã/Tarde → `Lanche` |
| Lançamento sem input de alunos | `backend/main.py` `lancar_refeicao_v2` L898-982 | Escala por aluno L947; `RefeicaoCreate` L165-171 |
| Diálogo PainelCozinha | `PainelCozinha.tsx` `handleDialogKeyDown` L245-266 | Padrão de acessibilidade de diálogo (reusar no modal inline) |

## Frente 5 — Projeção (IMP-11)

| Novo trabalho | Análogo existente | Trechos-chave |
|---------------|-------------------|---------------|
| Simulação por slot | `backend/main.py` `_planejamento_ativo` L569-582 + `cardapio_publico` L1118-1148 | Iterar slots na ordem canônica |
| Conversão para kg/L | `backend/main.py` `_converter_para_unidade_oficial` L871-894 | Reuso direto (erro → "não avaliável" em vez de 400) |
| Disclosure colapsável | `frontend/src/pages/CardapioPublico.tsx` (Fase 7) | `<details>/<summary>` nativo com rótulos alternados |
| Grade com badge | `frontend/src/pages/admin/Planejamento.tsx` L253-309 | Célula da tabela → adicionar badge condicional |

## Frente 6 — Matching (IMP-04/05)

| Novo trabalho | Análogo existente | Trechos-chave |
|---------------|-------------------|---------------|
| `matching.ts` | `frontend/src/pages/admin/nfe.ts` `normalizarTexto` L31-37 | Expandir para tokens + abreviações + score |
| Sugestões na UI | `Entregas.tsx` select de linha L283-301 | Lista de sugestões abaixo do select |

## Convenções transversais

- **`import type`** para imports de tipos (tsconfig `verbatimModuleSyntax`).
- **CSS co-localizado** (`*.css` ao lado do componente), tokens de `index.css`.
- **Regra react-refresh:** lógica sem JSX em arquivo separado (`matching.ts` como `nfe.ts`).
- **Backend:** validar tudo antes de persistir; `require_perfil` explícito; mensagens de erro com o nome do item.
- **Testes:** padrão `_auth(token)` + helpers `_criar_item`; fixtures `admin_token/secretaria_token/cozinheira_token`.
- **Regressão:** `SLOTS_REFEICAO` (constants.ts) é a ordem canônica dos quatro slots; `SLOTS_PLANEJAMENTO` (main.py L41) é o espelho backend.
