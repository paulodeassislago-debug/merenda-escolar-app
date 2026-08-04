---
phase: 05-páginas-admin-frontend
reviewed: 2026-08-02T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - frontend/src/pages/admin/Cardapio.tsx
  - frontend/src/pages/admin/Cardapio.css
  - frontend/src/pages/admin/Dashboard.tsx
  - frontend/src/pages/admin/Dashboard.css
  - frontend/src/pages/admin/Entregas.tsx
  - frontend/src/pages/admin/Entregas.css
  - frontend/src/pages/admin/Itens.tsx
  - frontend/src/pages/admin/Itens.css
  - frontend/src/pages/admin/nfe.ts
  - frontend/src/pages/admin/Planejamento.tsx
  - frontend/src/pages/admin/Planejamento.css
  - frontend/src/pages/admin/Receitas.tsx
  - frontend/src/pages/admin/Receitas.css
  - frontend/src/pages/admin/Usuarios.tsx
  - frontend/src/pages/admin/Usuarios.css
  - frontend/src/pages/admin/constants.ts
  - frontend/src/pages/admin/Entregas.tsx
findings:
  critical: 2
  warning: 4
  info: 4
  total: 10
status: issues_found
---

# Phase 5: Code Review Report — Páginas Admin Frontend

**Reviewed:** 2026-08-02
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Reviewed all 17 files in `frontend/src/pages/admin/` for Phase 05 (Páginas Admin Frontend): 8 TSX components, 7 co-located CSS files, 1 constants module, and 1 NF-e parser utility. The review also cross-referenced the shared `types.ts`, `api.ts`, and `index.css` tokens.

**High-level assessment:** The pages are structurally sound — they follow the co-located CSS convention (D-01), use `var(--*)` design tokens consistently, implement proper loading/error/empty/data state transitions, and route all API calls through the centralized `fetchJson` client. No hardcoded secrets, no hardcoded URLs, no `dangerouslySetInnerHTML`, no `alert()`, and no `id_usuario: 1` legacy anti-pattern were found.

**Critical issues found in 2 files:**
1. **Entregas.tsx** — Quantity-change flow is broken: `acao` is never set to `'alterado'`, and cancelled quantity changes are not reverted.
2. **Planejamento.tsx** — Partial save failure leaves inconsistent client/server state with no recovery path.

These must be fixed before this code ships to production.

---

## Critical Issues

### CR-01: Entregas.tsx — Ação `'alterado'` nunca é aplicada; reversão de quantidade quebrada

**File:** `frontend/src/pages/admin/Entregas.tsx:150-218`

**Issue:** The quantity-change justification flow has three interrelated defects:

**Defect A — `acao` nunca é definida como `'alterado'` (linha 159):**
`atualizarQuantidade` (linhas 150–164) atualiza `quantidade` no estado mas nunca define `acao: 'alterado'`. A função `confirmarJustificativa` (linhas 186–199) apenas escreve `justificativa`, sem atualizar `acao`. Consequência: itens com quantidade modificada pelo usuário são enviados ao backend com `acao: 'recebido'` — incorreto, pois perde a trilha de auditoria exigida pelo PNAE (UI-SPEC §5.7, linha 167: "Triggered by: changing a parsed quantity (→ `alterado`)").

**Defect B — Quantidade não é revertida ao cancelar (linhas 201–218):**
`cancelarJustificativa` reverte `acao` para `'recebido'` (linha 213), mas a quantidade já foi alterada pelo `setLinhas` na linha 159 e NÃO é revertida. O spread `...l` preserva o valor mutado. Se o usuário digitar uma quantidade errada e cancelar a justificativa, a quantidade incorreta persiste mas com badge "Recebido" — o dado fica silenciosamente corrompido.

**Defect C — Guarda de UI ignora linhas com quantidade alterada sem `acao: 'alterado'` (linhas 284–294):**
A validação `semJustificativa` filtra por `l.acao === 'alterado' || l.acao === 'excluído'`. Como `acao` nunca é `'alterado'`, linhas com quantidade modificada passam por essa guarda mesmo sem justificativa — a exigência de justificativa do PNAE (D-10) é contornada.

