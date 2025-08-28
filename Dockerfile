# Stage 1: Install dependencies with Bun
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Runtime with Node.js
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apt install vim

# Copy installed dependencies from Bun stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
