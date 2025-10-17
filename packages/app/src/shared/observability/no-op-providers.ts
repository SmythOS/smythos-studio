/**
 * No-Op Observability Providers
 *
 * This is the default implementation used in community edition.
 * It implements the observability interface but performs no actual operations,
 * ensuring zero overhead when analytics are not needed.
 *
 * Enterprise editions can override this by registering their own implementation
 * via the plugin system.
 */

import type {
  IObservabilityProvider,
  ObservabilityEventProperties,
  UserIdentityContext,
} from './types';

/**
 * Unified No-Op Observability Provider
 *
 * This is the default implementation for community edition.
 * It provides complete observability interface but performs no actual operations,
 * ensuring zero overhead when analytics are not needed.
 *
 * All methods are no-ops that do nothing or return safe defaults.
 */
export class NoOpObservabilityProvider implements IObservabilityProvider {
  // Unified Event Tracking
  /**
   * No-op implementation of observeInteraction
   * Does nothing, ensuring zero overhead
   */
  observeInteraction(_eventName: string, _properties?: ObservabilityEventProperties): void {
    // No operation - disabled by default
  }

  // User Identity Context
  identifyUser(_context: UserIdentityContext): void {
    // No operation - disabled by default
  }

  setUserProperties(_properties: ObservabilityEventProperties): void {
    // No operation - disabled by default
  }

  clearUserIdentity(): void {
    // No operation - disabled by default
  }

  // Feature Configuration
  getFeatureFlag(_featureName: string): string | boolean | undefined {
    return undefined;
  }

  isFeatureEnabled(_featureName: string): boolean {
    return false;
  }

  getFeatureFlagPayload(_featureName: string): unknown {
    return undefined;
  }

  reloadFeatureFlags(): void {
    // No operation - disabled by default
  }

  onFeatureFlagsReady(callback: () => void): void {
    // Execute immediately in no-op mode (no flags to load)
    callback();
  }
}
