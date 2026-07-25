# Contexto do Projeto: Sistema de Gestão da Cozinha Escolar (PNAE)

## 1. Escopo do Projeto
O **Sistema de Gestão da Cozinha Escolar** é uma aplicação web desenvolvida para otimizar o controlo de stock, o planeamento de cardápios e a execução de preparações culinárias no **Colégio Estadual do Campo Nancy de Castro Esteves**, em total conformidade com as diretrizes do **Programa Nacional de Alimentação Escolar (PNAE)** e da Secretaria da Educação da Bahia (SEC-BA).

### Objetivos Principais:
* **Controlo Automático de Stock:** Dar baixa automática nos insumos com base no consumo real das refeições servidas.
* **Autonomia Controlada para as Cozinheiras:** Permitir que a equipa da cozinha registe os pratos do dia utilizando medidas caseiras tradicionais (ex: colheres de sopa, xícaras), convertendo-as automaticamente para unidades de medida oficiais (kg/litros) nos bastidores.
* **Fichas Técnicas Padronizadas (FTP):** Garantir o respeito aos parâmetros nutricionais e ao *per capita* exigido pelas nutricionistas do PNAE.
* **Ambientes Separados por Perfil:** Painel simplificado e tátil para as cozinheiras e painel gerencial/auditoria para a administração escolar.

---

## 2. Pilares Tecnológicos e Dependências (Tech Stack)

### Backend
* **Linguagem:** Python 3
* **Framework Web:** FastAPI (alta performance e documentação interativa automática via Swagger UI).
* **ORM & Banco de Dados:** SQLAlchemy com SQLite (ambiente de desenvolvimento local) e migração planeada para PostgreSQL (produção na VPS).
* **Servidor ASGI:** Uvicorn (com suporte a *reload* automático).

### Frontend
* **Ferramenta de Build:** Vite
* **Framework:** React com TypeScript
* **Estilização:** CSS Vanilla (Puro) organizado em ficheiros modulares para maior controlo e manutenção a longo prazo.
* **Navegação:** React Router Dom.

### Infraestrutura e Implantação
* **Ambiente de Hospedagem:** Servidor VPS próprio do utilizador, gerido com Docker e Coolify.

---

## 3. Trilha de Passos Executados com Sucesso

1. **Mapeamento e Alinhamento Nutricional (PNAE 2026):**
   * Levantamento do stock inicial por categorias.
   * Seleção e estruturação de 15 variações de pratos principais e lanches baseados no cardápio oficial da SEC-BA.

2. **Arquitetura Lógica e Banco de Dados (Backend):**
   * Desenho relacional das tabelas fundamentais: `Usuarios`, `Estoque`, `CardapioBase`, `DicionarioConversoes` e `RegistroRefeicoes`.
   * Configuração do FastAPI e criação automática do banco SQLite (`merenda.db`).
   * **Lógica de Baixa Automática:** Implementação do motor de cálculo que recebe dados em medidas caseiras, consulta o dicionário de conversão e abate o valor exato (em Kg/L) no stock.
   * Configuração do `CORSMiddleware` para permitir a comunicação segura com o Frontend.

3. **Desenvolvimento da Interface (Frontend):**
   * **Estrutura Base:** Configuração do Vite + React + TypeScript com rotas bem definidas. Tipagem rigorosa (Interfaces) centralizada num ficheiro `types.ts`.
   * **Tela de Login (`/`):** Interface segura de entrada com redirecionamento de perfis (simulação implementada).
   * **Painel da Cozinha (`/cozinha`):** Dashboard operativo tátil com sistema de Modal. Carregamento dinâmico de ingredientes com base na refeição selecionada (Lanche, Almoço, etc.). Integração total com a API (enviando o POST real e recebendo confirmação visual).
   * **Painel de Gestão (`/gestao`):** Dashboard corporativo que consome a rota GET do backend para exibir a tabela de stock em tempo real, alertando automaticamente para itens com "Baixo Stock".

---

## 4. Próximos Passos a Executar

1. **Expansão do Painel de Gestão (Frontend):**
   * Criar um formulário/modal no Dashboard da Gestão para permitir o cadastro rápido de novos insumos no stock (sem necessitar do Swagger).
   * Criar uma nova visualização (aba) para o "Histórico de Refeições", permitindo a auditoria diária dos lançamentos.

2. **Implementação de Autenticação Real (Segurança):**
   * Substituir o sistema de login simulado por autenticação real no backend via FastAPI, utilizando validação de senhas encriptadas e emissão de Tokens JWT.

3. **Empacotamento e Implantação (Deploy):**
   * Escrever os ficheiros `Dockerfile` para o Backend e para o Frontend.
   * Preparar o ambiente no servidor VPS e efetuar o deploy utilizando o ecossistema Coolify, colocando a aplicação publicamente acessível.