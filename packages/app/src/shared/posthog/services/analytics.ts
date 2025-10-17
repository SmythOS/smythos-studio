/**
 * @deprecated Use Observability API instead
 * This service is kept for backward compatibility but forwards all calls to the new Observability API
 *
 * Migration:
 * - Replace Analytics.track() with Observability.observeInteraction()
 */

import { Observability } from '@src/shared/observability';
import { isProdEnv } from '@src/shared/utils';

export const Analytics = {
  /**
   * @deprecated Use Observability.observeInteraction() instead
   */
  track: (eventName: string, properties: Record<string, unknown> = {}) => {
    try {
      // Forward to Observability API
      const enhancedProperties = { ...properties };

      // Add isProd if not already present to differentiate between prod and dev events
      if (!('isProd' in enhancedProperties)) {
        enhancedProperties.isProd = isProdEnv();
      }

      // Forward to new Observability API
      Observability.observeInteraction(eventName, enhancedProperties);
    } catch (error) {
      console.info('Error tracking event', error);
    }
  },
};
