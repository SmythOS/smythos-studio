# Use Node.js 22 Alpine as base image
FROM node:22-alpine

# Install necessary packages and SSL libraries for Prisma
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat \
    ca-certificates \
    curl

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .env ./

# Copy TypeScript config
COPY tsconfig.json ./

# Install pnpm globally
RUN npm install -g pnpm@10.12.2

# Set environment for Prisma to use the correct binary
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"

# Copy all package source code
COPY packages/ ./packages/  

# Install dependencies for all packages
RUN pnpm install

# Build all packages
RUN pnpm run build

# Patch the app to bind to 0.0.0.0 instead of localhost
WORKDIR /app/packages/app
RUN sed -i 's/listen(PORT, "localhost",/listen(PORT, process.env.HOST || "0.0.0.0",/g' dist/server/index.js

# Generate Prisma client for Alpine Linux with correct binary target
WORKDIR /app/packages/middleware
RUN PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x" pnpm run prisma:generate

RUN mkdir -p /root  && mkdir -p /root/smythos-data && echo '{}' > /root/smythos-data/vault.json


COPY docker-entrypoint.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

# Expose app port + runtime port
EXPOSE 5050 5053

# Start the application
CMD ["/app/start.sh"]
