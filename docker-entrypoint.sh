#!/bin/sh

# echo "Waiting for MySQL to be ready..."
# sleep 10

echo "Running Prisma migrations..."
cd /app/packages/middleware
# export PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
pnpm run prisma:deploy
echo "Migrations completed!"

echo "Starting SmythOS services"
cd /app/
pnpm start

echo "All services started!"
# SCRIPT
