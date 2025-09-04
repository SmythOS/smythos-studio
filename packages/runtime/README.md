# SmythOS Runtime Server

A unified runtime server that provides comprehensive execution, debugging, and integration capabilities for SmythOS agents.

## 📚 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [💡 What is SmythOS Runtime?](#-what-is-smythos-runtime)
- [🏗️ Architecture](#️-architecture)
- [⚙️ Installation & Usage](#️-installation--usage)
- [🔧 Configuration](#-configuration)
- [🌐 API Modules](#-api-modules)
- [🚀 Smart Routing](#-smart-routing)
- [🌐 Deployment](#-deployment)
- [🔍 Troubleshooting](#-troubleshooting)

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Health check
curl http://localhost:5053/health
```

## 💡 What is SmythOS Runtime?

The SmythOS Runtime Server is the execution engine for SmythOS agents. It provides:

- **Agent Execution**: Run and manage SmythOS agents with OAuth authentication
- **Debug Capabilities**: Debug agent workflows with real-time monitoring
- **Integration Hub**: Connect agents to external services (ChatGPT, OpenAI, Alexa, etc.)
- **API Gateway**: Unified API for all SmythOS runtime operations

## 🏗️ Architecture

The runtime server is organized into three core modules:

```
src/
├── core/                    # Shared infrastructure
│   ├── config/             # Configuration management
│   ├── middlewares/        # Common middleware (CORS, auth, etc.)
│   ├── services/           # Shared services
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── modules/                # Runtime modules
│   ├── agent-runner/       # Agent execution & OAuth
│   ├── debugger/           # Debug capabilities & monitoring
│   └── embodiment/         # External integrations
└── services/               # Additional services
    └── code-sandbox.service.ts
```

### Core Components

- **Agent Runner**: Executes SmythOS agents with authentication and rate limiting
- **Debugger**: Provides debugging capabilities with component-level tracking
- **Embodiment**: Handles integrations with external platforms and services

## ⚙️ Installation & Usage

### Development

```bash
# Install dependencies
pnpm install

# Start development server with auto-reload
pnpm run dev

# The server will start on http://localhost:5053
```

### Production

```bash
# Build the application
pnpm run build

# Start production server
pnpm run start:prod
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Development mode with auto-reload |
| `pnpm run build` | Build for production |
| `pnpm run start:prod` | Start production server |
| `pnpm run test` | Run tests |
| `pnpm run lint` | Lint TypeScript files |
| `pnpm run clean` | Clean build directory |

## 🔧 Configuration

### Required Environment Variables

```bash
# Authentication (LogTo configuration)
LOGTO_M2M_APP_SECRET="your-m2m-app-secret"
LOGTO_M2M_APP_ID="your-m2m-app-id"  
LOGTO_SERVER="https://auth.yourdomain.com"
LOGTO_API_RESOURCE="https://api.yourdomain.com"
MIDDLEWARE_API_BASE_URL="http://middleware.yourdomain.com"
```

### Optional Configuration

```bash
# Server Configuration
PORT="5053"                  # Runtime server port
ADMIN_PORT="5054"           # Admin interface port
BASE_URL="http://localhost:5053"
UI_SERVER="http://localhost:4000"

# Security
SESSION_SECRET="your-random-secret-here"

# Storage
DATA_PATH="/path/to/your/data"

# Agent Domain Configuration
DEFAULT_AGENT_DOMAIN="localagent.stage.yourdomain.ai"
PROD_AGENT_DOMAIN="agentid.yourdomain.com"
```

> **⚠️ Local Development**: For local agent execution, ensure your domain contains `localagent`

## 🌐 API Modules

### Agent Runner (`/api/*`)
- **OAuth Authentication**: `/oauth/*` - Handle OAuth flows
- **Agent Execution**: `/agent/*` - Execute and manage agents
- **File Operations**: File upload and processing capabilities

### Debugger (`/models/*`)
- **Model Management**: Team-based access control for AI models
- **Debug Sessions**: Real-time agent debugging and monitoring
- **Component Tracking**: Async component execution tracking

### Embodiment (Various endpoints)
- **ChatGPT Plugin**: `/chatgpt/*` - ChatGPT plugin integration
- **OpenAI Proxy**: `/openai/*` - OpenAI API proxy
- **Alexa Skills**: `/alexa/*` - Amazon Alexa integration
- **MCP Protocol**: `/mcp/*` - Model Context Protocol support
- **API Documentation**: `/swagger/*` - Interactive API docs
- **Postman Collections**: `/postman/*` - Generate API collections

## 🚀 Smart Routing

The runtime server uses intelligent routing to direct requests to the appropriate module based on HTTP headers:

### Quick Examples

```bash
# Default behavior (Agent Runner)
curl http://localhost:5053/api/test

# Force specific modules
curl -H "X-FORCE-AGENT-RUNNER: true" http://localhost:5053/api/test
curl -H "X-FORCE-DEBUGGER: true" http://localhost:5053/api/test

# Debug session
curl -H "X-DEBUG-RUN: true" http://localhost:5053/api/test
```

### Routing Headers

| Header | Purpose | Routes To |
|--------|---------|-----------|
| `X-FORCE-AGENT-RUNNER` | Force agent execution | Agent Runner |
| `X-FORCE-DEBUGGER` | Force debug mode | Debugger |
| `X-DEBUG-RUN` | Start debug session | Debugger |
| `X-MONITOR-ID` | Monitor agent execution | Debugger |

### Server Modes

Control server functionality with the `SERVER_MODE` environment variable:

- `runtime` (default): Full functionality
- `agent`: Agent runner only
- `debugger`: Debugger only  
- `embodiment`: Integrations only

## 🌐 Deployment

### Environment Requirements

**Development:**
- Node.js 18+
- pnpm 8+
- LogTo authentication server

**Production:**
- All development requirements
- Redis (for session management)
- SSL certificates
- Load balancer (recommended)

### Production Deployment

1. **Build the application:**
   ```bash
   pnpm run build
   ```

2. **Set environment:**
   ```bash
   NODE_ENV=production
   PORT=5053
   # Add production environment variables
   ```

3. **Start server:**
   ```bash
   pnpm run start:prod
   ```

### Health Monitoring

Check server health at: `http://localhost:5053/health`

The health endpoint provides:
- Server status and mode
- Available modules
- Version information

## 🔍 Troubleshooting

### Common Issues

**Authentication Failing**
- Verify LogTo environment variables
- Ensure LogTo server is accessible
- Check M2M app configuration

**Routing Issues**
```bash
# Test with explicit headers
curl -H "X-FORCE-AGENT-RUNNER: true" http://localhost:5053/api/test
```

**Build Problems**
```bash
# Increase memory for builds
export NODE_OPTIONS='--max-old-space-size=4096'
pnpm run build
```

**Development Server Issues**
```bash
# Clean reinstall
rm -rf node_modules
pnpm install
```

### Debug Mode

Enable debug logging by setting routing headers:

```bash
# Enable debug mode
curl -H "X-DEBUG-RUN: true" http://localhost:5053/api/test

# Monitor specific session
curl -H "X-MONITOR-ID: session-123" http://localhost:5053/api/test
```

## 📊 Monitoring & Logging

The server provides comprehensive logging for:
- Request routing decisions
- Authentication events
- Agent execution status
- Error tracking and debugging

Logs are formatted for easy consumption and include routing reasons for troubleshooting.

## 🔐 Security Features

- **Rate Limiting**: Built-in rate limiting for API endpoints
- **CORS Protection**: Configurable CORS policies
- **Authentication**: OAuth 2.0 with LogTo integration
- **Input Validation**: Request validation with Joi schemas
- **Error Handling**: Secure error responses without sensitive data exposure

## 🤝 Contributing

When contributing to the runtime server:

1. **Follow TypeScript best practices**
2. **Add tests for new functionality**
3. **Update documentation for API changes**
4. **Maintain backward compatibility**
5. **Test routing scenarios thoroughly**

## 📄 License

This project is part of the SmythOS ecosystem.