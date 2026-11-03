# NEXA server image. Build from the repository root:  docker build -t nexa-server .
# server/extensions.js reads ../package.json, so the root package.json is copied alongside server/.
FROM node:22-bookworm-slim AS deps
WORKDIR /app/server
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY server/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=4000 DB_PATH=/data/nexa.db
WORKDIR /app
COPY package.json ./package.json
COPY server ./server
COPY docs/legal ./docs/legal
COPY --from=deps /app/server/node_modules ./server/node_modules
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
