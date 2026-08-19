# Usa uma versão leve do Python
FROM python:3.11-slim

# Define a pasta de trabalho dentro do servidor
WORKDIR /app

# Copia o ficheiro de dependências e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código do backend para o servidor
COPY . .

# Expõe a porta 8000 (a mesma que usamos localmente)
EXPOSE 8000

# Comando para ligar o motor do FastAPI.
# 1. `alembic upgrade head` primeiro: num banco vazio o bootstrap consulta a
#    tabela usuarios, que só existe depois da migração (idempotente).
# 2. Se BOOTSTRAP_ADMIN_NAME estiver definido (produção), cria o primeiro admin
#    (idempotente — não altera se já existir).
# 3. Sobe o servidor; o startup do main.py roda upgrade head de novo (no-op).
CMD ["sh", "-c", "alembic upgrade head && if [ -n \"$BOOTSTRAP_ADMIN_NAME\" ]; then python -m scripts.bootstrap_admin; fi && exec uvicorn main:app --host 0.0.0.0 --port 8000"]