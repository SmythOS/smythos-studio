# Use Node.js 22 Alpine as base image
FROM node:22-alpine

# Install necessary packages and SSL libraries for Prisma
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat \
    ca-certificates

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .env ./

# Copy TypeScript config
COPY tsconfig.json ./

# Install pnpm globally
RUN npm install -g pnpm@10.12.2

# Set environment for Prisma to use the correct binary
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-arm64-openssl-3.0.x"

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
RUN PRISMA_CLI_BINARY_TARGETS="linux-musl-arm64-openssl-3.0.x" pnpm run prisma:generate

RUN mkdir -p /root  && mkdir -p /root/smyth-ui-data && echo '{}' > /root/smyth-ui-data/vault.json

# Create startup script
COPY <<EOF /app/start.sh
#!/bin/sh

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
sleep 10

# Run Prisma migrations
echo "Running Prisma migrations..."
cd /app/packages/middleware
export PRISMA_CLI_BINARY_TARGETS="linux-musl-arm64-openssl-3.0.x"
pnpm run prisma:deploy
echo "Migrations completed!"

echo "Starting SmythOS services"
cd /app/
pnpm start

echo "All services started!"

EOF

# Make startup script executable
RUN chmod +x /app/start.sh

# Expose only the app port
EXPOSE 4000

# Start the application
CMD ["/app/start.sh"]
