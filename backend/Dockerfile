FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend

COPY backend/tsconfig.json ./backend/
COPY backend/src/ ./backend/src/

RUN npm run build --workspace=backend

FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend --omit=dev && npm cache clean --force

RUN apk del python3 make g++

COPY --from=builder /app/backend/dist ./backend/dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "backend/dist/index.js"]
