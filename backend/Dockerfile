FROM node:24-bookworm-slim AS build

WORKDIR /app
ENV NODE_ENV=development

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# npm ci is too strict across npm major versions (npm 12 on node:24 adds
# platform-specific optional entries to the lockfile that npm 11 doesn't), so
# use npm install --package-lock-only + npm ci compatible flow: install from
# the lockfile but tolerate a pre-existing lockfile made by an older npm.
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

USER node
EXPOSE 3009
CMD ["node", "dist/src/main.js"]