**Fix:**
```typescript
// Corrigir atualizarQuantidade: não alterar quantidade antes da confirmação
const atualizarQuantidade = (index: number, quantidade: number) => {
  const linha = linhas[index];
  if (!linha) return;
  if (linha.acao !== 'alterado' && linha.quantidade !== quantidade) {
    // Apenas abre o modal — NÃO altera quantidade ainda
    setJustificativaPendente({ index, acao: 'alterado', quantidadePendente: quantidade });
    return; // NÃO chama setLinhas
  }
  // Caso já seja 'alterado', permite editar livremente
  setLinhas((prev) =>
    prev.map((l, i) => (i === index ? { ...l, quantidade } : l)),
  );
};

// Corrigir confirmarJustificativa: aplicar acao + quantidade pendente
const confirmarJustificativa = () => {
  if (!justificativaPendente || textoJustificativa.trim() === '') return;
  const { index, acao } = justificativaPendente;
  setLinhas((prev) =>
    prev.map((l, i) => {
      if (i !== index) return l;
      const updates: Partial<LinhaEdicao> = { justificativa: textoJustificativa.trim() };
      if (acao === 'alterado') {
        updates.acao = 'alterado';
        // Aplicar quantidade pendente (armazenada em justificativaPendente)
      }
      if (acao === 'excluído') {
        updates.acao = 'excluído';
        updates.removida = true;
      }
      return { ...l, ...updates };
    }),
  );
  setJustificativaPendente(null);
  setTextoJustificativa('');
};

// Corrigir cancelarJustificativa: reverter tudo (quantidade não foi alterada)
const cancelarJustificativa = () => {
  if (!justificativaPendente) return;
  // Se a quantidade nunca foi aplicada (defect A corrigido), não há o que reverter
  // Apenas para exclusão: reverter removida + acao
  const { index, acao } = justificativaPendente;
  if (acao === 'excluído') {
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, removida: false, acao: 'recebido' } : l,
      ),
    );
  }
  setJustificativaPendente(null);
  setTextoJustificativa('');
};
```

O tipo `justificativaPendente` precisa ser estendido para carregar `quantidadePendente?: number`.

---

### CR-02: Planejamento.tsx — Falha parcial no salvamento deixa estado cliente/servidor inconsistente

**File:** `frontend/src/pages/admin/Planejamento.tsx:123-174`

**Issue:** `handleSalvar` itera sobre 28 slots (7 dias × 4 slots de planejamento) com `await` sequencial em cada API call alterada (linhas 136–164). Se o slot N falhar (ex.: erro de rede, validação do backend), os slots 1 a N−1 já foram persistidos no servidor, mas:

1. O `catch` na linha 169 define `erro` e **não chama** `carregarDados()` — a refetch está dentro do `try` (linha 167). O estado `entradas` permanece stale com os valores pré-save.
2. Se o usuário corrigir o erro e clicar "Salvar planejamento" novamente, `mapaVigente` (linhas 130–133) é construído com dados stale. Slots já salvos serão comparados contra valores antigos e reenviados — o backend pode criar duplicatas (se o POST não for idempotente) ou retornar erros inesperados.

**Impacto:** Corrupção silenciosa do planejamento semanal. O usuário vê "Falha ao salvar" mas não sabe que parte dos dados já foi aplicada. A UI mostra estado inconsistente com o banco.

**Fix:**
Duas abordagens possíveis:

**Abordagem A (recomendada — simplicidade):** Mover o refetch para o `finally` ou para o `catch` após capturar o erro:

```typescript
} catch (e) {
  setErro(e instanceof ApiError ? e.message : 'Falha ao salvar o planejamento. Tente novamente.');
  // Refetch para sincronizar com servidor após falha parcial
  await carregarDados();
} finally {
  setSalvando(false);
}
```

**Abordagem B (mais robusta — salvar tudo ou nada):** Enviar todos os slots alterados em uma única chamada (batch endpoint no backend). Essa abordagem exigiria mudanças no backend e está fora do escopo da fase. A abordagem A é suficiente para este phase.

