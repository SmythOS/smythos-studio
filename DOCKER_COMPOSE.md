# Docker Setup Guide for SmythOS UI

This guide explains how to run SmythOS UI using Docker, both with the standalone Dockerfile and the complete docker compose setup.

## Contents

- [Docker Setup Guide for SmythOS UI](#docker-setup-guide-for-smythos-ui)
	- [Contents](#contents)
	- [Prerequisites](#prerequisites)
	- [Quick Start with Docker Compose (Recommended)](#quick-start-with-docker compose-recommended)
		- [1. Environment Setup](#1-environment-setup)
		- [2. Start All Services](#2-start-all-services)
		- [3. Access the Application](#3-access-the-application)
	- [Docker Compose Architecture](#docker compose-architecture)
		- [Services Overview](#services-overview)
		- [Network Architecture](#network-architecture)
		- [Volume Management](#volume-management)
	- [Standalone Dockerfile Usage](#standalone-dockerfile-usage)
		- [Running the Container](#running-the-container)
	- [Environment Variables](#environment-variables)
		- [Required Variables](#required-variables)
	- [Production Deployment](#production-deployment)
		- [Domain & SSL/TLS Configuration](#domain-ssltls-configuration)
		- [Security Considerations](#security-considerations)
	- [Troubleshooting](#troubleshooting)
		- [Common Issues](#common-issues)
	- [Maintenance](#maintenance)
		- [Updates](#updates)

## Prerequisites

- **Docker**: Version 20.10 or newer
- **Docker Compose**: Version 2.0 or newer (included with Docker Desktop)
- **Root/Admin Access**: Required for Docker commands
- **System Requirements**: 
  - 8GB RAM minimum
  - 10GB free disk space
  - Ports 80, 443, 5050, 5053, 8080 available

> **⚠️ Important**: All Docker commands in this guide should be run as root user (Linux/macOS) or Administrator (Windows) to avoid permission issues.

## Quick Start with Docker Compose (Recommended)

The docker compose setup provides a complete production-ready environment with all necessary services.

### 1. Clone the Repository

```bash
git clone https://github.com/SmythOS/smythos-studio.git
cd smythos-studio
```

### 2. Environment Setup

Create your environment file:

```bash
cp .env.compose.example .env
```

(Optional) Edit the `.env` file with your configuration (e.g. changing default passwords, your domains, etc.)


### 3. Start All Services

Launch the complete SmythOS UI stack:

> **⚠️ Run as Root/Admin**: Ensure you're running as root (Linux/macOS) or Administrator (Windows)

```bash
# Start all services in detached mode
docker compose up -d

# View logs (optional)
docker compose logs -f
```

### 4. Access the Application

Once all services are healthy:

- **Main Application**: http://localhost (or your configured APP_URL)
- **Runtime Server**: http://runtime.localhost (or your configured RUNTIME_URL)

> **⚠️ Localhost Subdomain Issue**: Only applies when using the default localhost domain configuration. Some operating systems might not automatically route `*.localhost` subdomains to the loopback address. If you can't access the subdomain URLs above please configure your own domains & DNS configuration.

## Docker Compose Architecture

### Services Overview

| Service | Purpose | Port | Health Check |
|---------|---------|------|--------------|
| **traefik** | Reverse proxy & SSL termination | 80, 443, 8080 | Built-in |
| **mysql** | Database server | 3306 (internal) | mysqladmin ping |
| **redis** | Cache & session store | 6379 (internal) | redis-cli ping |
| **smythos** | Main application | 5050, 5053 | HTTP health endpoints |

### Network Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Internet      │────│   Traefik        │
│                 │    │   (Port 80/443)  │
└─────────────────┘    └──────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼────┐ ┌────▼────┐ ┌───▼────┐
            │  SmythOS   │ │  MySQL  │ │ Redis  │
            │ (5050/5053)│ │ (3306)  │ │ (6379) │
            └────────────┘ └─────────┘ └────────┘
```

### Volume Management

- **mysql_data**: Persistent MySQL database storage
- **redis_data**: Redis persistence and cache
- **smythos_data**: Application data and user uploads
- **traefik_letsencrypt**: SSL certificates storage

## Standalone Dockerfile Usage

For custom configurations, you can use the Dockerfile directly.

### Running the Container

```bash
# Run with environment file
docker run -d \
  --name smythos-app \
  -p 5050:5050 \
  -p 5053:5053 \
  --env-file .env \
  -v smythos_data:/home/node/smythos-data \
  smythos-ui:latest
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |




## Production Deployment

### Domain & SSL/TLS Configuration

The docker compose setup includes automatic SSL certificate generation via Let's Encrypt:

1. **Configure your domains & tls configuration** in `.env`:
   ```env
   APP_DOMAIN=https://yourdomain.com
   RUNTIME_DOMAIN=https://runtime.yourdomain.com
   DEFAULT_AGENT_DOMAIN=dev.yourdomain.com
   PROD_AGENT_DOMAIN=live.yourdomain.com
   LETSENCRYPT_EMAIL=admin@yourdomain.com
   ENABLE_TLS=true
   ```

   + remove the `AGENT_DOMAIN_PORT` variable

2. **Ensure DNS records** point to your server:
   ```
   yourdomain.com          A    YOUR_SERVER_IP
   runtime.yourdomain.com  A    YOUR_SERVER_IP
   *.dev.yourdomain.com A    YOUR_SERVER_IP
   *.live.yourdomain.com   A    YOUR_SERVER_IP
   ```

3. **Start with SSL enabled**:
   ```bash
   docker compose up -d
   ```

### Security Considerations

- **Change default passwords** in `.env`
- **Use strong database credentials**
- **Configure firewall** to only allow necessary ports
- **Regular updates** of Docker images
- **Monitor logs** for suspicious activity


## Troubleshooting

### Common Issues


**1. Services not starting:**
```bash
# Check service status
docker compose ps

# View logs for specific service
docker compose logs mysql
docker compose logs smythos
```

**2. Database connection errors:**
```bash
# Verify MySQL is healthy
docker compose exec mysql mysqladmin ping -u root -p

# Check database connectivity from app
docker compose exec smythos sh -c "mysql -h mysql -u \$DATABASE_USER -p\$DATABASE_PASSWORD -e 'SELECT 1'"
```

**3. Port conflicts:**
```bash
# Check what's using the ports
netstat -tlnp | grep :80
netstat -tlnp | grep :443


# Either stop any service using 80 and/or 443 OR use different ports in .env (not suitable for production) 
EXPOSE_TRAEFIK_PORT=8080
EXPOSE_HTTPS_TRAEFIK_PORT=8443
```

## Maintenance

### Updates

```bash
# Down the services
docker compose down

# Pull latest images
docker compose pull

# Rebuild and restart services
docker compose up -d
```


## Support

For issues with Docker deployment:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker compose logs -f`
3. Verify environment configuration in `.env`
4. Ensure all prerequisites are met

For development setup, see [CONTRIBUTING.md](CONTRIBUTING.md) for the local development environment.
