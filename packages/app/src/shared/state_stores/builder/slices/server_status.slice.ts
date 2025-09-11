// serverStatusSlice.ts
import { StateCreator } from 'zustand';
import { Slice } from '../..';
import { BuilderStore } from '../store'; // important: import the final store type

export interface ServerStatus {
  baseUrl: string;
  frontUrl: string;
  debugUrl: string;
  embodimentUrl: string;
  docUrl: string;
  dbgUrl: string;
  agent_domain: string;
  env: string;
  status: string;
  prod_agent_domain: string;
  user: any;
  userData: any;
}

export interface ServerStatusSlice extends Slice {
  serverStatus: ServerStatus | null;
  serverStatusLoading: boolean;
  serverStatusError: Error | null;
}

// Add all 3 args: set, get, store
export const serverStatusSlice: StateCreator<BuilderStore, [], [], ServerStatusSlice> = (
  set,
  get,
  store,
) => ({
  serverStatus: null,
  serverStatusLoading: false,
  serverStatusError: null,

  init: async () => {
    set({ serverStatusLoading: true, serverStatusError: null });

    try {
      const res = await fetch('/api/status');
      const result = await res.json();
      const data = result.status;

      set({
        serverStatusLoading: false,
        serverStatus: {
          baseUrl: data.url,
          frontUrl: data.frontUrl,
          debugUrl: `${data.url}/api`,
          docUrl: data.doc_url,
          dbgUrl: data.dbg_url,
          agent_domain: data.agent_domain,
          env: data.env,
          status: data.server,
          embodimentUrl: data.embodiment_url,
          prod_agent_domain: data.prod_agent_domain,
          user: data.user,
          userData: data.user,
        },
      });
    } catch (err) {
      set({ serverStatusError: err as Error, serverStatusLoading: false });
    }
  },
});
