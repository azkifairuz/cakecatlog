# ---------- Build stage ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
# npm install (bukan npm ci): lockfile dari macOS tidak mencatat optional deps khusus Linux (@emnapi/*)
RUN npm install --no-audit --no-fund

COPY . .

# Variabel $env/static/public di-bake saat build
ARG PUBLIC_API_BASE_URL
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}

RUN npm run build && npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000
CMD ["node", "build"]
