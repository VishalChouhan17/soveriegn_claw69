# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Pass --secret id=proxy_ca,src=... when the environment uses a custom proxy CA.
RUN --mount=type=secret,id=proxy_ca if [ -f /run/secrets/proxy_ca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci; else npm ci; fi
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends python3 bubblewrap ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/scripts ./scripts
RUN mkdir /data && chown node:node /data && chmod 700 /data
USER node
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 SOVEREIGN_DATA_DIR=/data
VOLUME /data
EXPOSE 3000
# Use an HTTPS reverse proxy and a persistent /data volume. Configure owner auth.
# Host support for unprivileged namespaces is required for Python tools.
CMD ["node", "--use-env-proxy", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]
