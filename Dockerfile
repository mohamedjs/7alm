# 7alm web — Next.js 16 standalone (storefront, landing pages, admin dashboard).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
# Rewrites (/api, /uploads → api) are baked at build time; Server Components read BACKEND_URL at runtime too.
ARG BACKEND_URL=http://api:4000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_WS_URL=
ARG NEXT_PUBLIC_IPINFO_TOKEN=
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_API_WS_URL=$NEXT_PUBLIC_API_WS_URL \
    NEXT_PUBLIC_IPINFO_TOKEN=$NEXT_PUBLIC_IPINFO_TOKEN \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npx next build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.js"]
