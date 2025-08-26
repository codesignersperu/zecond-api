# Use a Node.js base image (Debian-based for easier Bun installation)
FROM node:20

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Add Bun to the PATH
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

RUN bun run build

EXPOSE 3001

CMD ["bun", "run", "start:prod"]
