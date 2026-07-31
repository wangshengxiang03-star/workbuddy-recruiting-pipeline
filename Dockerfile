FROM node:22.13.0-bookworm-slim AS runner

WORKDIR /app

ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
