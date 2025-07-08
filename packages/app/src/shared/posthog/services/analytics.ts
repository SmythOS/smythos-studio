import { PostHog } from '@src/shared/posthog';

export const Analytics = {
  track: (eventName: string, properties: {} = {}) => {
    try {
      // so any error doesn't break the app
      PostHog.track(eventName, properties);
    } catch (error) {
      console.info('Error tracking event', error);
    }
  },
};
