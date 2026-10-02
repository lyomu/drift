FROM node:24-bookworm-slim AS build

WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci

ENV NODE_ENV=production
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3012
ENV HOSTNAME=0.0.0.0

# `--chown=node:node` is required because the runtime stage drops to the
# non-root `node` user. Next.js writes optimized images under `.next/cache` at
# runtime, so without ownership of the copied tree the image optimizer fails
# with `EACCES: permission denied, mkdir '/app/.next/cache'`.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# `output: "standalone"` traces server code only — it does not bundle public/.
# The landing page serves its photography from there, so without this copy
# every image 404s in the container while working fine in `next dev`.
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3012
CMD ["node", "server.js"]
