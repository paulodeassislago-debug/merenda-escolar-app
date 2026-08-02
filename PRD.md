# PRD: Sistema de Gestao da Cozinha Escolar (v2)

## 1. Perfis de Usuario

| Perfil | Acesso | Permissoes |
|---|---|---|
| **Admin** | Login | Dashboard + CRUD completo (usuarios, itens, cardapio, receitas, conversoes, entregas, planejamento) |
| **Secretaria** | Login | Registrar/editar entregas, planejar cardapio semanal, visualizar estoque e refeicoes |
| **Cozinheira** | Login | Lancar refeicoes do dia, ajustar receita com justificativa por item |
| **Visitante** | Sem login | Visualizar apenas o cardapio planejado do dia atual |

## 2. Funcionalidades por Modulo

### 2.1 Autenticacao (JWT)
- Login com nome + senha -> token JWT
- Cada rota da API verifica o perfil do usuario para autorizacao
- Substituir o `id_usuario: 1` hardcoded atual

### 2.2 Admin — Dashboard (`/admin`)
Pagina inicial do admin com visao geral em cards/metricas:
- **Status do estoque**: total de itens cadastrados, itens com baixo estoque (abaixo de limiar), alertas visuais
- **Refeicoes do dia**: cardapio planejado para hoje, indicador de quais refeicoes ja foram lancadas pela cozinheira vs. pendentes
- **Resumo de entregas**: entregas nos ultimos 7 e 30 dias, total recebido, data da ultima entrega
- **Alunos atendidos hoje**: total de alunos servidos por tipo de refeicao no dia atual

### 2.3 Admin — Gestao de Usuarios
- Criar, listar, editar, excluir usuarios
- Atribuir perfil (admin, secretaria, cozinheira)

### 2.4 Admin + Secretaria — Gestao de Itens / Estoque
- CRUD de itens (nome, unidade oficial KG/L, saldo)
- Visualizacao de saldo com alerta de baixo estoque

### 2.5 Admin + Secretaria — Conversoes
- Cadastrar multiplas conversoes por item (ex: "Flocao de Milho" -> "pacote" = 0.5kg, "colher de sopa" = 0.015kg)
- Essencial para o motor de baixa automatica nas refeicoes

### 2.6 Admin + Secretaria — Cardapio e Receitas
- CRUD de itens do cardapio (nome do prato, tipo de refeicao)
- Para cada item do cardapio, definir **receita padrao**: lista de ingredientes com quantidade e medida caseira
- **Planejamento semanal**: associar um item do cardapio a cada dia da semana (Seg-Sex) x tipo de refeicao (Lanche Manha, Almoco, Lanche Tarde, Janta)

### 2.7 Admin + Secretaria — Registro de Entregas
- **Criar entrega** por dois caminhos:
  - **Manual**: selecionar itens do catalogo e informar quantidades
  - **XML**: upload do XML da NF no frontend -> parse em JS -> exibe itens pre-preenchidos
- **Editar antes de confirmar**:
  - Alterar quantidade de um item -> **abre campo de justificativa obrigatorio**
  - Excluir um item da entrega -> **abre campo de justificativa obrigatorio**
- Ao **confirmar recebimento**:
  - Grava `entregas` (data, usuario)
  - Grava `itens_entrega` (item, qtd recebida, justificativa se houve edicao, acao: "recebido"/"alterado"/"excluido")
  - Atualiza `itens.saldo_atual += quantidade` para cada item recebido

### 2.8 Cozinheira — Lancamento de Refeicao
- Seleciona o tipo de refeicao (ex: Almoco)
- Sistema carrega automaticamente o planejamento do dia -> exibe prato e receita padrao
- Informa quantidade de alunos atendidos
- **Ajustes na receita** (todos exigem justificativa individual):
  - Alterar quantidade de um ingrediente
  - Adicionar ingrediente extra (busca no catalogo de itens)
  - Remover ingrediente da receita
- Ao **confirmar preparo**:
  - Converte medidas caseiras -> kg/L (usando tabela de conversoes)
  - Deduz do estoque
  - Registra `refeicoes` (data/hora, tipo, alunos, usuario, planejamento_id)
  - Registra `refeicao_itens` com quantidades originais, ajustadas e justificativas

### 2.9 Visitante — Cardapio Publico
- Rota publica `/cardapio` -> exibe o cardapio planejado do dia
- Sem autenticacao, apenas leitura

## 3. Rotas do Frontend

| Rota | Pagina | Perfil |
|---|---|---|
| `/` | Login | Todos |
| `/admin` | Dashboard do admin | Admin |
| `/admin/usuarios` | Gestao de usuarios | Admin |
| `/admin/itens` | Gestao de itens/estoque | Admin |
| `/admin/cardapio` | Cardapio e receitas | Admin |
| `/admin/planejamento` | Planejamento semanal | Admin + Secretaria |
| `/admin/entregas` | Registro de entregas | Admin + Secretaria |
| `/cozinha` | Painel da cozinheira | Cozinheira |
| `/gestao` | Painel da secretaria (estoque + refeicoes) | Secretaria |
| `/cardapio` | Cardapio publico | Visitante |

## 4. Modelo de Dados

```
usuarios         (id, nome, senha_hash, perfil)
itens            (id, nome, unidade_oficial, saldo_atual)
conversoes       (id, item_id, medida_caseira, peso_em_kg)
cardapio_itens   (id, nome_refeicao, tipo_refeicao)
receitas         (id, cardapio_item_id, item_id, quantidade, medida_caseira)
planejamento     (id, cardapio_item_id, tipo_refeicao, dia_semana, data_inicio_vigencia)
entregas         (id, data, id_usuario)
itens_entrega    (id, entrega_id, item_id, quantidade, justificativa, acao)
refeicoes        (id, data_hora, tipo_refeicao, id_usuario, qtd_alunos, planejamento_id)
refeicao_itens   (id, refeicao_id, item_id, quantidade_original, quantidade_ajustada, justificativa)
```

## 5. Decisoes Tecnicas

| Decisao | Escolha |
|---|---|
| XML da NF | Parse no frontend (JS), envia dados estruturados ao backend |
| Planejamento | Semanal (Admin/Secretaria define cardapio por dia da semana) |
| Conversoes | Multiplas medidas caseiras por item |
| Ajustes da cozinheira | Auditados por item com justificativa individual |
| Base de codigo | Evoluir o existente (nao reescrever do zero) |
| Dashboard admin | Nova pagina `/admin` |

## 6. Ordem de Implementacao

1. Backend — Autenticacao JWT
2. Backend — Expandir modelos (novas tabelas + ajustes nas existentes)
3. Backend — Novos endpoints (CRUDs, entregas, planejamento, dashboard)
4. Frontend — Login com JWT real
5. Frontend — `/admin` (dashboard + gestao de usuarios, itens, cardapio, planejamento, entregas)
6. Frontend — `/cozinha` (evoluir painel com ajustes auditados)
7. Frontend — `/gestao` (adaptar para perfil secretaria)
8. Frontend — `/cardapio` (tela publica)