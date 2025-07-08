// serverStatusSlice.ts
import { StateCreator } from 'zustand';
import { BuilderStore } from '../store'; // important: import the final store type
import { Slice } from '../..';

export interface BaseSlice extends Slice {
  agentDomains: {
    dev: string | null;
    prod: string | null;
    defaultProd: string | null;
    scheme: string | null;
  };
}

// Add all 3 args: set, get, store
export const baseSlice: StateCreator<BuilderStore, [], [], BaseSlice> = (set, get, store) => ({
  agentDomains: { dev: null, prod: null, defaultProd: null, scheme: null },

  init: async () => {},
});
