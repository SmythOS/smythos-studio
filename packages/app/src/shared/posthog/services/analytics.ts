import { PostHog } from '@src/shared/posthog';
import { isProdEnv } from '@src/shared/utils';

export const Analytics = {
  track: (eventName: string, properties: Record<string, any> = {}) => {
    try {
      // so any error doesn't break the app
      const enhancedProperties = { ...properties };
      
      // Add isProd if not already present to differentiate between prod and dev events
      if (!('isProd' in enhancedProperties)) {
        enhancedProperties.isProd = isProdEnv();
      }
      
      PostHog.track(eventName, enhancedProperties);
      
    } catch (error) {
      console.info('Error tracking event', error);
    }
  },
};
