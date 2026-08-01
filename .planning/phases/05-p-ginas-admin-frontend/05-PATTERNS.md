# Phase 5: Páginas Admin (Frontend) - Pattern Map

**Mapped:** 2026-08-01
**Files analyzed:** 12 (7 páginas novas + 7 CSS co-localizados + 2 helpers .ts + 2 arquivos modificados)
**Analogs found:** 10 / 12 (2 arquivos sem análogo direto: grade de Planejamento e parser de XML NF-e)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/pages/admin/Dashboard.tsx` (substituir placeholder) | component (page) | request-response (read-only agregado) | `src/pages/DashboardGestao.tsx` + `src/pages/CardapioPublico.tsx` | role-match |
| `src/pages/admin/Dashboard.css` (novo) | style | — | `src/pages/CardapioPublico.css` | role-match |
| `src/pages/admin/Usuarios.tsx` + `.css` (novos) | component (page) | request-response CRUD (tabela + modal) | `src/pages/Login.tsx` (form) + `src/pages/DashboardGestao.tsx` (tabela/estados) + `src/pages/PainelCozinha.tsx` (modal) | composite |
| `src/pages/admin/Itens.tsx` + `.css` (novos) | component (page) | request-response CRUD + badge baixo estoque + conversões | composite de Usuarios + `DashboardGestao.tsx:93-100` (saldo/badge) | composite |
| `src/pages/admin/Cardapio.tsx` + `.css` (novos) | component (page) | request-response CRUD + navegação p/ Receitas | composite de Usuarios | composite |
| `src/pages/admin/Receitas.tsx` + `.css` (novos) | component (page) | request-response CRUD (recurso aninhado, `useParams`) | composite de Usuarios (sem análogo de `useParams` no código de páginas) | partial |
| `src/pages/admin/Planejamento.tsx` + `.css` (novos) | component (page) | request-response (grade 7×4 com upsert) | `src/pages/PainelCozinha.tsx` (select de refeição) — sem análogo de grade | partial |
| `src/pages/admin/Entregas.tsx` + `.css` (novos) | component (page) | request-response + file-I/O (upload XML) | `src/pages/PainelCozinha.tsx` (modal) — sem análogo de file upload | partial |
| `src/pages/admin/constants.ts` (novo, helpers/constantes) | utility | — | `src/auth-context.ts` (precedente de split `.ts` p/ lint react-refresh) | role-match |
| `src/pages/admin/nfe.ts` (novo, parser NF-e) | utility | transform (XML → linhas da tabela) | nenhum — usar RESEARCH.md §"Parse NF-e" | **no analog** |
| `src/App.tsx` (modificar — 6 rotas) | route config | — | ele mesmo (`App.tsx:22-31`) | exact |
| `src/types.ts` (modificar — ~10 interfaces) | types | — | ele mesmo (`types.ts:22-35`, seção auth) | exact |

**NÃO modificar:** `src/components/Layout.tsx` — `NAV_POR_PERFIL` (linhas 18-35) já contém todos os links admin/secretaria; D-06 cumprido pela Phase 4. Também NÃO tocar em `PainelCozinha.tsx`/`DashboardGestao.tsx` (débito da Phase 6).

---

## Pattern Assignments

### `src/App.tsx` (modificar) — registro de rotas

**Analog:** ele mesmo. Adicionar 6 rotas seguindo o bloco existente.

**Imports pattern** (linhas 1-10 — um import por página, default imports):
```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/admin/Dashboard';
```

**Core route pattern** (linhas 22-31 — replicar verbatim por rota):
```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute perfis={['admin']}>
      <Layout>
        <Dashboard />
      </Layout>
    </ProtectedRoute>
  }
/>
```

**Perfis por rota (D-05):** `/admin`, `/admin/usuarios`, `/admin/itens`, `/admin/cardapio`, `/admin/receitas/:id` → `perfis={['admin']}`; `/admin/planejamento`, `/admin/entregas` → `perfis={['admin', 'secretaria']}`.

---

### `src/types.ts` (modificar) — interfaces novas

**Analog:** ele mesmo. Adicionar após a seção auth, sem quebrar `Ingrediente`, `PratoPadrao`, `ItemEstoque`, `Perfil`, `Usuario`, `LoginResponse`.

**Conventions pattern** (linhas 22-35 — comentário de seção + union types literais PT-BR):
```typescript
// --- Autenticação (espelha os schemas do backend) ---

