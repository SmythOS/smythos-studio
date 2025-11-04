# GitHub Issue & PR Content

## Issue

### Title
Docker container runs as AMD64 on Apple Silicon (emulated)

### Description

#### Problem

When running `docker compose up -d` on Apple Silicon (ARM64) Macs, the SmythOS application container runs as AMD64 architecture, requiring emulation through Rosetta. This causes:

- Slower performance due to emulation overhead
- Higher CPU usage
- "AMD64" label visible in Docker Desktop UI instead of "ARM64"

#### Current Behavior

The `docker-compose.yml` file references a pre-built image `smythos/smythos-studio:alpha` which is only available as AMD64. Docker automatically emulates this on Apple Silicon.

#### Expected Behavior

Users on Apple Silicon should have the option to build the container natively for ARM64 to get optimal performance without emulation.

#### Environment

- **Platform**: Apple Silicon (M1/M2/M3)
- **Docker Desktop**: Latest
- **OS**: macOS

#### Proposed Solution

Add Docker Compose profiles to support both:
- Default: Pre-built AMD64 image (works everywhere, emulated on Apple Silicon)
- Native: Local build for native architecture (ARM64 on Apple Silicon)

---

## Pull Request

### Title
Add native ARM64 Docker build support via profiles

### Description

#### Changes

Adds Docker Compose profile support for native ARM64 builds on Apple Silicon.

#### Implementation

- Added `default` profile for existing `smythos` service (uses pre-built AMD64 image)
- Added `native` profile for new `smythos-native` service (builds locally for native architecture)
- Updated `README.md` with native build instructions
- Updated `DOCKER_COMPOSE.md` with native build instructions and troubleshooting

#### Usage

**Default (AMD64, emulated on Apple Silicon):**
```bash
docker compose up -d
```

**Native ARM64 build (Apple Silicon):**
```bash
docker compose --profile native up -d
```

#### Benefits

- Zero breaking changes - default behavior unchanged
- Optional native builds for Apple Silicon users
- Better performance on ARM64 (no emulation overhead)
- Clearer documentation for architecture-specific issues

Fixes #[issue-number]
