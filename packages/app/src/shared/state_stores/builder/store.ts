// builderStore.ts
import { create, StoreApi } from 'zustand';
import { ServerStatusSlice, serverStatusSlice } from './slices/server_status.slice';
import { createAppStore } from '..';
import { BaseSlice, baseSlice } from './slices/base.slice';
import { devtools } from 'zustand/middleware';

export type BuilderStore = ServerStatusSlice &
  BaseSlice & {
    init: () => Promise<void>;
  };

export const builderStore = createAppStore<BuilderStore>({
  name: 'builder',
  slices: [serverStatusSlice, baseSlice],
  middlewares: [devtools],
});
