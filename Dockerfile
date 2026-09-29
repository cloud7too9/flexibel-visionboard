# syntax=docker/dockerfile:1

# ---- Build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Abhängigkeiten zuerst, damit der Layer-Cache bei Code-Änderungen greift.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime --------------------------------------------------------------
FROM nginx:stable-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
