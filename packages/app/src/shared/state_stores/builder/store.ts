// builderStore.ts
import { devtools } from 'zustand/middleware';
import { createAppStore } from '..';
import { BaseSlice, baseSlice } from './slices/base.slice';
import { OAuthSlice, oauthSlice } from './slices/oauth.slice';
import { ServerStatusSlice, serverStatusSlice } from './slices/server_status.slice';

export type BuilderStore = ServerStatusSlice &
  BaseSlice &
  OAuthSlice & {
    init: () => Promise<void>;
  };

export const builderStore = createAppStore<BuilderStore>({
  name: 'builder',
  slices: [serverStatusSlice, baseSlice, oauthSlice],
  middlewares: [devtools],
});
