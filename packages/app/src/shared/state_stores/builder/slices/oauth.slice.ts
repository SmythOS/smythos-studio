import { StateCreator } from 'zustand';
import { Slice } from '../..';
import { BuilderStore } from '../store';

export interface OAuthSlice extends Slice {
  oauthConnections: Record<string, any> | null;
  oauthConnectionsPromise: Promise<any> | null;
  oauthConnectionsLoading: boolean;
  oauthConnectionsError: Error | null;
  getOAuthConnections: (forceRefresh?: boolean) => Promise<any>;
  invalidateOAuthConnectionsCache: () => void;
}

export const oauthSlice: StateCreator<BuilderStore, [], [], OAuthSlice> = (set, get, store) => ({
  oauthConnections: null,
  oauthConnectionsPromise: null,
  oauthConnectionsLoading: false,
  oauthConnectionsError: null,

  init: async () => { },

  getOAuthConnections: async (forceRefresh = false) => {
    if (forceRefresh) {
      set({ oauthConnections: null, oauthConnectionsPromise: null });
    }
    const { oauthConnections, oauthConnectionsPromise } = get();
    if (oauthConnections !== null) return oauthConnections;
    if (oauthConnectionsPromise !== null) return oauthConnectionsPromise;
    set({ oauthConnectionsLoading: true, oauthConnectionsError: null });
    const promise = fetch('/api/page/vault/oauth-connections', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch OAuth connections: ${response.status}`);
        }
        const data = await response.json();
        // Normalize: parse string values
        Object.keys(data || {}).forEach((id) => {
          const value = data[id];
          if (typeof value === 'string') {
            try {
              data[id] = JSON.parse(value);
            } catch (e) {
              // ignore
            }
          }
        });
        set({ oauthConnections: data, oauthConnectionsLoading: false, oauthConnectionsPromise: null });
        return data;
      })
      .catch((error) => {
        set({ oauthConnectionsError: error, oauthConnectionsLoading: false, oauthConnectionsPromise: null });
        throw error;
      });
    set({ oauthConnectionsPromise: promise });
    return promise;
  },

  invalidateOAuthConnectionsCache: () => {
    set({ oauthConnections: null, oauthConnectionsPromise: null });
  },
});
