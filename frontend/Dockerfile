FROM node:20-alpine AS base

# --- Install dependencies ---
FROM base AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# --- Build the application ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
# Docs live at project root — copy to /docs so loadDocs() can find them
# (page.tsx reads from path.join(cwd, '..', 'docs') = /docs)
COPY docs/ /docs/
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Production image ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy docs for server component access at runtime
COPY --from=builder --chown=nextjs:nodejs /docs /docs

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