---

## Warnings

### WR-01: Entregas.tsx — `style={{}}` inline viola UI-SPEC anti-pattern

**File:** `frontend/src/pages/admin/Entregas.tsx:708-712`

**Issue:** O textarea de justificativa usa `style={{}}` inline para alternar entre `var(--amarelo)` e `var(--borda)`. A UI-SPEC (linha 31) lista explicitamente `inline style={{}}` como anti-pattern que "never ships in this phase." O comportamento já é parcialmente implementado via classes CSS (`.campo-auditoria` e `.campo-auditoria-preenchido`), mas as classes não aplicam a troca de borda — recaem no `style` inline.

**Fix:**
Remover o `style` inline e implementar a alternância via classes CSS:

```css
/* Entregas.css */
.campo-auditoria {
  border: 1px solid var(--amarelo);
}

.campo-auditoria-preenchido {
  border: 1px solid var(--borda);
}
```

No TSX, usar apenas a classe:
```tsx
<textarea
  className={`form-input campo-auditoria${textoJustificativa.trim() ? ' campo-auditoria-preenchido' : ''}`}
  ...
/>
```

Nota: A classe `.campo-auditoria-preenchido` já está referenciada no TSX (linha 703) mas não está definida no CSS. Basta adicioná-la.

---

### WR-02: Receitas.tsx — Sem guarda para `cardapioId` inválido (NaN)

**File:** `frontend/src/pages/admin/Receitas.tsx:11-12`

**Issue:** `const cardapioId = Number(id)` onde `id` vem de `useParams`. Se o usuário navegar para `/admin/receitas/` (sem ID) ou `/admin/receitas/abc`, `Number(undefined)` ou `Number('abc')` resulta em `NaN`. O componente fará chamadas fetch para `/cardapio/NaN/receita`, `/itens`, e `/cardapio` — a Promise.all retornará erro de rede, mas a mensagem de erro será genérica ("Não foi possível carregar os dados"). O usuário não recebe feedback claro de que a rota é inválida.

**Fix:**
```typescript
const cardapioId = Number(id);

// Guarda logo após o parse
if (isNaN(cardapioId) || cardapioId <= 0) {
  return (
    <div className="aviso aviso-erro" role="alert">
      ID do prato inválido. Volte ao cardápio e selecione um prato.
    </div>
  );
}
```

---

### WR-03: Múltiplas páginas — Tratamento de erro 401 inconsistente

**Files:**
- `frontend/src/pages/admin/Dashboard.tsx:15-34`
- `frontend/src/pages/admin/Usuarios.tsx:44-65`
- `frontend/src/pages/admin/Cardapio.tsx:44-65`
- `frontend/src/pages/admin/Receitas.tsx:57-87`
- `frontend/src/pages/admin/Planejamento.tsx:91-120`

**Issue:** Apenas `Itens.tsx` e `Entregas.tsx` detectam `err.status === 401` para exibir "Sua sessão expirou. Entre novamente." (UI-SPEC linha 118). As outras 5 páginas mostram a mensagem de erro genérica para 401, o que não orienta o usuário a fazer re-login. A UI-SPEC exige esse tratamento (Copywriting Contract — Error state 401 mid-session).

**Fix:** Adicionar a checagem de 401 em todos os blocos catch de fetch inicial. Padrão a replicar (do `Itens.tsx`):

```typescript
.catch((err) => {
  if (!cancelled) {
    if (err instanceof ApiError && err.status === 401) {
      setErro('Sua sessão expirou. Entre novamente.');
    } else {
      setErro(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os dados. Verifique se o backend está rodando.',
      );
    }
  }
})
```

---

### WR-04: Dashboard.tsx — Falta botão "Tentar novamente" no estado de erro

**File:** `frontend/src/pages/admin/Dashboard.tsx:43-49`

**Issue:** A UI-SPEC (linha 116) especifica: "Error state (load failure): ... + inline 'Tentar novamente' button." O Dashboard exibe apenas o texto de erro sem botão de retry. O usuário precisa recarregar a página manualmente (F5) para tentar novamente.

