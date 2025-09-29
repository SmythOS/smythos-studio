import config from '@src/builder-ui/config';
import posthog, { Properties } from 'posthog-js';

const POSTHOG_CLIENT_KEY = 'phc_lxgXwZRs6ySZqrHI4niOdYJlVXJAgMjTOhDau7f7VC3';

let initialized = false;

const lazyInit = () => {
  if (!initialized) {
    // can't disable posthog in dev because feature flags depend on it
    posthog?.init(POSTHOG_CLIENT_KEY, {
      autocapture: !config.env.IS_DEV,
      capture_pageview: !config.env.IS_DEV,
      // debug: config.env.IS_DEV,
      person_profiles: 'identified_only',
      api_host: 'https://us.i.posthog.com',

      session_recording: {
        maskAllInputs: true,
        maskInputFn: (text, element) => {
          if (element?.dataset.phMask === 'true') {
            return '*'.repeat(text.length); // Mask text if data-ph-mask is true
          }
          return text; // Don't mask other inputs
        },
      },
    });
    initialized = true;
  }
};

export const PostHog = {
  initialize: () => {
    if (document.readyState === 'complete') {
      lazyInit();
    } else {
      window.addEventListener('load', lazyInit);
    }
  },

  // Check if PostHog is fully loaded using the built-in __loaded property
  isLoaded: () => {
    return initialized && posthog?.__loaded;
  },

  identify: (userId, properties = {}) => {
    if (!initialized) lazyInit();
    posthog?.identify(userId, properties);
  },

  track: (eventName: string, properties: Properties) => {
    if (!initialized) lazyInit();
    posthog?.capture(eventName, properties);
  },

  setUserProperties: (properties) => {
    if (!initialized) lazyInit();
    posthog?.people.set(properties);
  },

  getFeatureFlag: (featureFlag: string) => {
    if (!initialized) {
      lazyInit();
    }

    // Check if PostHog is fully loaded using the built-in __loaded property
    if (!posthog.__loaded) {
      console.warn(
        `PostHog not fully loaded when checking flag: ${featureFlag}. This may return bootstrap/default values.`,
      );
    }

    return posthog.getFeatureFlag(featureFlag);
  },

  reloadFeatureFlags: (): void => {
    if (!initialized) {
      lazyInit();
    }
    posthog?.reloadFeatureFlags();
  },
};
