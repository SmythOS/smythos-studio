/**
 * Observability Type Definitions
 *
 * This module defines abstract interfaces for system observability and user behavior monitoring.
 * These interfaces are designed to be implemented by enterprise editions to enable analytics
 * while keeping the community edition free of direct analytics dependencies.
 *
 * The default implementations in community edition are no-ops (disabled by default).
 * Enterprise editions inject concrete implementations via the plugin system.
 */

/**
 * Properties that can be attached to user behavior events
 */
export type ObservabilityEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * User identity information for context correlation
 */
export interface UserIdentityContext {
  /** Unique user identifier */
  userId: string;

  /** Additional user properties for context enrichment */
  properties?: ObservabilityEventProperties;
}

/**
 * Unified Observability Provider Interface
 *
 * This interface provides complete observability capabilities:
 * - User behavior tracking (interactions, feature usage, workflows)
 * - System insights (events, errors)
 * - User identity management (identification, context correlation)
 * - Feature configuration (flags, A/B testing, rollouts)
 *
 * Enterprise editions implement this interface to provide complete observability.
 * Community edition uses a no-op implementation by default.
 */
export interface IObservabilityProvider {
  // Unified Event Tracking
  /**
   * Observes and tracks any interaction, event, or behavior in the system
   *
   * This unified method handles all types of observability events including:
   * - User interactions (button clicks, form submissions, etc.)
   * - Feature usage
   * - Workflow completions
   * - System events
   * - Errors and exceptions
   *
   * @param eventName - Descriptive name of the event, interaction, or behavior
   * @param properties - Additional context about the event
   *
   * @example
   * ```typescript
   * observeInteraction('agent_created', { agentType: 'chatbot', source: 'template' });
   * observeInteraction('debug_button_click', { position: 'bottom center', type: 'run' });
   * observeInteraction('workflow_test_completed', { status: 'success', source: 'debugger' });
   * observeInteraction('deployment_error', { errorType: 'timeout', duration: 30000 });
   * ```
   */
  observeInteraction(eventName: string, properties?: ObservabilityEventProperties): void;

  // User Identity Management
  /**
   * Associates a user identity with subsequent observability events
   *
   * @param context - User identity information
   *
   * @example
   * ```typescript
   * identifyUser({ userId: 'user-123', properties: { email: 'user@example.com' } });
   * ```
   */
  identifyUser(context: UserIdentityContext): void;

  /**
   * Updates user properties without changing the user identity
   *
   * @param properties - Properties to set or update
   */
  setUserProperties(properties: ObservabilityEventProperties): void;

  /**
   * Clears the current user identity context
   */
  clearUserIdentity(): void;

  // Feature Configuration
  /**
   * Retrieves the value of a feature flag
   *
   * @param featureName - Name of the feature flag
   * @returns The feature flag value (string, boolean, or undefined if not set)
   *
   * @example
   * ```typescript
   * const variant = getFeatureFlag('new-ui-design');
   * if (variant === 'variant_1') {
   *   // Show new UI
   * }
   * ```
   */
  getFeatureFlag(featureName: string): string | boolean | undefined;

  /**
   * Checks if a feature is enabled
   *
   * @param featureName - Name of the feature
   * @returns True if the feature is enabled, false otherwise
   */
  isFeatureEnabled(featureName: string): boolean;

  /**
   * Retrieves the feature flag payload (additional metadata)
   * Can return any type (string, object, boolean, array, etc.) depending on PostHog configuration
   *
   * @param featureName - Name of the feature flag
   * @returns The feature flag payload (any type) or undefined if not set
   *
   * @example
   * ```typescript
   * const payload = getFeatureFlagPayload('rollout-config');
   * // Type assertion based on your specific flag configuration
   * if ((payload as { percentage?: number })?.percentage > 50) {
   *   // Feature is rolled out to more than 50%
   * }
   * ```
   */
  getFeatureFlagPayload(featureName: string): unknown;

  /**
   * Reloads feature flags from the server
   */
  reloadFeatureFlags(): void;

  /**
   * Registers a callback to be executed when feature flags are fully loaded
   * In community edition (no-op), the callback is executed immediately
   *
   * @param callback - Function to call when flags are ready
   *
   * @example
   * ```typescript
   * Observability.features.onFeatureFlagsReady(() => {
   *   const payload = Observability.features.getFeatureFlagPayload('my-flag');
   *   console.log('Flag loaded:', payload);
   * });
   * ```
   */
  onFeatureFlagsReady(callback: () => void): void;
}
