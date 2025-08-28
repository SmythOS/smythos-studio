# SRE Runtime Server

A Runtime Server that combines the functionality of three separate SmythOS Runtime servers:

- **sre-agent-server** (Agent Runner)
- **sre-builder-debugger** (Debugger)
- **sre-embodiment-server** (Embodiment)

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

# Build and run in development mode
npm run dev

# Or build and run with CommonJS
npm run dev:cjs

# Build for production
npm run build:dev
```

## Available Scripts

- `npm run dev` - Build and run in ES module format
- `npm run dev:cjs` - Build and run in CommonJS format
- `npm run build:dev:es` - Build ES modules for development
- `npm run build:dev:cjs` - Build CommonJS for development
- `npm run start` - Start the built server
- `npm test` - Run tests

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
