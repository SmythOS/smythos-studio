import { transformOAuthCredEntry } from '@src/shared/helpers/oauth/oauth-api.helper';
import { StateCreator } from 'zustand';
import { Slice } from '../..';
import { BuilderStore } from '../store';

export interface OAuthSlice extends Slice {
  oauthConnections: Record<string, any> | null;
  oauthConnectionsPromise: Promise<any> | null;
  oauthConnectionsLoading: boolean;
  oauthConnectionsError: Error | null;
  getOAuthConnections: (forceRefresh?: boolean, resolveVaultKeys?: boolean) => Promise<any>;
  invalidateOAuthConnectionsCache: () => void;
}

export const oauthSlice: StateCreator<BuilderStore, [], [], OAuthSlice> = (set, get, store) => ({
  oauthConnections: null,
  oauthConnectionsPromise: null,
  oauthConnectionsLoading: false,
  oauthConnectionsError: null,

  init: async () => {},

  getOAuthConnections: async (forceRefresh = false, resolveVaultKeys = true) => {
    if (forceRefresh) {
      set({ oauthConnections: null, oauthConnectionsPromise: null });
    }
    const { oauthConnections, oauthConnectionsPromise } = get();
    if (oauthConnections !== null) return oauthConnections;
    if (oauthConnectionsPromise !== null) return oauthConnectionsPromise;
    set({ oauthConnectionsLoading: true, oauthConnectionsError: null });

    // Build URL with optional vault key resolution
    const url = `/api/app/credentials?group=oauth_connections_creds${resolveVaultKeys ? '&resolveVaultKeys=true' : ''}`;

    const promise = fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch OAuth connections: ${response.status}`);
        }
        const result = await response.json();
        const credentials = result.data || [];

        // Transform to legacy format and index by ID
        const connectionsMap: Record<string, any> = {};
        credentials.forEach((credential: any) => {
          connectionsMap[credential.id] = transformOAuthCredEntry(credential);
        });

        set({
          oauthConnections: connectionsMap,
          oauthConnectionsLoading: false,
          oauthConnectionsPromise: null,
        });
        return connectionsMap;
      })
      .catch((error) => {
        console.error('[OAuth Slice] Error fetching connections:', error);
        set({
          oauthConnectionsError: error,
          oauthConnectionsLoading: false,
          oauthConnectionsPromise: null,
        });
        throw error;
      });
    set({ oauthConnectionsPromise: promise });
    return promise;
  },

  invalidateOAuthConnectionsCache: () => {
    set({ oauthConnections: null, oauthConnectionsPromise: null });
  },
});