export type Perfil = 'admin' | 'secretaria' | 'cozinheira';

export interface Usuario {
  id: number;
  nome: string;
  perfil: Perfil;
}
```

**Aplicar:** mesma convenção de comentário `// --- <Seção> (espelha os schemas do backend) ---` e union literals para strings enumeradas do backend. Obrigatório (RESEARCH gotcha #2):

```typescript
export type AcaoEntrega = 'recebido' | 'alterado' | 'excluído'; // "excluído" COM acento — backend rejeita variantes (400)
```

Interfaces a adicionar (shapes exatos em RESEARCH.md §"API Contracts per Page"): `Item`, `Conversao`, `CardapioItem`, `ReceitaItem`, `PlanejamentoEntrada`, `EntregaResumo`, `EntregaDetalhe`, `ItemEntrega`, `DashboardResponse` (+ sub-shapes). Campos opcionais/nullable espelham o backend (`prato: string | null`, `ultima_data: string | null`).

---

### `src/pages/admin/Dashboard.tsx` (substituir placeholder) — read-only agregado

**Analogs:** `src/pages/CardapioPublico.tsx` (fetch + estados + grid de cards) e `src/pages/DashboardGestao.tsx` (estrutura de estados — NÃO copiar o fetch hardcoded).

**Fetch pattern** (adaptar de `CardapioPublico.tsx:35-44`, trocando `fetch` por `fetchJson` de `api.ts`):
```typescript
const [dados, setDados] = useState<DashboardResponse | null>(null);
const [carregando, setCarregando] = useState(true);
const [erro, setErro] = useState<string | null>(null);

useEffect(() => {
  fetchJson<DashboardResponse>('/admin/dashboard')
    .then(setDados)
    .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar o dashboard.'))
    .finally(() => setCarregando(false));
}, []);
```

**Estados condicionais pattern** (`CardapioPublico.tsx:59-71` — encadeamento carregando → erro → vazio → conteúdo, com `role="alert"`):
```tsx
{carregando && <p className="admin-aviso">Carregando…</p>}

{erro && (
  <p className="admin-aviso admin-erro" role="alert">
    {erro}
  </p>
)}

{!carregando && !erro && dados && (
  <div className="dashboard-grid">{/* 4 seções */}</div>
)}
```

**Grid de cards pattern** (`CardapioPublico.tsx:71-88` — `.map` sobre seções com card por item):
```tsx
<div className="publico-grid">
  {refeicoes.map((refeicao) => (
    <section key={refeicao.tipo_refeicao} className="publico-card">
      <h2 className="publico-tipo">{refeicao.tipo_refeicao}</h2>
      ...
    </section>
  ))}
</div>
```

**CSS analog** (`CardapioPublico.css:61-74` — grid responsivo + card com border-top verde; renomear classes p/ `dashboard-*`):
```css
.publico-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.publico-card {
  background-color: var(--branco);
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  box-shadow: var(--sombra-card);
  padding: 1.25rem;
  border-top: 3px solid var(--verde-vivo);
}
```

**Notas:** serif é PROIBIDA aqui (tela operacional — DESIGN.md §3); usar `--fonte-sans`. `saldo_atual` de itens críticos com `.toFixed(2)` (padrão `DashboardGestao.tsx:93`). `refeicoes_hoje` sempre tem 4 tipos (pendente/confirmado); `ultima_data` pode ser `null`.

---

### `src/pages/admin/Usuarios.tsx` + `.css` — CRUD tabela + modal (template para Itens e Cardápio)

**Analogs:** `src/pages/Login.tsx` (formulário/erro/submit), `src/pages/DashboardGestao.tsx` (tabela/estados), `src/pages/PainelCozinha.tsx` (modal). Esta é a página-modelo: Itens e Cardápio copiam a estrutura dela.

