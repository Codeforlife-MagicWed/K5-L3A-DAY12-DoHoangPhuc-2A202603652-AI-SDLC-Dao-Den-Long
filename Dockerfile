FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .
RUN npm install --no-save vite && npm run build && rm -rf node_modules/vite node_modules/esbuild

ENV PORT=4173
EXPOSE 4173

CMD ["node", "src/server/run.js"]
