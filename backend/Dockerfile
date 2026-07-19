# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Generate the Prisma client, then compile TS -> dist/
RUN npx prisma generate && npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Copy the already-installed deps (incl. the generated Prisma client) + build output.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 5000
# Apply migrations, then start. NOTE: until you've created the first migration
# (roadmap 04, Week 2 Thu — `prisma migrate dev --name init` locally), swap
# `migrate deploy` for `db push`:  sh -c "npx prisma db push && node dist/server.js"
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
