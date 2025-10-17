/**
 * Observability Service
 *
 * This module provides the main API for observability throughout the application.
 * It uses the plugin system to allow enterprise editions to inject their own
 * implementations while keeping the community edition free of analytics code.
 *
 * By default, all operations are no-ops (disabled). Enterprise editions can
 * enable observability by registering providers via the plugin system.
 *
 * @example
 * ```typescript
 * // In community code - works with or without enterprise plugin
 * import { Observability } from '@src/shared/observability';
 *
 * Observability.observeInteraction('button_clicked', { buttonId: 'submit' });
 * ```
 */

import { plugins, PluginTarget, PluginType } from '@react/shared/plugins/Plugins';
import { NoOpObservabilityProvider } from './no-op-providers';
import type { IObservabilityProvider, ObservabilityEventProperties } from './types';

/**
 * Lazy-loaded singleton for the unified observability provider
 */
let observabilityInstance: IObservabilityProvider | null = null;

/**
 * Gets the unified observability provider from plugins
 * Falls back to no-op implementation if no plugin is registered
 *
 * This function lazily retrieves the provider registered by enterprise editions
 * or returns a no-op implementation for community edition.
 */
function getObservabilityProvider(): IObservabilityProvider {
  if (observabilityInstance) {
    return observabilityInstance;
  }

  // Try to get provider from enterprise plugin
  const registeredPlugins = plugins.getPluginsByTarget(
    PluginTarget.ObservabilityProvider,
    PluginType.Config,
  );

  if (registeredPlugins.length > 0 && registeredPlugins[0].type === PluginType.Config) {
    const provider = registeredPlugins[0].config as IObservabilityProvider;
    observabilityInstance = provider;
    return provider;
  }

  // Fall back to no-op implementation (default for community edition)
  observabilityInstance = new NoOpObservabilityProvider();
  return observabilityInstance;
}

/**
 * Main Observability API
 *
 * Provides a unified interface for all observability operations.
 * Automatically uses plugin-registered implementations or falls back to no-ops.
 *
 * This is the primary export that should be used throughout the application.
 */
export const Observability = {
  /**
   * Observes and tracks any interaction, event, or behavior in the system
   *
   * This unified method handles all types of observability events including
   * user interactions, feature usage, workflow completions, system events,
   * and errors.
   *
   * @param eventName - Descriptive name of the event, interaction, or behavior
   * @param properties - Additional context about the event
   *
   * @example
   * ```typescript
   * Observability.observeInteraction('agent_created', { agentType: 'chatbot', source: 'template' });
   * Observability.observeInteraction('debug_button_click', { position: 'bottom center', type: 'run' });
   * Observability.observeInteraction('workflow_test_completed', { status: 'success', source: 'debugger' });
   * ```
   */
  observeInteraction: (eventName: string, properties?: Record<string, unknown>) => {
    getObservabilityProvider().observeInteraction(
      eventName,
      properties as ObservabilityEventProperties,
    );
  },

  /**
   * User identity context methods
   * Manages user identification and context correlation
   */
  userIdentity: {
    identifyUser: (userId: string, properties?: Record<string, unknown>) => {
      getObservabilityProvider().identifyUser({
        userId,
        properties: properties as ObservabilityEventProperties,
      });
    },
    setUserProperties: (properties: Record<string, unknown>) => {
      getObservabilityProvider().setUserProperties(properties as ObservabilityEventProperties);
    },
    clearUserIdentity: () => {
      getObservabilityProvider().clearUserIdentity();
    },
  },

  /**
   * Feature configuration methods
   * Manages feature flags and experimentation
   */
  features: {
    getFeatureFlag: (featureName: string) => {
      return getObservabilityProvider().getFeatureFlag(featureName);
    },
    isFeatureEnabled: (featureName: string) => {
      return getObservabilityProvider().isFeatureEnabled(featureName);
    },
    getFeatureFlagPayload: (featureName: string) => {
      return getObservabilityProvider().getFeatureFlagPayload(featureName);
    },
    reloadFeatureFlags: () => {
      getObservabilityProvider().reloadFeatureFlags();
    },
    onFeatureFlagsReady: (callback: () => void) => {
      getObservabilityProvider().onFeatureFlagsReady(callback);
    },
  },
};

// Re-export types for convenience
export type {
  IObservabilityProvider,
  ObservabilityEventProperties,
  UserIdentityContext,
} from './types';

// Export the observability instance getter for advanced usage
export { getObservabilityProvider as getObservabilityInstance };
