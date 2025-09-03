import { DuplicateAgentResponse, IAgent } from '@react/features/agents/components/agentCard/types';
import { accquireLock } from '@react/features/agents/utils';
import { useAgentMutations } from '@react/shared/hooks/agent';
import { builderStore } from '@src/shared/state_stores/builder/store';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

interface UseAgentOperationsProps {
  agent: IAgent;
  onAgentDeleted?: () => void;
  onAgentDuplicated?: () => void;
  onAgentPinned?: (updatedAgent: IAgent) => void;
}

interface UseAgentOperationsResult {
  duplicateAgent: () => Promise<void>;
  deleteAgent: () => Promise<void>;
  pinAgent: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Custom hook for handling agent operations (duplicate, delete)
 */
export function useAgentOperations({
  agent,
  onAgentDeleted,
  onAgentDuplicated,
  onAgentPinned,
}: UseAgentOperationsProps): UseAgentOperationsResult {
  // Only fetch full agent data when actually needed for duplication
  // This prevents unnecessary API calls for every agent card
  const { createAgent, saveAgent } = useAgentMutations();

  /**
   * Creates a duplicate of an existing agent with reset configurations
   */
  const createDuplicateAgent = useCallback(async (): Promise<DuplicateAgentResponse> => {
    try {
      // Fetch full agent data only when duplication is actually triggered
      const response = await fetch(`/api/agent/${agent.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent details');
      }

      const { agent: fullAgentData } = await response.json();

      if (!fullAgentData) {
        return {
          success: false,
          message: 'Unable to fetch agent details',
        };
      }

      const initialData = {
        description: fullAgentData.description || '',
        components: [],
        connections: [],
      };

      const newAgent = await createAgent({
        name: `Copy of ${fullAgentData.name}`,
        description: fullAgentData.description,
        data: fullAgentData.data || initialData,
      });

      if (!newAgent?.id) {
        return {
          success: false,
          message: 'Failed to create new agent',
        };
      }

      // Generate avatar for the new agent (non-blocking)
      const { generateAgentAvatar } = builderStore.getState();
      const avatarGenerated = await generateAgentAvatar(newAgent.id);
      if (!avatarGenerated) {
        console.warn('Avatar generation failed for duplicated agent');
      }

      return {
        success: true,
        message: 'Agent duplicated successfully',
        agentId: newAgent.id,
      };
    } catch (error) {
      console.error('Failed to duplicate agent:', error);
      return {
        success: false,
        message: 'Failed to duplicate agent',
      };
    }
  }, [agent.id, createAgent]);

  /**
   * Handles the duplication process and UI feedback
   */
  const duplicateAgent = useCallback(async (): Promise<void> => {
    try {
      const result = await createDuplicateAgent();

      if (result.success) {
        toast.success(result.message);
        onAgentDuplicated?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to duplicate agent:', error);
      toast.error('Failed to duplicate agent');
    }
  }, [createDuplicateAgent, onAgentDuplicated]);

  /**
   * Handles agent deletion with proper error handling
   */
  const deleteAgent = useCallback(async (): Promise<void> => {
    const id = agent.id;

    try {
      // Acquire lock before deletion
      const lockResult = await accquireLock(id);
      if (!lockResult?.lockId) {
        throw new Error('Failed to acquire lock');
      }
    } catch (error: unknown) {
      console.error('Lock acquisition failed:', error);

      if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
        toast.error('You do not have access to delete this agent.');
      } else if (
        error &&
        typeof error === 'object' &&
        'error' in error &&
        error.error === 'Request failed with status code 409'
      ) {
        toast.error(
          'Failed to delete agent as the agent is being edited by another user. Please try again later.',
        );
      } else {
        toast.error('Unable to delete agent. Please try again later.');
      }
      return;
    }

    try {
      const response = await fetch(`/api/agent/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Agent deleted successfully');
        onAgentDeleted?.();
      } else {
        toast.error('Failed to delete agent');
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
      toast.error('Failed to delete agent');
    }
  }, [agent.id, onAgentDeleted]);

  /**
   * Handles agent pin/unpin with proper error handling
   */
  const pinAgent = useCallback(async (): Promise<void> => {
    const id = agent.id;
    const newPinnedState = !agent.isPinned;
    const actionText = newPinnedState ? 'pin' : 'unpin';

    try {
      const endpoint = `/api/page/agents/ai-agent/${id}/pin`;
      const method = newPinnedState ? 'POST' : 'DELETE';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to get error message from response
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `Failed to ${actionText} agent. Please try again.`;
        throw new Error(errorMessage);
      }

      const updatedAgent: IAgent = {
        ...agent,
        isPinned: newPinnedState,
      };

      toast.success(`Agent ${newPinnedState ? 'pinned' : 'unpinned'} successfully`);
      // Update the agent in place instead of reloading the entire list
      onAgentPinned?.(updatedAgent);
    } catch (error) {
      console.error('Failed to pin/unpin agent:', error);

      // Check if error has a message, if not use generic error
      if (error && typeof error === 'object' && 'message' in error) {
        toast.error(error.message);
      } else {
        toast.error(`Failed to ${actionText} agent. Please try again.`);
      }
    }
  }, [agent, onAgentPinned]);

  return {
    duplicateAgent,
    deleteAgent,
    pinAgent,
    isLoading: false,
  };
}
