# Observability System

This directory contains the plugin-based observability system for the SmythOS platform.

## Overview

The observability system provides a unified API for recording user behavior, system events, and performance metrics. It uses a plugin architecture to cleanly separate community and enterprise editions:

- **Community Edition**: Uses no-op implementations (disabled by default)
- **Enterprise Edition**: Injects PostHog-based implementations via plugins

## Architecture

### Files

- **`types.ts`**: Interface definitions for observability providers
- **`no-op-providers.ts`**: Default no-op implementations (zero overhead)
- **`index.ts`**: Main API that uses the plugin system

### Key Concepts

1. **Plugin-Based**: Uses the existing plugin system (`@react/shared/plugins/Plugins`)
2. **Disabled by Default**: Community edition has zero analytics overhead
3. **Type-Safe**: Full TypeScript interfaces for all providers
4. **Vendor-Agnostic**: Abstract interfaces allow any analytics backend

## Usage

### Import the API

```typescript
import { Observability } from '@src/shared/observability';
```

### Record User Interactions

```typescript
Observability.userBehavior.recordInteraction('button_clicked', {
  buttonId: 'submit',
  page: 'agent-settings',
});
```

### Record Feature Usage

```typescript
Observability.userBehavior.recordFeatureUsage('agent_deployment', {
  deploymentType: 'api',
  modelProvider: 'openai',
});
```

### Record Workflow Completions

```typescript
Observability.userBehavior.recordWorkflowCompletion('agent_creation', {
  duration: 120,
  success: true,
});
```

### Record System Events

```typescript
Observability.systemInsight.recordSystemEvent('deployment_completed', {
  agentId: 'agent-123',
  success: true,
});
```

### Record Errors

```typescript
Observability.systemInsight.recordError('api_call_failed', {
  endpoint: '/api/agents',
  errorMessage: error.message,
});
```

### Record Performance Metrics

```typescript
Observability.systemInsight.recordPerformanceMetric('page_load_time', 1234, {
  page: 'agents',
});
```

### User Identification

```typescript
Observability.userIdentity.identifyUser('user-123', {
  email: 'user@example.com',
  plan: 'enterprise',
});
```

## How It Works

1. **Plugin Registration** (Enterprise Only):
   - Enterprise edition registers a unified PostHog provider in `src/react/plugins.tsx`
   - Uses `PluginTarget.ObservabilityProvider` for all observability capabilities
   - Happens during app initialization

2. **Lazy Loading**:
   - Provider is lazy-loaded on first use
   - Falls back to no-op implementation if no plugin registered

3. **Zero Overhead**:
   - In community edition, all methods are empty functions
   - No performance impact when analytics are disabled

## Plugin Target

A single unified plugin target is used for provider registration:

- `ObservabilityProvider`: Provides complete observability functionality including user behavior tracking, system insights, user identity management, and feature flags

## Documentation

- **[Migration Guide](../../../../../docs/OBSERVABILITY_PLUGIN_SYSTEM.md)**: Complete guide for migrating from old Analytics API
- **[Examples](../../../../../docs/OBSERVABILITY_EXAMPLES.md)**: Practical examples for common scenarios
- **[Plugin System](../../react/shared/plugins/Plugins.ts)**: Core plugin infrastructure

## For Enterprise Edition

Enterprise implementations are in `src/shared/observability/` (not in community code).

See `src/shared/observability/posthog-providers.ts` for PostHog implementations.

## Advantages

### For Community Users

- No tracking or analytics by default
- Zero performance overhead
- Transparent and open source

### For Enterprise Users

- Full analytics capabilities
- Product usage insights
- Performance monitoring

### For Developers

- Single, consistent API
- Easy to test (mock providers)
- Type-safe with TypeScript
- Follows existing patterns

## Testing

In tests, you can easily mock observability:

```typescript
// Mock the plugin to return your test provider
jest.mock('@react/shared/plugins/Plugins', () => ({
  plugins: {
    getPluginsByTarget: () => [
      {
        type: 'config',
        config: mockObservabilityProvider,
      },
    ],
  },
}));
```

## Best Practices

1. **Be Specific**: Use descriptive event names
2. **Add Context**: Include relevant properties
3. **Handle Errors**: Observability should never break your app
4. **Respect Privacy**: Don't log sensitive data
5. **Test Locally**: Events work in dev with `isProd: false`

## Questions?

See the documentation linked above or reach out to the platform team.
