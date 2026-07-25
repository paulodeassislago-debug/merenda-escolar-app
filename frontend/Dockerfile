# Etapa 1: Construção do React com Node.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx Otimizado
FROM nginx:alpine

# Copia os ficheiros compilados para a pasta pública do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração limpa do Nginx para suportar o React Router (SPA)
RUN rm -rf /etc/nginx/conf.d/default.conf
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/app.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]