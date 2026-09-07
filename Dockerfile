# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# package-lock.json 由 npm 11 生成；镜像自带 npm 10，需对齐后再 npm ci
RUN npm install -g npm@11.12.1

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    NITRO_PORT=6892 \
    DATA_DIR=/data

COPY --from=build /app/.output ./.output
COPY --from=build /app/server/utils ./server/utils
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY server/cli/reset-password.mjs ./server/cli/reset-password.mjs
COPY server/cli/slider.mjs ./server/cli/slider.mjs
COPY server/cli/clear-domains.mjs ./server/cli/clear-domains.mjs
COPY server/cli/backup-cli-loader.mjs ./server/cli/backup-cli-loader.mjs
COPY server/cli/backup-export.mjs ./server/cli/backup-export.mjs
COPY server/cli/backup-restore.mjs ./server/cli/backup-restore.mjs
COPY server/cli/storage-sync.mjs ./server/cli/storage-sync.mjs
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 6892
VOLUME /data

ENTRYPOINT ["/docker-entrypoint.sh"]
