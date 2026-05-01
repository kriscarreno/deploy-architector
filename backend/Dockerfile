FROM node:20-alpine

WORKDIR /app

# Install git (required by simple-git)
RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Data directory for SQLite and cloned repos
RUN mkdir -p data/repos

EXPOSE 3000

CMD ["node", "src/server.js"]
