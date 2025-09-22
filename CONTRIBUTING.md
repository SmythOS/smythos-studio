# Contributing to SmythOS UI

Welcome! We're excited that you want to contribute to SmythOS UI, the comprehensive platform for building and deploying AI agents.

## Contents

- [Contributing to SmythOS UI](#contributing-to-smythos-ui)
	- [Contents](#contents)
	- [Code of Conduct](#code-of-conduct)
	- [Repository Structure](#repository-structure)
	- [Development Setup](#development-setup)
		- [Prerequisites](#prerequisites)
			- [Node.js](#nodejs)
			- [pnpm](#pnpm)
				- [pnpm workspaces](#pnpm-workspaces)
			- [corepack](#corepack)
		- [Setting Up SmythOS UI](#setting-up-smythos-ui)
		- [Starting the Application](#starting-the-application)
	- [Development Workflow](#development-workflow)
		- [Basic Development Process](#basic-development-process)
		- [Package-Specific Development](#package-specific-development)
			- [Targeted Development](#targeted-development)
		- [Performance Considerations](#performance-considerations)
		- [Community Contribution Guidelines](#community-contribution-guidelines)
			- [**1. Response Timeline**](#1-response-timeline)
			- [**2. Code Quality Standards**](#2-code-quality-standards)
			- [**3. Pull Request Requirements**](#3-pull-request-requirements)
			- [**4. Review Process for Non-Compliant PRs**](#4-review-process-for-non-compliant-prs)
	- [Contributor License Agreement](#contributor-license-agreement)

## Code of Conduct

This project and all participants are governed by our Code of Conduct. By participating, you agree to uphold professional standards and create a welcoming environment for all contributors. Please report any unacceptable behavior to the maintainers.

## Repository Structure

SmythOS UI is organized as a monorepo with multiple packages, each serving specific functions:

The key directories and packages:

- [/packages](/packages) - All SmythOS UI modules
- [/packages/app](/packages/app) - Main application containing the Agent builder workspace, React frontend, and backend services
- [/packages/app/src/builder-ui](/packages/app/src/builder-ui) - Workflow builder interface for building agents
- [/packages/app/src/react](/packages/app/src/react) - React-based user interface components and features
- [/packages/app/src/backend](/packages/app/src/backend) - UI Backend API services and routes
- [/packages/middleware](/packages/middleware) - Core api for facilitating database / low-level operations
- [/packages/runtime](/packages/runtime) - Runtime server for agent execution and debugging

## Development Setup

To contribute to SmythOS UI, you'll need to set up the development environment with all required dependencies and proper package linking.

### Prerequisites

#### Node.js

[Node.js](https://nodejs.org/en/) version 20.x or newer is required for development.

#### pnpm

[pnpm](https://pnpm.io/) version 10.2 or newer is required for package management. We strongly recommend installing it with [corepack](#corepack).

##### pnpm workspaces

SmythOS UI uses [pnpm workspaces](https://pnpm.io/workspaces) to manage the monorepo structure. This automatically creates file-links between interdependent packages and ensures consistent dependency management across all modules.

#### corepack

Enable [Node.js corepack](https://nodejs.org/docs/latest-v16.x/api/corepack.html) with `corepack enable`.

Install the correct pnpm version using `corepack prepare --activate`.

**IMPORTANT**: If you installed Node.js via homebrew, run `brew install corepack`, as homebrew excludes `npm` and `corepack` from [the `node` formula](https://github.com/Homebrew/homebrew-core/blob/master/Formula/node.rb#L66).

**IMPORTANT**: On Windows, run `corepack enable` and `corepack prepare --activate` in an administrator terminal.

### Setting Up SmythOS UI

> **IMPORTANT**: Execute all steps below at least once to establish the development environment!

1. [Fork](https://guides.github.com/activities/forking/#fork) the SmythOS UI repository.

2. Clone your forked repository:
   ```bash
   git clone https://github.com/<your_github_username>/smythos-ui.git
   ```

3. Navigate to the repository:
   ```bash
   cd smythos-ui
   ```

4. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/SmythOS/smythos-ui.git
   ```

5. **Set up MySQL Database** (Required):
   
   SmythOS UI requires a MySQL database. Choose one of the options below:
   
   **Option 1: Quick Docker Setup (Recommended)**
   ```bash
   docker run --name smythos-mysql-local \
     -e MYSQL_ROOT_PASSWORD=smythos_root_pass \
     -e MYSQL_DATABASE=smythos_db \
     -p 3306:3306 \
     -d mysql
   ```
   
   **Option 2: Use your existing MySQL instance**
   
   Ensure you have MySQL 8.0+ running and create a database for SmythOS UI.

6. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   
   **⚠️ IMPORTANT**: If you have your own MySQL instance, open the `.env` file and update the DB connection keys:
   
   ```env
   DATABASE_HOST=localhost
   DATABASE_USER=root
   DATABASE_PASSWORD=smythos_root_pass
   DATABASE_NAME=smythos_db
   ```
   
   > 💡 **Note**: These keys are essential for database migrations and application startup. Make sure it matches your MySQL setup exactly.

7. Install all dependencies and link packages:
   ```bash
   pnpm install
   ```

8. Build all packages:
   ```bash
   pnpm build
   ```

### Starting the Application

To start SmythOS UI in development mode:

```bash
pnpm dev
```

To start in production mode:

```bash
pnpm start
```

## Development Workflow

### Basic Development Process

1. Start SmythOS UI in development mode:
   ```bash
   pnpm dev
   ```
2. Make your changes
3. Verify functionality in production mode:
   ```bash
   pnpm build
   pnpm start
   ```
4. Write and run tests
6. Commit your changes and [create a pull request](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)



#### Targeted Development

For highly focused development, run specific packages individually:

**Example 1: Working on React components**
```bash
# Terminal 1: Start Middleware
cd packages/middleware
pnpm dev

# Terminal 2: Run Runtime
cd packages/runtime
pnpm dev

# Terminal 3: Run UI server
cd packages/app
pnpm dev
```

**Example 2: Middleware development**
```bash
# Terminal 1: Watch middleware package (migrations run automatically)
cd packages/middleware
pnpm dev

# Terminal 2: Run dependent services
cd packages/app
pnpm dev
```

**Example 3: Runtime development**
```bash
# Terminal 1: Run runtime package
cd packages/runtime
pnpm dev
```

### Performance Considerations

Full development mode (`pnpm dev`) runs multiple concurrent processes:

1. **TypeScript compilation** for each package
3. **Nodemon** restarting backend services
4. **Vite dev server** for React with Hot Module Replacement
5. **Multiple build processes** for various packages

**Resource impact:**
- High CPU and memory consumption
- File system watching overhead, particularly on:
  - Network-attached storage
  - Virtual machines with shared folders
  - Systems with slow I/O performance
- Resource usage scales with active packages

**Optimization recommendations:**
1. Use targeted development commands based on your work
2. Close unnecessary applications to free resources
3. Monitor system performance and adjust workflow accordingly

---

### Community Contribution Guidelines

#### **1. Response Timeline**

Contributors should address feedback or requested changes within 14 days. Pull requests without response or updates will be automatically closed but can be reopened once changes are applied.

#### **2. Code Quality Standards**

- **Follow Style Guidelines:**
  - Adhere to SmythOS UI coding standards and formatting conventions
  - Use provided linting tools and configurations
- **TypeScript Compliance:**
  - Ensure full TypeScript compatibility
- **Code Reusability:**
  - Reuse existing components, utilities, and patterns
  - Avoid duplicating functionality across packages
  - Maintain consistency in parameter and component definitions

#### **3. Pull Request Requirements**

- **Focused Scope:**
  - Limit PRs to single features or fixes
- **Clear Naming:**
  - Follow descriptive PR title conventions
- **New Features:**
  - Major new features should be discussed with maintainers before implementation
  - Ensure alignment with SmythOS UI roadmap and architecture
- **Documentation:**
  - Update relevant documentation for new features
  - Include inline code comments for complex logic

#### **4. Review Process for Non-Compliant PRs**

- **Large/Unfocused PRs:** Will be returned for segmentation into smaller, focused changes
- **Architectural Concerns:** PRs that don't align with project architecture will require discussion and potential redesign


## Contributor License Agreement

To ensure clear intellectual property rights and enable smooth collaboration, contributors must sign our Contributor License Agreement. This process is automated - when you submit your first pull request, a bot will provide instructions for signing the agreement.

The agreement uses plain English and is designed to protect both contributors and the project while enabling open-source collaboration.

---

Thank you for contributing to SmythOS UI! Your contributions help make AI agent development more accessible and powerful for everyone.
