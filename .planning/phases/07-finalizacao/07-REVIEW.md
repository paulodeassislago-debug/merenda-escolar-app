---
phase: 07-finalizacao
reviewed: 2026-08-04T22:30:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - frontend/src/pages/CardapioPublico.tsx
  - frontend/src/pages/CardapioPublico.css
  - .gitignore
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Fase 7: Relatório de Revisão de Código

**Revisado:** 2026-08-04T22:30:00Z
**Profundidade:** standard
**Arquivos revisados:** 3
**Status:** issues_found

## Sumário

Revisão adversária dos artefatos da fase 07 (PUBLIC-02): `CardapioPublico.tsx`, `CardapioPublico.css` e `.gitignore`, em modo standard com verificação cruzada do contrato real — endpoint `GET /publico/cardapio` (`backend/main.py:1118`), `SLOTS_PLANEJAMENTO` (`backend/main.py:41`), `fetchJson` (`frontend/src/api.ts`), rota pública `/cardapio` (`App.tsx:25`), `SLOTS_REFEICAO` (`admin/constants.ts:8`), 07-UI-SPEC.md e o modelo de ameaças T-07-01-01..04 do 07-01-PLAN.md. Gates executados nesta revisão: `npm run lint` ✅, `npm run build` ✅ (React 19.2.8 — `onToggle` nativo suportado).

**Avaliação geral:** o contrato é cumprido com fidelidade — normalização esparsa correta (nomes dos slots casam 1:1 com `SLOTS_PLANEJAMENTO` do backend), disclosure nome-only sem vazamento de campos técnicos (T-07-01-02 mitigado), nenhum vetor XSS (todos os nomes controlados pelo banco renderizados como texto React; nenhum `dangerouslySetInnerHTML`/HTML bruto — T-07-01-01 mitigado), rota e endpoint públicos preservados (T-07-01-03), copys exatos do contrato, estados loading/erro/vazio/parcial distintos, grid 1/2/4 colunas sem overflow e todos os tokens CSS existentes em `index.css`. Não há achados críticos. Os achados abaixo são dois warnings de correção de comportamento visível/estado e quatro itens de robustez.

## Warnings

### WR-01: `text-transform: capitalize` corrompe a data em pt-BR

**Arquivo:** `frontend/src/pages/CardapioPublico.css:47`
**Problema:** a regra `text-transform: capitalize` aplica caixa alta à primeira letra de **cada palavra** do texto. Como `toLocaleDateString('pt-BR', ...)` já retorna "segunda-feira, 4 de agosto de 2026", o resultado renderizado é **"Segunda-feira, 4 De Agosto De 2026"** — preposições "de" capitalizadas, fora do padrão pt-BR. A regra provavelmente foi adicionada para capitalizar "segunda-feira" (que já vem minúsculo do locale), mas afeta todas as palavras. É um defeito de renderização visível na superfície pública, principal vitrine da página.
**Fix:** remover a regra CSS (a saída de `toLocaleDateString('pt-BR')` já está correta em caixa baixa) ou, se a capitalização da primeira letra for desejada, fazê-la em JS:
```css
.publico-data {
  /* remover: text-transform: capitalize; */
}
```
```tsx
// alternativa JS, se quiser manter a primeira letra maiúscula:
function formatarDataHoje(): string {
  const texto = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1); // "Segunda-feira, 4 de agosto de 2026"
}
```

### WR-02: `ingredientesAbertos` não é limpo em `carregarCardapio` — rótulo do disclosure pode dessincronizar do DOM

**Arquivo:** `frontend/src/pages/CardapioPublico.tsx:51-59`
**Problema:** o retry limpa `erro`, `refeicoes` e `carregando` ("Clear transient state before retry" — mitigação documentada de T-07-01-04), mas não `ingredientesAbertos`. O rótulo do `<summary>` é derivado desse estado (`ingredientesAbertos[slot] ? 'Ocultar ingredientes' : 'Ver ingredientes'`, linha 127-129), enquanto a abertura real do `<details>` é nativa e não controlada. Se qualquer refetch futuro ocorrer com o registro populado (ex.: navegação por data, adiada no backlog da Fase 8; ou o duplo efeito do StrictMode em dev, que dispara dois fetches no mount), o `<details>` recém-renderizado nasce fechado mas exibirá "Ocultar ingredientes" — estado errado e auto-curável só na próxima interação do usuário. Hoje inalcançável pela UI (o botão de retry some ao ser clicado e não há refetch com disclosure aberto), mas o reset incompleto contradiz a mitigação declarada e o padrão dos outros estados.
**Fix:** adicionar o reset no início de `carregarCardapio`:
```tsx
const carregarCardapio = () => {
  setCarregando(true);
  setErro(null);
  setRefeicoes([]);
  setIngredientesAbertos({});
  fetchJson<RefeicaoPublica[]>('/publico/cardapio')
    .then((resposta) => setRefeicoes(resposta))
    .catch(() => setErro('Não foi possível carregar o cardápio de hoje. Tente novamente.'))
    .finally(() => setCarregando(false));
};
```

