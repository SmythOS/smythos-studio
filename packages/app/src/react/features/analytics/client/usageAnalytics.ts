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
    throw new Error(`Failed to fetch usage data: ${response?.status} ${response?.statusText}`);
  }

  return response.json();
};
