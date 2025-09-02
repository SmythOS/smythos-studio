import { StateCreator } from 'zustand';
import { Slice } from '../..';
import { BuilderStore } from '../store'; // important: import the final store type

export interface AgentOperationsSlice extends Slice {
  /**
   * Handles avatar generation for a newly created agent
   */
  generateAgentAvatar: (agentId: string) => Promise<boolean>;
}

// Add all 3 args: set, get, store
export const agentOperationsSlice: StateCreator<BuilderStore, [], [], AgentOperationsSlice> = (
  set,
  get,
  store,
) => ({
  /**
   * Handles avatar generation for a newly created agent
   */
  generateAgentAvatar: async (agentId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/page/agent_settings/ai-agent/${agentId}/avatar/auto-generate`,
        { method: 'POST' },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.url && window.workspace?.agent) {
          window.workspace.agent.emit('AvatarUpdated', data.url);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Avatar generation failed:', error);
      return false;
    }
  },

  init: async () => {},
});