**Imports pattern** (seguir `Login.tsx:4-9` + `import type` obrigatório — D-13):
```typescript
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, fetchJson } from '../../api';
import type { Usuario, Perfil } from '../../types';
import './Usuarios.css';
```

**Submit handler pattern** (`Login.tsx:19-31` — preventDefault, limpa erro, flag de progresso, try/catch/finally):
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setErro(null);
  setSalvando(true);
  try {
    await fetchJson<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setModalAberto(false);
    await carregar(); // refetch da listagem
  } catch (err) {
    setErro(err instanceof ApiError ? err.message : 'Falha ao salvar. Tente novamente.');
  } finally {
    setSalvando(false);
  }
};
```

**Modal state pattern** (`PainelCozinha.tsx:45,119-135` — boolean gate + overlay/content/header/btn-fechar):
```tsx
const [modalAberto, setModalAberto] = useState(false);

{modalAberto && (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h2>Novo Usuário</h2>
        <button className="btn-fechar" onClick={() => setModalAberto(false)}>✖</button>
      </div>
      {/* form aqui */}
    </div>
  </div>
)}
```

**Form JSX pattern** (`Login.tsx:50-87` — `.form-group` + `.form-input` + `role="alert"` + botão com texto de progresso):
```tsx
<form onSubmit={handleSubmit}>
  <div className="form-group">
    <label htmlFor="usuario-nome">Nome</label>
    <input
      id="usuario-nome"
      type="text"
      value={nome}
      onChange={(e) => setNome(e.target.value)}
      className="form-input"
      required
    />
  </div>

  {erro && (
    <p className="form-erro" role="alert">
      {erro}
    </p>
  )}

  <button type="submit" className="btn-primario" disabled={salvando}>
    {salvando ? 'Salvando…' : 'Salvar'}
  </button>