## Info

### IN-01: Corrida de respostas fora de ordem no loader (sem AbortController/sequenciamento)

**Arquivo:** `frontend/src/pages/CardapioPublico.tsx:55-58`
**Problema:** o ciclo fetch → `.then`/`.catch`/`.finally` não descarta respostas obsoletas. Com o StrictMode do React (habilitado em `main.tsx:7`), o efeito dispara dois fetches no mount em dev; se um falhar e o outro for bem-sucedido, um `.catch` tardio pode fixar `erro` mesmo com dados válidos já recebidos, e o `.finally` do primeiro pode zerar `carregando` antes do segundo terminar. O retry atual não permite clique duplo (o botão desmonta ao zerar `erro`), então o impacto é hoje limitado a dev; se um caminho de refetch for adicionado (navegação por data), torna-se explorável pelo usuário.
**Fix:** guardar o request atual e ignorar respostas obsoletas — ex.: contador/ref de sequência (`if (reqAtual !== id) return;`) ou `AbortController` no `useEffect` com cleanup.

### IN-02: Estado de carregamento sem anúncio a leitores de tela

**Arquivo:** `frontend/src/pages/CardapioPublico.tsx:83`
**Problema:** a mensagem `Carregando cardápio…` não tem `role="status"`/`aria-live="polite"`; a transição loading → conteúdo carregado é silenciosa para usuários de leitor de tela (o erro tem `role="alert"`, mas o sucesso e o vazio não são anunciados). O UI-SPEC exige estados compreensíveis sem depender só de cor/posição.
**Fix:** `{carregando && <p role="status" className="publico-aviso">Carregando cardápio…</p>}`.

### IN-03: Fallbacks `??` não cobrem string vazia — prato/ingrediente em branco

**Arquivo:** `frontend/src/pages/CardapioPublico.tsx:115, 134`
**Problema:** `nome_refeicao ?? 'A definir'` e `item_nome ?? 'Ingrediente não informado'` tratam apenas `null`. Os schemas do backend (`CardapioItemCreate.nome_refeicao: str` e `ItemCreate.nome: str` — `schemas.py:43,86`) aceitam `""` sem `min_length`; um item/prato criado com nome vazio via API renderiza um `<h2>` ou `<li>` em branco em vez dos fallbacks contratuais.
**Fix:** `refeicao.nome_refeicao?.trim() || 'A definir'` e `ingrediente.item_nome?.trim() || 'Ingrediente não informado'` (ou adicionar `min_length=1` nos schemas).

### IN-04: `.gitignore` não cobre backup sem sufixo de data

**Arquivo:** `.gitignore:2`
**Problema:** o padrão novo `backend/merenda.db.bak-*` ignora backups datados (ex.: `merenda.db.bak-20260804`), mas um backup como `backend/merenda.db.bak` (sem sufixo, produzido por qualquer script de backup que use esse nome) escaparia ao ignore — inconsistente com a intenção do commit `9e19682` ("ignorar backups do banco").
**Fix:** `backend/merenda.db.bak*` (remove o hífen) ou adicionar a linha `backend/merenda.db.bak`.

---

## Notas de conformidade confirmadas (sem ação)

- XSS (T-07-01-01): nenhum vetor — nomes do banco renderizados apenas como filhos de texto React; sem `dangerouslySetInnerHTML`, `innerHTML` ou atributos com conteúdo dinâmico; alt da logo estático.
- Divulgação de informação (T-07-01-02): `quantidade`/`medida_caseira` existem apenas no tipo de transporte; nenhum campo técnico chega ao JSX.
- Elevação de privilégio (T-07-01-03): `/cardapio` fora de `ProtectedRoute` (`App.tsx:25`); endpoint público preservado; regressão P1–P3 do `test_publico.py` cobre o contrato.
- Normalização esparsa: `SLOTS_REFEICAO` casa exatamente com `SLOTS_PLANEJAMENTO` do backend (`main.py:41`); ordem fixa garantida; duplicatas impossíveis (backend deduplica por chave `(dia_semana, tipo_refeicao)` em `_planejamento_ativo`).
- Copys: todos os textos exatos do contrato (07-UI-SPEC "Copywriting Contract") verificados linha a linha.
- CSS: grid 1/2/4 colunas nos breakpoints 600/960px, `minmax(0, 1fr)` + `min-width: 0`, `overflow-wrap: anywhere`, hit area de 44px no summary, `:focus-visible` verde, escala 4/8/16/24/32/48 e pesos 400/700 — todos os 13 tokens usados existem em `index.css`.

---

_Revisado: 2026-08-04T22:30:00Z_
_Reviewer: agente (gsd-code-reviewer)_
_Profundidade: standard_
