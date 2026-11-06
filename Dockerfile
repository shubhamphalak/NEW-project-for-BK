# syntax=docker/dockerfile:1
FROM node:24-alpine

WORKDIR /app

# One process serves the static frontend and /api endpoints on the same port.
# The application has no npm dependencies or frontend build step.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4173

COPY --chown=node:node package.json server.mjs index.html ./
COPY --chown=node:node server/ ./server/
COPY --chown=node:node src/ ./src/
COPY --chown=node:node assets/ ./assets/
COPY --chown=node:node data/ ./data/

USER node

EXPOSE 4173

# Checks the local HTTP server without calling OpenAI.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 4173) + '/api/config', { signal: AbortSignal.timeout(2000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.mjs"]
