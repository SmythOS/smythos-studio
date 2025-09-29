# SmythOS UI - The Visual Agent Builder

[![Homepage](https://img.shields.io/badge/_Homepage-SmythOS-green?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJHSURBVHgBfVNNqBJRFL7jT1IYCeUqcRG+AsGVFLhIJIIHLVq93MRsSgpTWgRudaELBRctBDeB2qpdohsVdSOKok+eBC4UAiNSKX9440PtzYydM9yJqV4eOPfOvff8fd85Q8jFosElHo8fJhIJN71TgTJkj+CjWj6sVqu2KIo7VBCuUCg8VNj9E0iLSyQSuQmOx7VaLS4IAjqKsJ/jx3K5PKlUKg88Ho/p74ok58lkkkXDTCbziuO4rz9BMDvP898Ain04HL7fUVksFp+SyeS93+mn02kODKXHer3OYmbQTalUeoLveI8VbTabNQ36o1wuH0nOdrtdiw4iBTsYDALtdjuhwCsR2mw22e12e1YsFo/+gGC1WvW0MilALpd7Tg3UCo4kY4vFooOEV5SEq/r9/gqSD8GXASVQ6mXqJCgCiIjE7/e7Op3OWa/Xe03fNRhZo1arb7darRcMwxCDwXCN/EeAAw53m832FpJ+xyCIj8dKHA7HOygv7XQ6ryogCAoI4nq9FiViGKl7N7xer03uJe47t9t9KxwO97vdrlyiigYSG43GS7PZfJcG3OGi0+lOpVM0GrVB74+RRGB6Kw+Rz+e7HovF7sDVBC+CwSC2GNsogH4mcou0Wq0KymP0ej25BDKfz09SqdSzUCj00Wg03gfjc8xqMplwJ3D+wrLsgewvYySBQOAAhufxaDT6QIcHp0sEB348Hldms1k5m80eUh8NuUAkdqrV6iP8gRAKHbBTl8ulUfC196+UiSPpdPppPp9/sy/jL4yPfDIO4aFTAAAAAElFTkSuQmCC&logoWidth=14)](https://smythos.com)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/smythos)
[![](https://img.shields.io/badge/📄_Code_License-MIT-green)](LICENSE)

The complete visual interface for building, deploying, and managing intelligent AI agents. SmythOS UI provides an intuitive drag-and-drop workspace where you can create sophisticated agent workflows without writing code, while still offering the flexibility of custom integrations when needed.

[🚀 Getting Started](#quick-start) | [📖 Documentation](#documentation) | [🐳 Docker Setup](#docker-quick-start) | [🤝 Contributing](CONTRIBUTING.md)

## Why SmythOS UI exists

1. **Visual Agent Building**: Creating AI agents should be as intuitive as drawing a flowchart.
2. **No-Code to Pro-Code**: Start with visual building, extend with custom code when needed.
3. **Open Architecture**: Build once, deploy anywhere with complete control over your infrastructure.

## Design Principles

SmythOS UI provides a **complete visual development environment** for AI agents. Just as modern IDEs make software development accessible, SmythOS UI makes AI agent development intuitive and powerful.

### Visual-First Development

SmythOS UI offers a **drag-and-drop interface** for building complex agent workflows. Whether you're connecting LLMs, integrating APIs, processing data, or orchestrating multi-step workflows, everything is visual and intuitive.

This approach makes AI agent development **accessible to everyone** - from business analysts who understand the processes to developers who need to scale them to production.

**Key Benefits:**

- **Intuitive Visual Builder**: Drag-and-drop components to build complex agent workflows
- **Real-Time Testing**: Test your agents instantly as you build them
- **Production Deployment**: One-click deployment from development to production
- **Extensible Architecture**: Add custom components and integrations
- **Collaborative Development**: Share and collaborate on agent projects with your team

## Quick Start

### Method 1: Docker Quick Start

Get up and running instantly with Docker Compose.

```bash
git clone https://github.com/SmythOS/smythos-studio.git
cd smythos-studio
cp .env.compose.example .env
docker compose up -d

```

**Access your application:** http://localhost:5050

🐳 **Full Docker Setup**: See our [Docker Compose Guide](DOCKER_COMPOSE.md) for production-ready multi-container deployment with automatic SSL, database, and caching.

---


### Method 2: Local Development Setup

Perfect for development, customization, and contributing to the project.

```bash
# Clone the repository
git clone https://github.com/SmythOS/smythos-studio.git
cd smythos-studio

# Copy environment configuration
cp .env.example .env
# Edit .env with your database credentials

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

**Next Steps:**
1. Configure your MySQL database in `.env`
2. Set up required subdomains for embodiments
3. Start building your first agent!

📖 **Detailed Setup**: See our [Contributing Guide](CONTRIBUTING.md) for complete development setup instructions.



Get up and running instantly with a single Docker command.

```bash
# Copy environment configuration
cp .env.example .env
# REQUIRED: Edit .env with your database credentials

# Build and run with Docker
docker build -t smythos-studio .
docker run -d \
  --name smythos-studio \
  -p 5050:5050 \
  -p 5053:5053 \
  --env-file .env \
  -v smythos_data:/home/node/smythos-data \
  smythos-studio:latest
```

**Access your application:** http://localhost:5050

🐳 **Full Docker Setup**: See our [Docker Compose Guide](DOCKER_COMPOSE.md) for deploying the app with automatic SSL, database, and caching.

---

## Repository Structure

This monorepo contains the complete SmythOS UI platform:

### 📱 App Package - `packages/app`

The main application containing the visual builder, React frontend, and backend services.

**Key Features:**
- **Visual Agent Builder**: Drag-and-drop interface for creating agent workflows
- **React Frontend**: Modern, responsive user interface
- **Backend API**: RESTful services for agent management and execution
- **Real-Time Testing**: Instant agent testing and debugging

### 🔧 Middleware Package - `packages/middleware`

Core API services and database management for the SmythOS UI platform.

**Features:**
- **Database Management**: Prisma-based ORM with MySQL support
- **API Layer**: Centralized business logic and data access

### ⚡ Runtime Package - `packages/runtime`

The execution server that uses (SRE Core Engine)[https://github.com/SmythOS/sre/tree/main] to execute the agents.

**Features:**
- **Agent Execution**: High-performance runtime for agent workflows
- **Debugging Tools**: Real-time debugging and monitoring
- **Scalable Architecture**: Handles multiple concurrent agent executions
- **Embodiment Support**: Deploy agents as chatbots, APIs, and integrations


## Architecture Highlights

### Multi-Environment Deployment

Your agents work seamlessly across environments:

- **Development**: Visual builder with hot-reload and debugging
- **Staging**: Full production simulation with monitoring
- **Production**: Scalable deployment with enterprise security


## Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - Set up your development environment and contribute to the project
- **[Docker Compose Setup](DOCKER_COMPOSE.md)** - Production-ready deployment with multi-container architecture
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community guidelines and standards

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help makes SmythOS UI better for everyone.

**Ways to Contribute:**
- 🐛 Report bugs and issues
- 💡 Suggest new features and improvements
- 🔧 Submit pull requests with fixes and enhancements
- 📖 Improve documentation and examples
- 🎨 Design UI/UX improvements

**Get Started:**
1. Read our [Contributing Guide](CONTRIBUTING.md)
2. Check out [open issues](https://github.com/SmythOS/smythos-studio/issues)
3. Join our [Discord community](https://discord.gg/smythos)

## Contributors

<a href="https://github.com/SmythOS/smythos-ui/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=SmythOS/smythos-studio" />
</a>

## Community & Support

- **💬 Discord**: [Join our community](https://discord.gg/smythos) for real-time support and discussions
- **🐛 Issues**: [Report bugs](https://github.com/SmythOS/smythos-studio/issues) and request features
- **📧 Email**: Contact us at support@smythos.com for enterprise inquiries
- **🌐 Website**: Visit [SmythOS.com](https://smythos.com) for more information

## License

This project is licensed under the [MIT License](LICENSE).


**Ready to build your first AI agent?** 

🚀 [Get Started Now](#quick-start) | 💬 [Join our Discord](https://discord.gg/smythos) | 🌟 [Star this repo](https://github.com/SmythOS/smythos-studio)

---

**/smɪθ oʊ ɛs juː aɪ/**

*Build visually. Deploy globally. Scale infinitely.*