Diferente das outras páginas CRUD, o Dashboard não tem função `carregarDados` definida — o fetch é inline no `useEffect`. Isso impossibilita um botão de retry sem refatoração.

**Fix:**
1. Extrair a lógica de fetch para uma função nomeada (padrão das outras páginas):
```typescript
const carregarDashboard = () => {
  setCarregando(true);
  setErro(null);
  fetchJson<DashboardResponse>('/admin/dashboard')
    .then(setDados)
    .catch(/* ... */)
    .finally(() => setCarregando(false));
};
```
2. Adicionar botão no estado de erro:
```tsx
{erro && (
  <div className="aviso aviso-erro" role="alert">
    <p>{erro}</p>
    <button type="button" className="btn-secundario" onClick={carregarDashboard}>
      Tentar novamente
    </button>
  </div>
)}
```

---

## Info

### IN-01: Duplicação massiva de CSS entre 6 arquivos de página

**Files:** `Usuarios.css`, `Itens.css`, `Cardapio.css`, `Receitas.css`, `Entregas.css`, `Planejamento.css`

**Issue:** Cada arquivo CSS replica as mesmas regras para `.modal-overlay`, `.modal-content`, `.btn-primario`, `.btn-secundario`, `.btn-perigo`, `.form-input`, `.form-group`, `.tabela`, `.aviso`, `.alerta-erro`, etc. Embora a convenção D-01 exija CSS co-localizado por página, a duplicação de ~200 linhas por arquivo aumenta o custo de manutenção (alterar um token de botão exige editar 6 arquivos).

**Mitigação atual:** Como as páginas são carregadas via React.lazy com code-splitting, cada página baixa apenas seu próprio CSS. A duplicação não causa download redundante no runtime.

**Sugestão (fora do escopo desta fase):** Consolidar os estilos compartilhados em `src/styles/admin-shared.css` importado por cada página, mantendo apenas estilos específicos nos arquivos co-localizados.

---

### IN-02: Entregas.tsx — `abrirDetalhe` engole erros silenciosamente

**File:** `frontend/src/pages/admin/Entregas.tsx:111-118`

**Issue:** O bloco catch está vazio (`} catch {`). Se o fetch de detalhes da entrega falhar (rede, 404), o modal simplesmente não abre — sem feedback ao usuário. Embora seja intencional como UX (falha silenciosa para não bloquear a listagem), um `console.error` ou toast seria útil para debugging.

```typescript
} catch {
  // Silencioso — o modal não abre
  console.error('Falha ao carregar detalhes da entrega', id);
}
```

---

### IN-03: Entregas.tsx — Non-null assertion `l.itemId!` no payload

**File:** `frontend/src/pages/admin/Entregas.tsx:300`

**Issue:** `item_id: l.itemId!` usa o operador non-null assertion do TypeScript. Embora a guarda de UI em `podeSubmeter()` (linha 341) verifique `l.itemId === null`, e `handleSubmit` tenha sua própria validação (linhas 273–281), o `!` é frágil — se a validação for removida acidentalmente no futuro, o tipo `null` seria enviado como `item_id`.

**Sugestão:** Substituir por validação explícita no map do payload ou usar uma função auxiliar que retorne apenas linhas válidas tipadas corretamente.

---

### IN-04: Receitas.tsx — `nomeItem()` chamado por render com `.find()`

**File:** `frontend/src/pages/admin/Receitas.tsx:89-92`

**Issue:** A função `nomeItem` é chamada durante renderização para cada linha da tabela (linhas 297, 341, 380), executando `itens.find()` O(n) por linha. Com ~20 itens e ~10 ingredientes, o custo é insignificante (200 iterações). Só se tornaria problemático com centenas de itens.

**Sugestão (opcional):** Criar um `Map<number, string>` memoizado se o catálogo de itens crescer significativamente:

```typescript
const itemNomeMap = useMemo(
  () => new Map(itens.map((i) => [i.id, i.nome])),
  [itens],
);
const nomeItem = (itemId: number): string => itemNomeMap.get(itemId) ?? '';
```

---

_Reviewed: 2026-08-02_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
