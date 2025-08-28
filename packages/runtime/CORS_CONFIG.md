# Minimal CORS Configuration

Simple CORS setup - allows all origins in development, configurable for production.

## Configuration

**Development**: All origins allowed automatically
**Production**: Set `CORS_ORIGINS` environment variable

```bash
# Production only - comma-separated allowed origins
CORS_ORIGINS=https://yourdomain.com,https://anotherdomain.com
```

## Behavior

- **Development**: `origin: true` (allows all)
- **Production**: Uses `CORS_ORIGINS` or blocks all if not set
- **Credentials**: Always enabled
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization