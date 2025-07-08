/**
 * Represents the structure of usage data
 */
interface UsageData {
  usage?: {
    tasks?: {
      used: number;
    };
    dataPools?: {
      usedSize: number;
      unit: string;
    };
    activeAgents?: number;
  };
}

/**
 * Fetches usage data from the API.
 * @throws Error if the request fails
 */
export const fetchUsage = async (): Promise<UsageData | null> => {
  const res = await fetch('/api/page/quota/quota/usage');
  const data = await res.json();
  return data?.usage ? { usage: data.usage } : null;
};

/**
 * Fetches team features quota from the API.
 * @throws Error if the request fails
 */
export const fetchTeamFeaturesQuota = async (): Promise<UsageData> => {
  const res = await fetch('/api/page/quota/quota/usage/features', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('Quota features error:', {
      status: res.status,
      statusText: res.statusText,
      errorData,
    });
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return res.json();
};

/**
 * Generates a billing portal session for subscription management.
 * @returns The session data containing the URL, or throws an error.
 */
export const generateBillingPortalSession = async (): Promise<{ sessionUrl: string }> => {
  const res = await fetch('/api/page/plans/subscriptions/billing-portal/generate-session', {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to generate session');
  }

  const { session } = await res.json();
  return { sessionUrl: session.sessionUrl };
}; 