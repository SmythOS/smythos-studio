export async function getAgentAuthData(agentId: string) {
  try {
    const authData = await fetch(`/api/page/builder/agent-auth/${agentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res) => res.json());

    return authData.data;
  } catch (error) {
    throw error;
  }
}

export async function saveAgentAuthData(agentId: string, authData: any) {
  try {
    const response = await fetch(`/api/page/builder/agent-auth/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });
    const result = await response.json();

    return result;
  } catch (error) {
    throw error;
  }
}
