FROM oven/bun:1.4-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time,
# so they must arrive as build args, not runtime env.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
# next.config.ts is evaluated again by `next start`, and the next-intl
# plugin inside it verifies ./i18n/request.ts exists (which imports from
# ./messages), so both must ship with the runtime image.
COPY i18n ./i18n
COPY messages ./messages
COPY package.json next.config.ts ./
EXPOSE 3000
CMD ["bun", "run", "start"]
