# syntax=docker/dockerfile:1

# ─── deps: all dependencies, cached by lockfile ──────────────────────────────
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund

# ─── build: compile TypeScript ───────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ─── prod-deps: runtime dependencies only ────────────────────────────────────
FROM node:26-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# ─── runtime: minimal image, non-root user ───────────────────────────────────
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# The app runs as `node dist/app/main.js`: package managers are not needed at runtime.
# Removing them shrinks the attack surface (the bundled npm ships its own dependencies).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health/live').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run migrations as a separate release step: docker run <image> node dist/app/migrate.js
CMD ["node", "--enable-source-maps", "dist/app/main.js"]
