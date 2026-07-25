# Etapa 1: Construção (Build) com Node.js
FROM node:20-alpine as builder
WORKDIR /app

# Instala as dependências
COPY package*.json ./
RUN npm install

# Copia o código e constrói a versão otimizada do React
COPY . .
RUN npm run build

# Etapa 2: Servidor Web ultrarrápido (Nginx)
FROM nginx:alpine

# Copia o site pronto da Etapa 1 para a pasta pública do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Truque de Mestre: Ensina o Nginx a lidar com as rotas do React Router (/cozinha, /gestao)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expõe a porta 80 do servidor web
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]