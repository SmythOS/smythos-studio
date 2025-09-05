# Use Node.js 22 Alpine as base image
FROM node:22-alpine

# Install necessary packages and SSL libraries for Prisma
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    openssl \
    openssl-dev \
    libc6-compat \
    ca-certificates

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy TypeScript config
COPY tsconfig.json ./

# Install pnpm and pm2 globally
RUN npm install -g pnpm@10.12.2 pm2

# Set environment for Prisma to use the correct binary
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-arm64-openssl-3.0.x"

# Copy all package source code

COPY packages/ ./packages/ 

# Install dependencies for all packages
RUN pnpm install

# Build all packages
WORKDIR /app/packages/app
RUN pnpm run bundle:prod

# Patch the app to bind to 0.0.0.0 instead of localhost
RUN sed -i 's/listen(PORT, "localhost",/listen(PORT, process.env.HOST || "0.0.0.0",/g' dist/server/index.js

WORKDIR /app/packages/middleware
# Generate Prisma client for Alpine Linux with correct binary target
RUN PRISMA_CLI_BINARY_TARGETS="linux-musl-arm64-openssl-3.0.x" pnpm run prisma:generate
RUN pnpm run build

WORKDIR /app/packages/runtime
RUN pnpm run build

# Create PM2 ecosystem file
COPY <<EOF /app/ecosystem.config.js
module.exports = {
  apps: [
          {
        name: 'smythos-middleware',
        script: '/app/packages/middleware/dist/index.js',
        cwd: '/app/packages/middleware',
        env: {
            PORT: 3000,
            NODE_ENV: 'development',
            API_SERVER: 'http://localhost:5053',
            REDIS_HOST: 'redis',
            REDIS_PORT: '6379',
            REDIS_PASSWORD: ''
        },
        error_file: '/app/logs/middleware-error.log',
        out_file: '/app/logs/middleware-out.log',
        log_file: '/app/logs/middleware-combined.log',
        time: true,
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G'
      },
          {
        name: 'smythos-runtime',
        script: '/app/packages/runtime/dist/index.cjs',
        cwd: '/app/packages/runtime',
        env: {
          PORT: 5053,
          NODE_ENV: 'development',
          MIDDLEWARE_API_BASE_URL: 'http://localhost:3000',
          DATA_PATH: '/root/smyth-ui-data'
        },
        error_file: '/app/logs/runtime-error.log',
        out_file: '/app/logs/runtime-out.log',
        log_file: '/app/logs/runtime-combined.log',
        time: true,
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G'
      },
        {
        name: 'smythos-app',
        script: '/app/packages/app/dist/server/index.js',
        cwd: '/app/packages/app',
        env: {
          PORT: 4000,
          NODE_ENV: 'development',
          SMYTH_API_SERVER: 'http://localhost:3000',
          MIDDLEWARE_API_BASE_URL: 'http://localhost:3000',
          UI_SERVER: 'http://localhost:4000',
          SMYTH_API_SERVER: "http://localhost:3000",
          API_SERVER: 'http://localhost:5053',
          SMYTH_VAULT_API_BASE_URL: "http://localhost:3000/v1"
        },
        error_file: '/app/logs/app-error.log',
        out_file: '/app/logs/app-out.log',
        log_file: '/app/logs/app-combined.log',
        time: true,
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G'
      }
  ]
};
EOF

# Create log directories and data directories
RUN mkdir -p /app/logs /app/packages/middleware/data /app/packages/runtime/data

RUN mkdir -p /root  && mkdir -p /root/smyth-ui-data && echo '{}' > /root/smyth-ui-data/vault.json

# Create startup script
COPY <<EOF /app/start.sh
#!/bin/sh

echo "Starting SmythOS services with PM2..."

# Run Prisma migrations first
echo "Running Prisma migrations..."
cd /app/packages/middleware
export PRISMA_CLI_BINARY_TARGETS="linux-musl-arm64-openssl-3.0.x"
pnpm run prisma:deploy
echo "Migrations completed!"

# Start middleware first
pm2 start /app/ecosystem.config.js --only smythos-middleware
echo "Waiting for middleware to start..."
sleep 10

# Start runtime
pm2 start /app/ecosystem.config.js --only smythos-runtime
echo "Waiting for runtime to start..."
sleep 5

# Start app last
pm2 start /app/ecosystem.config.js --only smythos-app
echo "All services started!"

# Keep the container running
pm2 logs
EOF

# Make startup script executable
RUN chmod +x /app/start.sh

# Expose only the app port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Start the application
CMD ["/app/start.sh"]
