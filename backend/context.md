# Contexto do Projeto: Sistema de Gestão da Cozinha Escolar (PNAE)

## 1. Escopo do Projeto
O **Sistema de Gestão da Cozinha Escolar** é uma aplicação web desenvolvida para otimizar o controle de estoque, o planejamento de cardápios e a execução de preparações culinárias no **Colégio Estadual do Campo Nancy de Castro Esteves**, em total conformidade com as diretrizes do **Programa Nacional de Alimentação Escolar (PNAE)** e da Secretaria da Educação da Bahia (SEC-BA).

### Objetivos Principais:
* **Controle Automático de Estoque:** Dar baixa automática nos insumos com base no consumo real das refeições servidas.
* **Autonomia Controlada para as Cozinheiras:** Permitir que a equipe da cozinha registre os pratos do dia utilizando medidas caseiras tradicionais (ex: colheres de sopa, xícaras), convertendo-as automaticamente para unidades de medida oficiais (kg/litros) nos bastidores.
* **Fichas Técnicas Padronizadas (FTP):** Garantir o respeito aos parâmetros nutricionais e ao *per capita* exigido pelas nutricionistas do PNAE, aplicando Fatores de Correção (FC) quando necessário.
* **Ambientes Separados por Perfil:** Painel simplificado e tátil para as cozinheiras e painel gerencial/auditoria para a administração escolar.

---

## 2. Pilares Tecnológicos e Dependências (Tech Stack)

### Backend
* **Linguagem:** Python 3
* **Framework Web:** FastAPI (alta performance e documentação interativa automática via Swagger UI).
* **ORM & Banco de Dados:** SQLAlchemy com SQLite (ambiente de desenvolvimento local) e migração planejada para PostgreSQL (produção na VPS).
* **Servidor ASGI:** Uvicorn (com suporte a *reload* automático).

### Frontend (Planejado)
* **Framework:** React com TypeScript
* **Estilização:** Tailwind CSS (foco em design responsivo e amigável para tablets/smartphones na cozinha).

### Infraestrutura e Implantação
* **Ambiente de Hospedagem:** Servidor VPS próprio do usuário, gerenciado com Docker e Coolify.

---

## 3. Trilha de Passos Executados com Sucesso

1. **Mapeamento Inicial e Diagnóstico:**
   * Levantamento dos dados de recebimento de gêneros alimentícios através de notas fiscais de fornecedores (Supermercado São João, Ivana e Associação/Celene).
   * Consolidação do estoque inicial por categorias (Proteínas, Grãos, Hortifrúti, Laticínios e Temperos).

2. **Alinhamento Nutricional (PNAE 2026):**
   * Análise do cardápio oficial da SEC-BA para Ensino Fundamental e Médio (parcial e integral).
   * Seleção e estruturação de 15 variações de pratos principais (com forte foco em cozidos e carnes de panela) e 15 variações de lanches.
   * Elaboração detalhada da primeira Ficha Técnica de Preparo (Músculo de Panela com Batatinha, Arroz e Feijão para 200 alunos).

3. **Arquitetura Lógica e Banco de Dados:**
   * Desenho relacional das 5 tabelas fundamentais: `Usuarios`, `Estoque`, `CardapioBase`, `DicionarioConversoes` e `RegistroRefeicoes`.

4. **Inicialização e Configuração do Backend:**
   * Configuração do ambiente virtual Python (`venv`) no Linux.
   * Instalação das bibliotecas essenciais (`fastapi`, `uvicorn`, `sqlalchemy`).
   * Criação da estrutura de ficheiros (`database.py`, `models.py`, `main.py`).
   * Geração automática do banco de dados SQLite (`merenda.db`) e do ficheiro de dependências (`requirements.txt`).

5. **Desenvolvimento de Endpoints Iniciais:**
   * Implementação bem-sucedida das rotas de cadastro e listagem de insumos no estoque (`POST /estoque` e `GET /estoque`).
   * Validação técnica e testes operacionais realizados com sucesso através do painel interativo do **Swagger UI** (`/docs`).

---

## 4. Próximos Passos a Executar

1. **Expansão da API (Backend - Lógica de Conversão e Baixa):**
   * Criar as tabelas e rotas para o **Dicionário de Conversões** (mapeando medidas caseiras para quilogramas/litros).
   * Implementar o endpoint de **Lançamento de Refeições pelas Cozinheiras** (`POST /refeicoes/lancar`), acionando a lógica de abatimento automático no estoque.

2. **Iniciação do Frontend:**
   * Criar a estrutura base do projeto React + TypeScript + Tailwind CSS na pasta `frontend`.
   * Desenvolver o layout da tela de autenticação (Login com redirecionamento por perfil: *Admin* vs *Cozinheira*).

3. **Desenvolvimento das Telas Operacionais:**
   * Construir a interface simplificada para as cozinheiras selecionarem o prato do cardápio base, editarem quantidades com medidas populares e submeterem o registo diário.
   * Desenvolver o painel gerencial de auditoria e controlo de estoque para a administração.

4. **Empacotamento e Implantação (Deploy):**
   * Configurar o Dockerfile para o backend e frontend.
   * Realizar o deploy e publicação da aplicação na VPS do usuário utilizando o ecossistema Coolify.
