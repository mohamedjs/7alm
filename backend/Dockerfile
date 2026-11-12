# 7alm backend — one image, two processes: `node dist/main.js` (api) and `node dist/worker.js` (worker).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npx nest build && npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production KAFKAJS_NO_PARTITIONER_WARNING=1 UPLOAD_DIR=/data/uploads
WORKDIR /app
RUN apk add --no-cache tini && addgroup -S app && adduser -S app -G app && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/prisma.config.ts /app/package.json ./
USER app
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 CMD wget -qO- http://127.0.0.1:4000/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