</form>
```

**Tabela pattern** (`DashboardGestao.tsx:69-107` — `.tabela-container` + `<table>` + linha de vazio com `colSpan`; remover inline styles, mover p/ CSS):
```tsx
<div className="tabela-container">
  <table className="tabela-admin">
    <thead>
      <tr>
        <th>Nome</th>
        <th>Perfil</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody>
      {usuarios.length === 0 ? (
        <tr>
          <td colSpan={3} className="tabela-vazia">
            Nenhum usuário cadastrado.
          </td>
        </tr>
      ) : (
        usuarios.map((u) => (
          <tr key={u.id}>
            <td>{u.nome}</td>
            <td>{u.perfil}</td>
            <td>{/* botões Editar / Excluir */}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
```

**CSS form pattern** (`Login.css:60-95` — copiar classes-base para o CSS da página):
```css
.form-group { display: flex; flex-direction: column; }

.form-group label {
  color: var(--texto-suave);
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--borda);
  border-radius: var(--raio);
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--verde-vivo);
  box-shadow: 0 0 0 2px rgba(72, 187, 44, 0.25);
}
```

**Erro + botão primário CSS** (`Login.css:88-123` — renomear `login-*` → classes genéricas da página):
```css
.form-erro {
  margin: 0;
  padding: 0.625rem 0.75rem;
  background-color: var(--erro-fundo);
  color: var(--erro);
  font-size: 0.875rem;
  border-radius: var(--raio);
}

.btn-primario {
  background-color: var(--verde-escuro);
  color: var(--branco);
  font-weight: 700;
  padding: 0.75rem;
  border: none;
  border-radius: var(--raio);
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-primario:hover:not(:disabled) { background-color: var(--verde-escuro-hover); }
.btn-primario:focus-visible { outline: 2px solid var(--verde-vivo); outline-offset: 2px; }
.btn-primario:disabled { background-color: var(--verde-tint); color: var(--texto-suave); cursor: not-allowed; }
```

**Específico de Usuários:** modal de edição com senha vazia = não alterar (omitir o campo do payload PUT). 409 (nome duplicado) chega pronto em `ApiError.message` — exibir direto.

---

### `src/pages/admin/Itens.tsx` + `.css` — CRUD + baixo estoque + conversões

**Analog:** mesma base de Usuarios (acima) + formatação de saldo de `DashboardGestao.tsx`.

**Saldo + badge de status pattern** (`DashboardGestao.tsx:93-100` — re-tokenizar: `status-alerta`/`status-ok` com tokens do DESIGN.md, saldo em `--erro` **negrito**, nunca fundo vermelho cheio — D-07/DESIGN.md §5.2):
```tsx
<td className={item.saldo_atual < LIMIAR_BAIXO_ESTOQUE ? 'saldo-baixo' : 'saldo-normal'}>
  {item.saldo_atual.toFixed(2)}
</td>
<td>
  {item.saldo_atual < LIMIAR_BAIXO_ESTOQUE ? (
    <span className="status-alerta">BAIXO ESTOQUE</span>
  ) : (
    <span className="status-ok">ESTÁVEL</span>
  )}
</td>
```

**Badge CSS pattern** (molde de `Layout.css:134-157` — pill uppercase com tokens):
```css
.status-alerta, .status-ok {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}
.status-alerta { background-color: var(--erro-fundo); color: var(--erro); }
.status-ok { background-color: var(--verde-tint); color: var(--verde-escuro); }
.saldo-baixo { color: var(--erro); font-weight: 700; }
```

**Constante:** `LIMIAR_BAIXO_ESTOQUE = 5.0` vai em `constants.ts` (espelha `backend/main.py:43`), não inline.

**Conversões (discricionariedade D/RESEARCH 5.3):** gerenciador por item embutido na página (modal ou linha expansível) consumindo `GET/POST/DELETE /conversoes` — reutilizar o mesmo padrão de modal + tabela acima, aninhado por `item_id`.

---

### `src/pages/admin/Cardapio.tsx` + `.css` — CRUD + navegação para Receitas

**Analog:** mesma base de Usuarios. Diferenças:

**Select restrito pattern** (`PainelCozinha.tsx:137-144` — select com opção placeholder disabled; opções vêm de `TIPOS_REFEICAO` em `constants.ts`, NÃO hardcoded):
```tsx
<select
  className="form-input"
  value={tipoRefeicao}
  onChange={(e) => setTipoRefeicao(e.target.value)}
  required
>
  <option value="" disabled>-- Selecione o tipo de refeição --</option>
  {TIPOS_REFEICAO.map((tipo) => (
    <option key={tipo} value={tipo}>{tipo}</option>
  ))}
</select>
```

**Navegação por linha pattern** (padrão de `Login.tsx:6,17,25` — `useNavigate` + template de rota):
```typescript
const navigate = useNavigate();
// na linha da tabela:
<button type="button" onClick={() => navigate(`/admin/receitas/${prato.id}`)}>
  Editar receita
</button>
```

---

### `src/pages/admin/Receitas.tsx` + `.css` — editor de ingredientes (`/admin/receitas/:id`)

**Analog:** mesma base de Usuarios; **sem análogo existente de `useParams`** (nenhuma página atual usa parâmetro de rota) — aplicar o padrão react-router:

```typescript
import { useParams } from 'react-router-dom';

const { id } = useParams<{ id: string }>();
const cardapioId = Number(id);
```

**Fluxo de dados (RESEARCH 5.5):**
1. `GET /cardapio/{id}/receita` (inclui `item_nome`) + `GET /itens` (dropdown de ingredientes) em paralelo no `useEffect`.
2. Após `POST`/`PUT` (que NÃO retornam `item_nome`), refazer o GET da receita (ou mergear `item_nome` localmente a partir da lista de itens já carregada).
3. Linha = `item_nome` + quantidade + medida_caseira + ações editar/remover; formulário de adição = select de item + quantidade + medida caseira (mesmo form pattern de Usuarios).

---

### `src/pages/admin/Planejamento.tsx` + `.css` — grade semanal (sem análogo de grade)

**Analog:** parcial. Select de refeição de `PainelCozinha.tsx:137-144`; estados/fetch de `CardapioPublico.tsx`. A grade 7×4 é construção nova — seguir RESEARCH §"Planejamento Semantics".

**Estrutura derivada do contrato (RESEARCH linhas 187-211):**
1. `GET /planejamento?data=<segunda da semana>` retorna só slots vigentes → construir mapa local `` `${dia_semana}|${tipo_refeicao}` `` → entrada (guarda o `id` p/ DELETE/"Limpar slot").
2. Grade renderizada como tabela (orientação travada pelo UI-SPEC §5.6): linhas = `DIAS_SEMANA` (7, indexados pelo valor do backend `0=segunda…6=domingo`), colunas = `TIPOS_REFEICAO` (4).
3. Célula sem entrada = "A definir" + select vazio; célula com entrada = select com o prato atual.
4. **Dropdown filtrado por `tipo_refeicao` da coluna** — o backend NÃO valida coerência prato×tipo (RESEARCH gotcha #6); filtrar opções de `GET /cardapio` pelo tipo da coluna.
5. Salvar = `POST /planejamento` por slot alterado com `data_inicio_vigencia` = segunda-feira da semana em edição (upsert idempotente por slot+vigência).

**Constantes em `constants.ts`** (RESEARCH gotcha #1 — conversão JS↔Python):
```typescript
export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;
// backend: 0=segunda…6=domingo; JS Date.getDay(): 0=domingo…6=sábado → converter com (jsDay + 6) % 7
```

---

### `src/pages/admin/Entregas.tsx` + `.css` — tabela editável + justificativa + XML

**Analog:** parcial. Modal de `PainelCozinha.tsx:129-135`; badges no molde de `Layout.css:134-157`. Upload de arquivo não tem análogo — padrão abaixo.

**Badges de ação (RESEARCH §"Design Tokens in Practice" — mapeamento direto):**
```css
.badge-acao { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.2rem 0.55rem; border-radius: 999px; }
.badge-recebido { background-color: var(--verde-vivo); color: var(--branco); }
.badge-alterado { background-color: var(--amarelo); color: var(--texto); }
.badge-excluido { background-color: var(--erro-fundo); color: var(--erro); }
```

**Modal de justificativa (D-10 + DESIGN.md §5.4):** reutilizar estrutura `.modal-overlay/.modal-content`; textarea obrigatório com **borda `--amarelo` até ser preenchido**; texto mencionando exigência de prestação de contas PNAE; submit bloqueado sem texto.

**Upload pattern (novo — sem análogo; contrato de RESEARCH linha 227):**
```tsx
<input
  type="file"
  accept=".xml"
  onChange={async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const texto = await arquivo.text();
    try {
      const linhas = parseNfe(texto, itens); // helper em nfe.ts
      setLinhas(linhas);
    } catch {
      setErro('O arquivo não é um XML de NF-e válido.');
    }
  }}
/>
```

**Regras de fluxo (D-10/D-11, RESEARCH §"Entregas Flow"):** linha removida vira `acao: 'excluído'` marcada (não some); quantidade editada após parse vira `acao: 'alterado'`; ambos exigem justificativa antes do submit; botão "Confirmar" desabilitado com 0 linhas (backend 422); `AcaoEntrega` vem de `types.ts` (nunca digitar a string inline). Detalhe de entrega passada: `GET /entregas/{id}` (listagem não traz itens).

---

### `src/pages/admin/constants.ts` — constantes compartilhadas (utility)

**Analog:** `src/auth-context.ts` — o precedente do projeto para separar constantes/tipos de componentes `.tsx` (regra `react-refresh/only-export-components`, RESEARCH gotcha #3).

**Pattern de arquivo .ts puro** (`auth-context.ts:1-6,22-30` — header comment explicando o split + exports de constantes/tipos):
```typescript
// src/pages/admin/constants.ts — constantes compartilhadas das páginas admin (sem JSX)
// Separado dos componentes para manter o lint react-refresh limpo.

export const TIPOS_REFEICAO = ['Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Janta'] as const;
export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;
export const LIMIAR_BAIXO_ESTOQUE = 5.0;
// ... (espelha backend/main.py:38-44)
```

---

### `src/pages/admin/nfe.ts` — parser NF-e (utility, transform) — **NO ANALOG**

Nenhum parse de arquivo existe no frontend. Usar o contrato verificado de RESEARCH.md (linhas 236-259):

```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false });
const doc = parser.parse(xmlText);
// nfeProc.NFe.infNFe.det → objeto único OU array (normalizar com Array.isArray / [].concat)
// det.prod = { cProd, xProd, qCom, uCom, vUnCom }
// raiz pode ser nfeProc ou NFe direta: doc.nfeProc?.NFe ?? doc.NFe
```

Regras: match `xProd` ↔ `Item.nome` normalizado (lowercase, trim, sem acentos); sem match → linha marcada para seleção manual; `qCom` pré-preenche quantidade; `uCom` é só exibição (não é a `unidade_oficial`); `parser.parse` lança em XML malformado → erro amigável. Arquivo `.ts` puro (sem JSX) pela regra react-refresh.

---

## Shared Patterns

### API Access (único caminho — D-03)
**Source:** `src/api.ts:8-16, 36-43`
**Apply to:** TODAS as páginas novas
```typescript
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resposta = await fetchWithAuth(path, options);
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(resposta.status, corpo?.detail ?? `Erro ${resposta.status} ao acessar ${path}`);
  }
  return (await resposta.json()) as T;
}
```
**Uso padrão:** `try { await fetchJson<T>(path, opts) } catch (e) { if (e instanceof ApiError) setErro(e.message) }` — o `detail` do backend (409 duplicado, 400 justificativa) já é amigável. NUNCA `fetch('http://127.0.0.1:8000/...')`, NUNCA `id_usuario` no body. 401 em sessão: mensagem "sessão expirada — entre novamente" (RESEARCH gotcha #8; sem mecanismo global novo).

### Auth Guard
**Source:** `src/components/ProtectedRoute.tsx:15-28`
**Apply to:** Todas as rotas novas em `App.tsx` (já coberto pelo route pattern acima)
```tsx
if (!isAuthenticated || !usuario) {
  return <Navigate to="/" replace />;
}
if (perfis && !perfis.includes(usuario.perfil)) {
  return <Navigate to={ROTA_POR_PERFIL[usuario.perfil]} replace />;
}
```
Guards de UI dentro de páginas (raro — secretaria tem acesso total a planejamento/entregas): `useAuth()` de `src/auth-context.ts:32-38` expõe `isAdmin`, `isSecretaria`, `usuario`.

### Loading / Error / Empty States
**Source:** `src/pages/CardapioPublico.tsx:59-71` (versão limpa, com classes CSS) — preferir a `DashboardGestao.tsx:62-68` (que usa inline styles, anti-padrão)
**Apply to:** Todas as 7 páginas
```tsx
{carregando && <p className="aviso">Carregando…</p>}
{erro && <p className="aviso erro" role="alert">{erro}</p>}
{!carregando && !erro && vazio && <p className="aviso">Nenhum registro.</p>}
{!carregando && !erro && !vazio && (/* conteúdo */)}
```

### Formulário + Feedback
**Source:** `src/pages/Login.tsx:19-31, 79-87` + `src/pages/Login.css:60-123`
**Apply to:** Todos os modais CRUD (Usuários, Itens, Cardápio, Receitas, justificativa de Entregas)

### Modal
**Source:** `src/pages/PainelCozinha.tsx:129-135` (JSX) + `src/pages/PainelCozinha.css:152-201` (estrutura CSS — **re-tokenizar**: overlay `rgba(18, 76, 15, 0.35)` em vez de `rgba(0,0,0,0.6)`, card branco raio 12px, sem hex hardcoded)
**Apply to:** Todos os modais CRUD + justificativa + detalhe de entrega
```css
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(18, 76, 15, 0.35); /* verde translúcido — DESIGN.md, não preto */
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; z-index: 50;
}
.modal-content {
  background-color: var(--branco);
  border-radius: 12px;
  padding: 2rem;
  width: 100%; max-width: 800px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: var(--sombra-card);
}
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--borda); padding-bottom: 1rem; margin-bottom: 1.5rem; }
.btn-fechar { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--texto-suave); }
```

### Design Tokens
**Source:** `src/index.css:8-38` (`:root`)
**Apply to:** Todos os arquivos `.css` novos — SEMPRE `var(--*)`, nunca hex literal. Regras-chave (RESEARCH §"Design Tokens in Practice"): admin usa `--fonte-sans` (serif proibida); tabelas com header `--verde-tint`/texto `--verde-escuro` 600, linhas `border-bottom: 1px solid var(--borda)`, hover `--verde-tint` 50%; perigo = fundo branco + borda/texto `--erro` + hover `--erro-fundo` (molde `Layout.css:159-173`); foco visível `outline: 2px solid var(--verde-vivo)`; baixo estoque = `--erro` negrito, nunca fundo vermelho cheio.

### TypeScript Estrito (D-13)
**Source:** `src/auth-context.ts:5-6`, `src/auth.tsx:5,8-9`, `src/components/ProtectedRoute.tsx:5,7`
**Apply to:** Todos os arquivos novos
```typescript
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';   // import type separado, obrigatório
import type { Usuario, Perfil } from '../../types'; // verbatimModuleSyntax
```
Sem enums TS, sem namespaces, sem parameter properties (`erasableSyntaxOnly`). Helpers/constantes/tipos em arquivos `.ts` separados dos `.tsx` (regra `react-refresh/only-export-components` — precedente `auth-context.ts`/`auth.tsx`).

### CSS Co-localizado (D-01)
**Source:** convenção `Login.tsx:9` (`import './Login.css';`), `PainelCozinha.tsx`, `CardapioPublico.tsx`
**Apply to:** Cada página nova importa seu `.css` irmão; classes prefixadas por página (`usuarios-*`, `itens-*`) ou genéricas replicadas (`.form-group`, `.form-input`, `.modal-*`); Tailwind NÃO é usado.

---

## Anti-Patterns (NÃO copiar do legado)

| Anti-padrão | Onde existe | Fazer em vez disso |
|---|---|---|
| `fetch('http://127.0.0.1:8000/...')` hardcoded | `DashboardGestao.tsx:15`, `PainelCozinha.tsx` | `fetchJson<T>` de `api.ts` |
| `id_usuario: 1` no body | páginas legadas | backend resolve pelo token |
| Inline styles (`style={{...}}`) | `DashboardGestao.tsx:39-100` | classes no `.css` co-localizado |
| Hex fora da paleta (`#2563eb`, `#16a34a`, `#dc2626`) | `PainelCozinha.css`, `DashboardGestao.tsx` | tokens `var(--*)` do `:root` |
| `alert()` como feedback | legado | estado `erro` + `role="alert"` |
| Strings de ação digitadas inline | — | `AcaoEntrega` de `types.ts` (`'excluído'` com acento) |
| Serif em tela operacional | — | serif só em Login/Cardápio Público (DESIGN.md §3) |

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/pages/admin/nfe.ts` | utility | transform (XML→linhas) | Nenhum parse de arquivo existe no frontend — usar contrato verificado do RESEARCH.md (fast-xml-parser 5.10.1 já instalado, `package.json:13`) |
| Grade semanal de `Planejamento.tsx` | component | request-response (grid) | Nenhuma grade/matriz existe no frontend — construir por junção local 7×4 conforme RESEARCH §"Planejamento Semantics"; reutilizar padrões compartilhados (fetch, estados, select) |
| `useParams` em `Receitas.tsx` | — | — | Nenhuma rota com parâmetro existe hoje — padrão react-router `useParams<{ id: string }>()` + `Number(id)` (RESEARCH 5.5) |

## Metadata

**Analog search scope:** `frontend/src/` (todas as páginas, componentes, api, auth, types, CSS)
**Files scanned:** 21 (16 lidos integralmente, 1 com leitura direcionada, 4 CSS auxiliares)
**Pattern extraction date:** 2026-08-01
