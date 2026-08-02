# DESIGN.md — Regras de Design

**Fonte da identidade:** `frontend/src/assets/Logo Nancy (Logotipo) (1).jpg` — brasão do **Colégio Estadual do Campo Nancy de Castro Esteves**.
**Escopo:** todas as telas do frontend (Login, Layout autenticado, páginas admin, Cozinha, Gestão e Cardápio Público). Fases 4–7 do PLAN.md devem seguir estas regras.

---

## 1. Análise do logotipo

| Elemento | Descrição | Papel na UI |
|---|---|---|
| Monograma **NCE** | Letras clássicas em verde-escuro sobre círculo branco | Cor primária + tipografia institucional |
| Anel circular | Verde vivo com o nome da escola | Cor secundária / destaques |
| Grinalda (ramos) | Verde-escuro, envolve o brasão | Reforça a primária; inspira bordas/ícones discretos |
| 2 estrelas | Amarelo-esverdeado no anel | Cor de acento (uso restrito) |
| Fundo | Branco sólido (JPG, sem transparência) | Superfícies claras obrigatórias sob o logo |

**Leitura estratégica:** identidade institucional, clássica e verde — a UI deve ser limpa, clara (fundo branco), com verde-escuro comandando e verde-vivo/amarelo como pontuação. Nada de temas escuros.

---

## 2. Paleta de cores

### 2.1 Cores da marca (amostradas do arquivo)

| Token | Hex | RGB | Amostra | Uso |
|---|---|---|---|---|
| `--verde-escuro` | `#124C0F` | 18, 76, 15 | Letras NCE + grinalda | **Primária**: header, sidebar, botões primários, títulos, links |
| `--verde-vivo` | `#48BB2C` | 72, 187, 44 | Anel do brasão | **Secundária**: estados ativos, ícones de destaque, badge "confirmado", focus rings |
| `--amarelo` | `#C5D227` | 197, 210, 39 | Estrelas do anel | **Acento**: badges especiais, indicador "pendente". Sempre com texto escuro |
| `--branco` | `#FFFFFF` | — | Fundo do brasão | Superfícies, cards, fundo da página |

### 2.2 Cores de apoio (derivadas, para completar o sistema)

| Token | Hex | Uso |
|---|---|---|
| `--verde-escuro-hover` | `#0D3809` | Hover de botões/links primários |
| `--verde-tint` | `#EDF4EA` | Fundo de header de tabela, tags neutras, hover de linhas |
| `--fundo` | `#F7FAF5` | Fundo geral das páginas (quase branco, matiz verde) |
| `--texto` | `#1D2B1A` | Texto principal (quase preto esverdeado) |
| `--texto-suave` | `#5A6B56` | Texto secundário, placeholders, legendas |
| `--borda` | `#D9E4D4` | Bordas de cards, inputs, divisores |
| `--erro` | `#B3261E` | Erros, estoque insuficiente, ações destrutivas (o logo não tem vermelho — usar com parcimônia) |
| `--erro-fundo` | `#FBEDEB` | Fundo de alertas de erro |

### 2.3 Tokens CSS (colar em um arquivo global, ex.: `frontend/src/index.css`)

```css
:root {
  /* Marca (amostradas do logotipo) */
  --verde-escuro: #124C0F;
  --verde-vivo: #48BB2C;
  --amarelo: #C5D227;
  --branco: #FFFFFF;

  /* Apoio */
  --verde-escuro-hover: #0D3809;
  --verde-tint: #EDF4EA;
  --fundo: #F7FAF5;
  --texto: #1D2B1A;
  --texto-suave: #5A6B56;
  --borda: #D9E4D4;
  --erro: #B3261E;
  --erro-fundo: #FBEDEB;

  /* Semânticos */
  --cor-primaria: var(--verde-escuro);
  --cor-primaria-hover: var(--verde-escuro-hover);
  --cor-sucesso: var(--verde-vivo);
  --cor-alerta: var(--amarelo);
  --cor-erro: var(--erro);

  /* Forma */
  --raio: 8px;
  --sombra-card: 0 1px 3px rgba(18, 76, 15, 0.10);
}
```

---

## 3. Tipografia

| Papel | Família | Peso/Tamanho | Regra |
|---|---|---|---|
| Títulos institucionais (Login, Cardápio Público) | `Georgia, 'Times New Roman', serif` | 700 / 24–32px | Eco das letras clássicas do monograma NCE |
| Títulos de página/seção (área autenticada) | stack do sistema (`system-ui, -apple-system, 'Segoe UI', sans-serif`) | 600 / 18–22px | Serif **não** entra nas telas operacionais |
| Corpo, tabelas, formulários | stack do sistema | 400 / 14–16px | Legibilidade operacional |
| Rótulos pequenos (badges, legendas) | stack do sistema | 500–600 / 11–13px, caixa-alta opcional | Badges em caixa-alta com letter-spacing leve |

**Regra de ouro:** serif = cerimonial (logo, nome da escola); sans = trabalho (CRUDs, painéis).

---

## 4. Regras de uso do logotipo

