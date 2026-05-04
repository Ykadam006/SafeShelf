# SafeShelf API — production image (compose sets DATABASE_URL, RECALL_SERVICE_URL, NODE_ENV, PORT)
FROM node:22-alpine AS build

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate && npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/server.js"]
