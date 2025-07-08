// builderStore.ts
import { createAppStore } from '..';
import { devtools } from 'zustand/middleware';
import { AuthSlice } from './types';
import { baseSlice } from './slices/base.slice';

export type AuthStore = AuthSlice & {
  init: () => Promise<void>;
};

export const authStore = createAppStore<AuthStore>({
  name: 'auth',
  slices: [baseSlice],
  middlewares: [devtools],
});
