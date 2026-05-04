# SafeShelf recall-service — OpenFDA proxy (compose sets OPENFDA_API_KEY, NODE_ENV, PORT)
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 5001

CMD ["node", "dist/server.js"]
