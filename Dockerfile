# ---------- Stage 1: build the React frontend ----------
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Node server + Icarus Verilog ----------
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends iverilog \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY verilog/ ./verilog/
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
