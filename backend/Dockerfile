# ── Build stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install git (required by simple-git)
RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci

COPY . .

# Compile TypeScript
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install git (required by simple-git at runtime)
RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env ./.env

# Data directory for SQLite and cloned repos
RUN mkdir -p data/repos

EXPOSE 3000

CMD ["node", "dist/server.js"]
