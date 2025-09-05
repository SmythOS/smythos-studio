# SRE Runtime Server

A Runtime Server that combines the functionality of three separate SmythOS Runtime servers:

- **sre-agent-server** (Agent Runner)
- **sre-builder-debugger** (Debugger)
- **sre-embodiment-server** (Embodiment)

## 📚 Table of Contents

- [🚀 Quick Start - Smart Routing](#-quick-start---smart-routing)
- [🚀 Smart Routing System](#-smart-routing-system) ⭐ **New!**
- [Server Modes](#server-modes)
- [Installation & Usage](#installation--usage)
- [Configuration](#configuration)
- [Health Check](#health-check)

## 🚀 Quick Start - Smart Routing

```bash
# Default (Agent Runner)
curl http://localhost:5000/api/test

# Force Agent Runner
curl -H "X-FORCE-AGENT-RUNNER: true" http://localhost:5000/api/test

# Force Debugger
curl -H "X-FORCE-DEBUGGER: true" http://localhost:5000/api/test

# Debug Session
curl -H "X-DEBUG-RUN: true" http://localhost:5000/api/test
```

> 📖 **[See full Smart Routing documentation below](#-smart-routing-system)**

## Server Modes

The server can run in different modes based on the `SERVER_MODE` environment variable:

- `runtime` (default): All functionality enabled
- `agent`: Only agent runner functionality
- `debugger`: Only debugger functionality
- `embodiment`: Only embodiment functionality

## Directory Structure

```
src/
├── core/                 # Shared functionality across all servers
│   ├── services/         # Common services (Redis, logging, etc.)
│   ├── middlewares/      # Common middlewares (CORS, rate limiting, etc.)
│   ├── types/           # Shared TypeScript types
│   └── utils/           # Utility functions
├── agent-runner/        # Agent server specific code
│   ├── routes/          # Agent routes (/oauth, /agent, etc.)
│   └── middlewares/     # Agent-specific middlewares
├── debugger/            # Debugger specific code
│   ├── routes/          # Debugger routes (/models, etc.)
│   └── services/        # Debugger services (component-async-ctx)
└── embodiment/          # Embodiment specific code
    ├── modules/         # Embodiment modules (ChatGPT, OpenAI, etc.)
    ├── helpers/         # Helper functions
    └── routes/          # Embodiment routes
```

## Configuration

1. Copy `.env.example` to `.env` and configure your environment variables
2. Set `PORT=5000` to run on port 5000
3. Set `SERVER_MODE=runtime` to enable all functionality

## Installation & Usage

```bash
# Install dependencies
npm install

# Link smyth-runtime (if needed)
npm link smyth-runtime

# Development mode with auto-reload
npm run dev

# Build for development
npm run build:dev

# Build for production
npm run build

# Start the server
npm run start
```

## Available Scripts

### Core Scripts (Minimal)
- `npm run dev` - Development mode with auto-reload using nodemon
- `npm run build` - Build for production 
- `npm run start:prod` - Start server in production mode

### Additional Scripts
- `npm run test` - Run tests
- `npm run clean` - Clean the dist directory
- `npm run lint` - Lint TypeScript files
- `npm run lint-fix` - Lint and auto-fix TypeScript files
- `npm run ts-error-scan` - Check for TypeScript errors without emitting files
- `npm run format` - Format TypeScript files with Prettier
- `npm run prettier:format` - Format all supported files with Prettier
- `npm run bump` - Bump patch version

## 🔧 Environment Setup

### Required (for both development and production):
```bash
# Authentication (get these from your LogTo setup)
LOGTO_M2M_APP_SECRET="your-m2m-app-secret"
LOGTO_M2M_APP_ID="your-m2m-app-id"  
LOGTO_SERVER="https://auth.yourdomain.com"
LOGTO_API_RESOURCE="https://api.yourdomain.com"
MIDDLEWARE_API_BASE_URL="http://middleware.yourdomain.com"
```

### Optional (development):
```bash
# Ports
PORT="5053"              # Runtime server port
ADMIN_PORT="5054"        # Admin interface port  

# URLs
BASE_URL="http://localhost:5053"
UI_SERVER="http://localhost:4000"

# Security
SESSION_SECRET="your-random-secret-here"

# Storage
DATA_PATH="/path/to/your/data"
```

### Domain Configuration:

> **⚠️ WARNING**: To run the agent locally, the domain name must contain `localagent`

When running agents in a local development environment, ensure your domain configuration includes the keyword `localagent`. This is required for proper local agent execution and routing.

```bash
# Development/staging wildcard domain
DEFAULT_AGENT_DOMAIN="localagent.stage.yourdomain.ai"

# Production wildcard domain  
PROD_AGENT_DOMAIN="agentid.yourdomain.com"
```

**Example:**
```bash
# ✅ Correct - domain contains 'localagent'
DEFAULT_AGENT_DOMAIN="localagent.stage.yourdomain.ai"

# ❌ Incorrect - missing 'localagent' keyword
DEFAULT_AGENT_DOMAIN="localhost:3000"
```

## 🌐 Deployment

### Environment Requirements

**Development:**
- Node.js 18+
- pnpm 8+
- LogTo authentication server

**Production:**
- All development requirements
- Redis (for session management)
- SSL certificates (for production domains)
- Load balancer (recommended)

### Quick Deploy

1. **Build everything:**
   ```bash
   npm run build
   ```

2. **Set production environment:**
   ```bash
   NODE_ENV=production
   PORT=5053
   # Add your production environment variables
   ```

3. **Start production server:**
   ```bash
   npm run start:prod
   ```

### Production Checklist

- [ ] Environment variables configured
- [ ] Authentication server running
- [ ] Database connected  
- [ ] Redis connected (for sessions)
- [ ] SSL certificates installed
- [ ] Domain routing configured
- [ ] Health checks passing (`http://your-domain/health`)

## 🔍 Troubleshooting

### Common Issues:

**"Agent not routing correctly"**
```bash
# Check routing with explicit headers
curl -H "X-FORCE-DEBUGGER: true" http://localhost:5053/api/test
```

**"Authentication failing"**
- Verify LogTo environment variables
- Check LogTo server is accessible
- Confirm M2M app is configured correctly

**"Development server not starting"**
```bash
# Clean and reinstall
rm -rf node_modules
npm install
```

**"Build failing"**
```bash
# Increase memory for builds
export NODE_OPTIONS='--max-old-space-size=4096'
npm run build
```

## Health Check

Once running, check server health at:

- `http://localhost:5000/health`

The health endpoint shows:

- Server mode
- Available functionality
- Version information

## Conditional Routing

The server automatically detects the mode and enables appropriate routes:

### Agent Mode Routes

- `/oauth/*` - OAuth authentication
- `/agent/*` - Agent execution
- `/debugger-proxy/*` - Debugger proxy

### Debugger Mode Routes

- `/models/*` - Model management with team access control
- All agent routes (debugger extends agent functionality)

### Embodiment Mode Routes

- `/static/*` - Static file serving
- `/swagger/*` - Swagger UI
- Various embodiment modules:
  - `/chatgpt/*`
  - `/openai/*`
  - `/alexa/*`
  - `/mcp/*`
  - And more...

## Mode Detection

The server uses several methods to detect the appropriate functionality:

1. **Environment Variable**: `SERVER_MODE` setting
2. **Header Detection**: `x-smyth-debug: true` for debugger mode
3. **Path Detection**: Certain paths automatically enable specific modes
4. **User Agent**: SmythOS-Agent user agent for agent mode

## Migration from Individual Servers

This Runtime Server replaces the need for running three separate servers:

- Port 5000 now handles all functionality
- Environment variables from all three servers are supported
- All routes and features are preserved

## Features by Mode

### Agent Runner Features

- OAuth authentication
- Agent execution and management
- File uploads and processing
- Rate limiting and usage tracking

### Debugger Features

- Model management with team access
- Component async context tracking
- Debug mode detection via headers
- Extended agent functionality

### Embodiment Features

- Session management with Redis
- Static file serving
- Multiple integration modules:
  - ChatGPT Plugin support
  - OpenAI API proxy
  - Alexa Skills integration
  - MCP (Model Context Protocol)
  - Postman collection generation
  - Swagger documentation
  - Form preview functionality
  - Agent chat interface

## 🚀 Smart Routing System

The Runtime Server features an intelligent routing system that automatically directs requests to the appropriate service (Agent Runner or Debugger) based on HTTP headers. This provides **predictable, header-based routing** that works consistently across all environments.

### 🎯 Quick Start

**Default Behavior (No Headers)**

```bash
curl http://localhost:5000/api/test
# → Routes to Agent Runner (production-safe default)
```

**Force Agent Runner**

```bash
curl -H "X-FORCE-AGENT-RUNNER: true" http://localhost:5000/api/test
# → Always routes to Agent Runner
```

**Force Debugger**

```bash
curl -H "X-FORCE-DEBUGGER: true" http://localhost:5000/api/test
# → Always routes to Debugger
```

**Debug Session**

```bash
curl -H "X-DEBUG-RUN: true" http://localhost:5000/api/test
# → Routes to Debugger for debugging
```

### 📋 Routing Priority (Highest to Lowest)

| Priority | Header                      | Routes To    | Use Case                  |
| -------- | --------------------------- | ------------ | ------------------------- |
| 1        | `X-FORCE-AGENT-RUNNER`      | Agent Runner | Force production behavior |
| 2        | `X-DEBUG-*`, `X-MONITOR-ID` | Debugger     | Debug sessions            |
| 3        | `X-FORCE-DEBUGGER`          | Debugger     | Force debug behavior      |
| 4        | Deployed versions           | Agent Runner | Production safety         |
| 5        | `X-ROUTING-MODE`            | As specified | Explicit routing          |
| 6        | No headers                  | Agent Runner | Safe default              |

### 🔧 Available Headers

#### Force Routing Headers

```bash
# Force Agent Runner (highest priority)
X-FORCE-AGENT-RUNNER: true

# Force Debugger
X-FORCE-DEBUGGER: true
```

#### Debug Session Headers

```bash
# Any of these will route to Debugger
X-DEBUG-RUN: true
X-DEBUG-STOP: true
X-DEBUG-READ: true
X-DEBUG-INJ: true
X-DEBUG-SKIP: true
X-MONITOR-ID: your-monitor-id
```

#### Explicit Mode Headers

```bash
# Explicit routing mode
X-ROUTING-MODE: debugger    # Routes to Debugger
X-ROUTING-MODE: agent-runner # Routes to Agent Runner
```

### 🧪 Testing Different Environments

#### Test Agent Runner from Localhost

```bash
# Without header (old behavior might route to debugger)
curl http://localhost:5000/api/test

# With header (guaranteed agent runner)
curl -H "X-FORCE-AGENT-RUNNER: true" http://localhost:5000/api/test
```

#### Test Debugger from Production

```bash
# Force debugger even on production domains
curl -H "X-FORCE-DEBUGGER: true" https://your-agent.com/api/test
```

#### Debug Sessions

```bash
# Start a debug session
curl -H "X-DEBUG-RUN: true" http://localhost:5000/api/test

# Monitor agent execution
curl -H "X-MONITOR-ID: session-123" http://localhost:5000/api/test
```

### 🛠️ For Developers

#### Example Scripts

We provide ready-to-use test scripts:

```bash
# Test routing logic programmatically
node examples/test-smart-routing.js

# Test routing with actual HTTP requests (server must be running)
./examples/test-routing-http.sh
```

#### Testing Routing Logic

```typescript
import { testRoutingDecision, RoutingHeaders } from "./core/smart-agent-router";

const agent = { agentVersion: "development" };

// Test different scenarios
const scenarios = [
  { headers: RoutingHeaders.FORCE_AGENT_RUNNER, expected: "agent-runner" },
  { headers: RoutingHeaders.DEBUG_RUN, expected: "debugger" },
  { headers: RoutingHeaders.NONE, expected: "agent-runner" },
];

scenarios.forEach(({ headers, expected }) => {
  const result = testRoutingDecision(agent, headers);
  console.log(`Headers: ${JSON.stringify(headers)}`);
  console.log(`Routes to: ${result.useDebugger ? "debugger" : "agent-runner"}`);
  console.log(`Reason: ${result.reason}\n`);
});
```

#### Available Test Headers

```typescript
import { RoutingHeaders } from "./core/smart-agent-router";

// Pre-defined header combinations
RoutingHeaders.FORCE_AGENT_RUNNER; // { "X-FORCE-AGENT-RUNNER": "true" }
RoutingHeaders.FORCE_DEBUGGER; // { "X-FORCE-DEBUGGER": "true" }
RoutingHeaders.DEBUG_RUN; // { "X-DEBUG-RUN": "true" }
RoutingHeaders.DEBUG_STOP; // { "X-DEBUG-STOP": "true" }
RoutingHeaders.MODE_DEBUGGER; // { "X-ROUTING-MODE": "debugger" }
RoutingHeaders.MODE_AGENT_RUNNER; // { "X-ROUTING-MODE": "agent-runner" }
RoutingHeaders.NONE; // {} (no headers)
```

### 🔍 Troubleshooting

#### Request Not Routing as Expected?

1. **Check your headers**: Use browser dev tools or `curl -v` to verify headers
2. **Check the logs**: The server logs routing decisions with reasons
3. **Test with explicit headers**: Use `X-FORCE-*` headers to override behavior

#### Common Issues

**Issue**: "Agent always routes to debugger from localhost"

```bash
# Solution: Use explicit header
curl -H "X-FORCE-AGENT-RUNNER: true" http://localhost:5000/api/test
```

**Issue**: "Can't debug from production domain"

```bash
# Solution: Use debug header
curl -H "X-FORCE-DEBUGGER: true" https://production.com/api/test
```

**Issue**: "Routing is inconsistent"

```bash
# Solution: Use explicit routing mode
curl -H "X-ROUTING-MODE: agent-runner" http://your-domain.com/api/test
```

### 📊 Monitoring

The server logs all routing decisions:

```
Routing decision: AGENT-RUNNER - X-FORCE-AGENT-RUNNER header present
Routing decision: DEBUGGER - Debug headers present
Routing decision: AGENT-RUNNER - Default production-safe routing
```

### 🎯 Best Practices

1. **Production**: No headers = safe default (Agent Runner)
2. **Development**: Use explicit headers for predictable behavior
3. **Testing**: Use `X-FORCE-*` headers to test specific services
4. **Debugging**: Use `X-DEBUG-*` headers for debug sessions
5. **CI/CD**: Use `X-ROUTING-MODE` for explicit test scenarios

### 🔄 Migration from Domain-Based Routing

If you were relying on domain-based routing:

**Old Way** (unreliable):

```bash
# Localhost = debugger, production = agent-runner (unpredictable)
curl http://localhost:5000/api/test
```

**New Way** (explicit):

```bash
# Explicit header-based routing (predictable)
curl -H "X-FORCE-AGENT-RUNNER: true" http://localhost:5000/api/test
curl -H "X-FORCE-DEBUGGER: true" http://production.com/api/test
```

---

## 📁 Examples Directory

The `examples/` directory contains helpful scripts for testing and understanding the Smart Routing system:

- **`test-smart-routing.js`** - Programmatic testing of routing logic
- **`test-routing-http.sh`** - HTTP request testing with curl
- Run these scripts to validate your routing configuration

## 🤝 Contributing

When contributing to the Smart Routing system:

1. **Test all scenarios** using the provided example scripts
2. **Update documentation** if adding new headers or routing logic
3. **Maintain backward compatibility** with existing debug headers
4. **Follow the priority system** when adding new routing rules

## 📄 License

This project is part of the SmythOS Runtime system.
