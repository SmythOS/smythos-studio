export const fetchLLMAndApiUsage = async (teamId: string, date: any) => {
  const response = await fetch(
    `/api/page/quota/quota/usage/${teamId}/llm-tokens-and-api-requests?date=${date}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.message) {
      throw new Error(errorData.message);
    } else {
      throw new Error(`Failed to fetch usage data: ${response.statusText}`);
    }
  }

  return response.json();
};

export const fetchCurrentCycleUsage = async () => {
  const response = await fetch('/api/page/quota/quota/current-cycle/usage', {
    method: 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.message) {
      throw new Error(errorData.message);
    } else {
      throw new Error(`Failed to fetch usage data: ${response.statusText}`);
    }
  }

  return response.json();
};
