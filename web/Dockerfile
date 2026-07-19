# ── Build the SPA ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build-time public config (Vite inlines VITE_* at build). Pass with
# `--build-arg VITE_GOOGLE_CLIENT_ID=...` if you use Google login.
ARG VITE_GOOGLE_CLIENT_ID
RUN npm run build

# ── Serve with Caddy (auto-HTTPS) + reverse-proxy /api to the backend ──────────
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