1. **Arquivo:** `frontend/src/assets/Logo Nancy (Logotipo) (1).jpg`. Importar via bundler (`import logoNancy from '../assets/Logo Nancy (Logotipo) (1).jpg'`) — nunca copiar para `public/` nem servir por URL externa.
2. **Sempre sobre fundo claro:** o JPG tem fundo branco embutido. Em superfícies coloridas (sidebar verde), colocá-lo dentro de um **container branco arredondado** (`border-radius: 50%` ou `--raio`, padding 4–8px).
3. **Tamanho mínimo:** 48px de altura (abaixo disso o texto do anel fica ilegível).
4. **Espaço livre:** margem ao redor ≥ altura da letra "N" do monograma (~15% da altura da imagem).
5. **Proibições:** não recolorir, não aplicar filtros, não esticar/distorcer (sempre `object-fit: contain`), não cortar a grinalda, não usar sobre fotos ou gradientes.
6. **Onde aparece:**

   | Tela | Tamanho | Posição |
   |---|---|---|
   | Login | ~120px altura | Centralizado acima do formulário, com nome da escola em serif |
   | Layout (header/sidebar) | ~40px | Canto superior, dentro de container branco |
   | Cardápio Público | ~80px | Header centralizado com nome da escola em serif |
   | Favicon | 32px | Recorte quadrado do círculo central (gerar em `frontend/public/favicon.png`) |

---

## 5. Componentes

### 5.1 Botões

| Variante | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| Primário | `--verde-escuro` → hover `--verde-escuro-hover` | branco | nenhuma | Ação principal da tela (Salvar, Confirmar, Entrar) |
| Secundário | branco → hover `--verde-tint` | `--verde-escuro` | 1px `--verde-escuro` | Ações alternativas (Cancelar, Voltar) |
| Perigo | branco → hover `--erro-fundo` | `--erro` | 1px `--erro` | Excluir, remover |
| Desabilitado | `--verde-tint` | `--texto-suave` | nenhuma | `cursor: not-allowed` |

Raio `--raio` (8px), padding 10–12px vertical, foco visível com outline `2px solid var(--verde-vivo)`.

### 5.2 Cards e tabelas

- Card: fundo branco, borda 1px `--borda`, raio `--raio`, sombra `--sombra-card`, padding 16–24px.
- Tabela: header com fundo `--verde-tint` e texto `--verde-escuro` 600; linhas com borda inferior 1px `--borda`; hover de linha `--verde-tint` a 50%.
- **Baixo estoque:** linha/célula do saldo com texto `--erro` em negrito (nunca fundo vermelho cheio).

### 5.3 Badges e status

| Significado | Fundo | Texto |
|---|---|---|
| `confirmado`, `recebido`, sucesso | `--verde-vivo` | branco |
| `pendente`, `alterado` | `--amarelo` | `--texto` (escuro — obrigatório p/ contraste) |
| `excluído`, erro, estoque crítico | `--erro-fundo` | `--erro` |
| Perfil `admin` | `--verde-escuro` | branco |
| Perfil `secretaria` | `--verde-tint` | `--verde-escuro` |
| Perfil `cozinheira` | `--amarelo` | `--texto` |
| Item ajustado na cozinha (auditoria) | `--amarelo` | `--texto` |

### 5.4 Formulários e modais

- Inputs: borda 1px `--borda`, raio `--raio`; foco com borda `--verde-vivo` + outline suave; label acima do campo em `--texto-suave` 13px.
- Erro de campo: borda `--erro` + mensagem `--erro` 12px abaixo.
- Modal: overlay `rgba(18, 76, 15, 0.35)` (verde escuro translúcido, não preto puro), card branco central com raio 12px.
- Justificativas de auditoria: campo obrigatório destacado com borda `--amarelo` até ser preenchido.

### 5.5 Layout

- Fundo da página `--fundo`; conteúdo em cards brancos.
- Header/sidebar: fundo `--verde-escuro`, texto e ícones brancos; item de menu ativo com fundo `--verde-vivo` a 25% ou borda lateral `--verde-vivo`; logo em container branco (regra 4.2).
- Cardápio Público: página mais cerimonial — logo maior, nome da escola em serif, sem elementos de navegação autenticada; mesma paleta.

---

## 6. Acessibilidade (contraste)

| Combinação | Razão aprox. | Veredito |
|---|---|---|
| Branco sobre `--verde-escuro` | ~9:1 | ✅ AAA — usar livremente |
| `--verde-escuro` sobre branco | ~9:1 | ✅ AAA |
| `--texto` sobre `--amarelo` | ~7:1 | ✅ AA — única forma válida de usar amarelo com texto |
| Branco sobre `--verde-vivo` | ~2.4:1 | ❌ — `--verde-vivo` com texto branco **proibido** em texto pequeno; usar apenas em ícones, barras e badges grandes |
| `--texto-suave` sobre branco | ~4.8:1 | ✅ AA para texto secundário |

Regras derivadas: amarelo sempre com texto escuro; verde-vivo nunca como fundo de botão com texto pequeno; foco de teclado sempre visível (outline `--verde-vivo` 2px).

---

## 7. O que NÃO fazer

- ❌ Tema escuro / dark mode (a identidade é branca e verde).
- ❌ Introduzir azul, roxo ou laranja de frameworks UI — a paleta vem do brasão + vermelho restrito a erros.
- ❌ Gradientes chamativos; sombras pesadas; glassmorphism.
- ❌ Ícones coloridos fora da paleta; emojis como ícone de funcionalidade.
- ❌ Tailwind nesta fase — o projeto usa CSS plain co-localizado (AGENTS.md); os tokens acima entram como variáveis CSS.
