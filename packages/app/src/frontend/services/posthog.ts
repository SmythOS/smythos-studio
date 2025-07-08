// PostHogService.ts
import { isProdEnv } from '@src/shared/utils';
import posthog from 'posthog-js';

export class PostHog {
  private static isInitialized: boolean = false;

  // Initialize PostHog if not already initialized
  static initialize() {
    if (!this.isInitialized) {
      posthog.init('phc_lxgXwZRs6ySZqrHI4niOdYJlVXJAgMjTOhDau7f7VC3', {
        // @TODO: Saad - it may need to go to the .env file
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
      });
      this.isInitialized = true; // Set initialized flag
    }
  }

  // Capture an event using PostHog
  static track(eventName: string, properties: Record<string, any> = {}) {
    this.initialize(); // Ensure PostHog is initialized before capturing events

    posthog.capture(eventName, properties);
  }

  static getFeatureFlag(featureFlagName: string) {
    this.initialize(); // Ensure PostHog is initialized before capturing events
    if (isProdEnv()) {
      return posthog.getFeatureFlag(featureFlagName);
    } else {
      return posthog.getFeatureFlagPayload(featureFlagName) || false;
    }
  }
}
