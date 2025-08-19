import { IAgent } from '@react/features/agents/components/agentCard/types';
import { getAgent } from "../agent-settings/clients";

export const accquireLock = async (id) => {
  const response = await fetch(`/api/page/agent_settings/lock`, {
    method: 'POST',
    body: JSON.stringify({ agentId: id }),
    headers: {
      'Content-type': 'application/json; charset=UTF-8',
    },
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message);

  return {
    lockId: result?.lock?.id,
  };
};

export const releaseLock = async (agentId, lockId) => {
  const response = await fetch(`/api/page/agent_settings/release-lock`, {
    method: 'PUT',
    body: JSON.stringify({ lockId, agentId }),
    headers: {
      'Content-type': 'application/json; charset=UTF-8',
    },
  });
  const result = await response.json();
  if (result.success) {
    return {
      success: true,
      message: 'Lock released',
    };
  }
};

export function processAvatar(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);

        canvas.width = 512;
        canvas.height = 512;

        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          512,
          512,
        );

        // Convert canvas to File
        canvas.toBlob(
          (blob) => {
            const processedFile = new File([blob], 'avatar.png', { type: 'image/png' });
            resolve(processedFile);
          },
          'image/png',
          0.7,
        ); // Reduce quality slightly to reduce size
      };
      img.src = e.target.result as string;
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

export const saveAgentDirectly = async (
  id: string,
  agentData: IAgent,
  updateDataCb: (agent: IAgent) => IAgent,
) => {
  const newPinnedState = !agentData.isPinned;

  try {
    const lockResult = await accquireLock(id);
    if (!lockResult?.lockId) {
      throw new Error('Failed to acquire lock');
    }

    const currentAgent = await getAgent(id);

    const requestBody = {
      id,
      name: currentAgent.name || 'Untitled Agent',
      data: {
        ...currentAgent.data,
      },
      lockId: lockResult.lockId,
      isPinned: newPinnedState,
    };

    const response = await fetch(`/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Failed to save agent');
    }
    const updatedAgentResponse = await response.json();

    // Step 3: Convert the response to IAgent format and update state
    const updatedAgent: IAgent = {
      ...agentData, // Keep existing agent properties
      isPinned: newPinnedState, // Update the pinned state
      ...updatedAgentResponse, // Override with any properties from the response
    };

    return updatedAgent;

  } catch (error: unknown) {
    console.error('Failed to pin/unpin agent:', error);

    // Handle specific error cases
    if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
      throw new Error('You do not have access to update this agent.');
    } else if (
      error &&
      typeof error === 'object' &&
      'error' in error &&
      error.error === 'Request failed with status code 409'
    ) {
      throw new Error(
        'Failed to update agent as it is being edited by another user. Please try again later.',
      );
    } else {
      throw new Error(`Failed to ${newPinnedState ? 'pin' : 'unpin'} agent`);
    }
  }
};