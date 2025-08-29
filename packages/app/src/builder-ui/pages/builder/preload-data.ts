import { lsCache } from '../../../shared/Cache.class';
import { MOCK_DATA_CACHE_KEY, VAULT_DATA_CACHE_KEY } from '../../../shared/constants/general';
import { builderStore } from '../../../shared/state_stores/builder/store';
import { Workspace } from '../../workspace/Workspace.class';

export async function preloadDataScripts(workspace: Workspace) {
  try {
    //#region preload vault data
    fetch(`/api/page/builder/keys?fields=name,scope`)
      .then((res) => res.json())
      .then((resJson) => {
        const data = resJson?.data || {};

        lsCache.set(VAULT_DATA_CACHE_KEY, data);
      });
    //#endregion

    //#region preload OAuth connections
    builderStore.getState().getOAuthConnections()
      .then(() => {
        // console.log('[PreloadData] OAuth connections preloaded successfully');
      })
      .catch((error) => {
        console.error('[PreloadData] Failed to preload OAuth connections:', error);
      });
    //#endregion

    //#region preload mock data
    // workspace?.agent?.id is not available here
    // Extract agent ID from URL path
    const agentId = window.location.pathname.split('/').pop();
    fetch(`/api/page/builder/mock-data/${agentId}`)
      .then((res) => res.json())
      .then((resJson) => {
        const data = resJson?.data || {};

        if (Object.keys(data).length > 0) {
          lsCache.set(MOCK_DATA_CACHE_KEY, data);
        }
      });
    //#endregion
  } catch {
    // console.log('Preloading vault data failed.');
  }
}
