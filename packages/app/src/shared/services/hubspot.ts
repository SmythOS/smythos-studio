declare global {
  interface Window {
    _hsq: any[];
  }
}

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const HUBSPOT_SCRIPT_ID = 'hs-script-loader';
const HUBSPOT_PORTAL_ID = '20645624';

let initialized = false;

const lazyInit = () => {
  if (!initialized) {
    if (!document.getElementById(HUBSPOT_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = HUBSPOT_SCRIPT_ID;
      script.src = `//js.hs-scripts.com/${HUBSPOT_PORTAL_ID}.js`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    window._hsq = window._hsq || [];

    initialized = true;
  }
};

export const HubSpot = {
  initialize: () => {
    if (document.readyState === 'complete') {
      lazyInit();
    } else {
      window.addEventListener('load', lazyInit);
    }
  },

  trackEvent: (eventName: string, properties = {}) => {
    if (!initialized) {
      lazyInit();
    }

    if (window._hsq) {
      window._hsq.push([
        'trackEvent',
        {
          id: eventName,
          value: properties,
        },
      ]);
    }
  },

  identifyUser: (email: string, properties = {}) => {
    if (!initialized) {
      lazyInit();
    }

    // Use the cookies from the typed object
    const userProperties = {
      email,
      ...properties,
      __hstc: getCookie('__hstc'),
      __hssrc: getCookie('__hssrc'),
      hubspotutk: getCookie('hubspotutk'),
    };

    if (window._hsq) {
      window._hsq.push(['identify', userProperties]);
    }
  },

  trackPageView: () => {
    if (!initialized) {
      lazyInit();
    }

    if (window._hsq) {
      window._hsq.push(['trackPageView']);
    }
  },
};
