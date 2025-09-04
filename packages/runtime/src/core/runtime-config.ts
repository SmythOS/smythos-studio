import config from './config';
/**
 * Runtime Configuration System
 * Designed for future server extraction without code changes
 */

export interface RuntimeConfig {
  // Server identity - determines which services this instance provides
  serverType: 'combined' | 'debugger' | 'agent-runner' | 'embodiment';

  // Service enablement flags
  services: {
    debugger: {
      enabled: boolean;
      standalone?: boolean; // When true, only debugger routes are active
    };
    agentRunner: {
      enabled: boolean;
      standalone?: boolean; // When true, only agent-runner routes are active
    };
    embodiment: {
      enabled: boolean;
      standalone?: boolean; // When true, only embodiment routes are active
    };
  };

  // Routing strategy when multiple services are enabled
  routing: {
    strategy: 'smart' | 'separate' | 'legacy';
    // Smart: Intelligent routing based on request characteristics
    // Separate: Mount separate routers (current approach)
    // Legacy: Use original individual routers
  };

  // Server-specific configurations
  server: {
    port: number;
    name: string;
    healthCheck: boolean;
    metrics: boolean;
  };

  // Feature flags for gradual rollout
  features: {
    smartRouting: boolean;
    requestTracing: boolean;
    circuitBreaker: boolean;
    rateLimiting: boolean;
  };
}

/**
 * Predefined configurations for different deployment scenarios
 */
const RuntimeConfigs = {
  // Combined server (current default)
  combined: (): RuntimeConfig => ({
    serverType: 'combined',
    services: {
      debugger: { enabled: true, standalone: false },
      agentRunner: { enabled: true, standalone: false },
      embodiment: { enabled: true, standalone: false },
    },
    routing: { strategy: 'smart' },
    server: {
      port: 5000,
      name: 'smythos-runtime-combined',
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: true,
      requestTracing: true,
      circuitBreaker: true,
      rateLimiting: true,
    },
  }),

  // Debugger-only server (for extraction)
  debugger: (): RuntimeConfig => ({
    serverType: 'debugger',
    services: {
      debugger: { enabled: true, standalone: true },
      agentRunner: { enabled: false, standalone: false },
      embodiment: { enabled: false, standalone: false },
    },
    routing: { strategy: 'separate' },
    server: {
      port: 5001,
      name: 'smythos-debugger-server',
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: false,
      requestTracing: true,
      circuitBreaker: false,
      rateLimiting: false,
    },
  }),

  // Agent-runner-only server (for extraction)
  agentRunner: (): RuntimeConfig => ({
    serverType: 'agent-runner',
    services: {
      debugger: { enabled: false, standalone: false },
      agentRunner: { enabled: true, standalone: true },
      embodiment: { enabled: false, standalone: false },
    },
    routing: { strategy: 'separate' },
    server: {
      port: 5002,
      name: 'smythos-agent-runner-server',
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: false,
      requestTracing: true,
      circuitBreaker: true,
      rateLimiting: true,
    },
  }),

  // Embodiment-only server (for extraction)
  embodiment: (): RuntimeConfig => ({
    serverType: 'embodiment',
    services: {
      debugger: { enabled: false, standalone: false },
      agentRunner: { enabled: false, standalone: false },
      embodiment: { enabled: true, standalone: true },
    },
    routing: { strategy: 'separate' },
    server: {
      port: 5003,
      name: 'smythos-embodiment-server',
      healthCheck: true,
      metrics: true,
    },
    features: {
      smartRouting: false,
      requestTracing: true,
      circuitBreaker: false,
      rateLimiting: false,
    },
  }),
};

/**
 * Load configuration from environment or config file
 * This will be used by the extraction script
 */
export function loadRuntimeConfig(): RuntimeConfig {
  const configType = config.env.SMYTHOS_SERVER_TYPE;

  switch (configType) {
    case 'debugger':
      return RuntimeConfigs.debugger();
    case 'agent-runner':
      return RuntimeConfigs.agentRunner();
    case 'embodiment':
      return RuntimeConfigs.embodiment();
    case 'combined':
    default:
      return RuntimeConfigs.combined();
  }
}

/**
 * Validate configuration
 */
export function validateRuntimeConfig(config: RuntimeConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // At least one service must be enabled
  const enabledServices = Object.values(config.services).filter(service => service.enabled);
  if (enabledServices.length === 0) {
    errors.push('At least one service must be enabled');
  }

  // Standalone services should be the only enabled service
  const standaloneServices = Object.entries(config.services)
    .filter(([_, service]) => service.standalone)
    .map(([name, _]) => name);

  if (standaloneServices.length > 1) {
    errors.push(`Multiple standalone services not allowed: ${standaloneServices.join(', ')}`);
  }

  if (standaloneServices.length === 1) {
    const otherEnabledServices = Object.entries(config.services)
      .filter(([name, service]) => service.enabled && !service.standalone)
      .map(([name, _]) => name);

    if (otherEnabledServices.length > 0) {
      errors.push(`Standalone service cannot coexist with other services: ${otherEnabledServices.join(', ')}`);
    }
  }

  // Smart routing requires multiple services
  if (config.routing.strategy === 'smart' && enabledServices.length < 2) {
    errors.push('Smart routing requires multiple enabled services');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
