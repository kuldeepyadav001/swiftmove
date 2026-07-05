# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
# Serves the Vite build with nginx. /api and /ws are proxied to BACKEND_URL.
FROM nginx:1.27-alpine

ENV BACKEND_URL=http://backend:8080

COPY nginx.conf.template /etc/nginx/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["sh", "-c", "envsubst '$BACKEND_URL' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
