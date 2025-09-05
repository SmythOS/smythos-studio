// builderStore.ts
import { devtools } from 'zustand/middleware';
import { createAppStore } from '..';
import { AgentOperationsSlice, agentOperationsSlice } from './slices/agent_operations.slice';
import { BaseSlice, baseSlice } from './slices/base.slice';
import { OAuthSlice, oauthSlice } from './slices/oauth.slice';
import { ServerStatusSlice, serverStatusSlice } from './slices/server_status.slice';

export type BuilderStore = ServerStatusSlice &
  BaseSlice &
  OAuthSlice &
  AgentOperationsSlice & {
    init: () => Promise<void>;
  };

export const builderStore = createAppStore<BuilderStore>({
  name: 'builder',
  slices: [serverStatusSlice, baseSlice, oauthSlice, agentOperationsSlice],
  middlewares: [devtools],
});
