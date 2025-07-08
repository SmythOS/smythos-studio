import { createStore, StateCreator, StoreApi, useStore } from 'zustand';

declare global {
  interface Window {
    smythos_global_stores: Record<string, any>;
  }
}

export interface Slice {
  init: () => Promise<void>;
}

type SliceCreators<TStore> = Array<StateCreator<TStore, [], [], Slice>>;

import { subscribeWithSelector } from 'zustand/middleware';

// Define the type for a store with subscribeWithSelector
type StoreSubscribeWithSelector<T> = {
  subscribe: {
    // Standard subscribe method
    (listener: (state: T, previousState: T) => void): () => void;
    // Enhanced subscribe method with selector
    <U>(
      selector: (state: T) => U,
      listener: (selectedState: U, previousSelectedState: U) => void,
      options?: {
        equalityFn?: (a: U, b: U) => boolean;
        fireImmediately?: boolean;
      },
    ): () => void;
  };
};

// Make a store type that includes the subscribeWithSelector functionality
type StoreApiWithSelector<TStore> = StoreApi<TStore> & StoreSubscribeWithSelector<TStore>;

// Update AppStore type to use StoreApiWithSelector instead of WithSubscribeWithSelector
type AppStore<TStore> = StoreApiWithSelector<TStore> & {
  useStore: {
    // When used without a selector, return the full store state
    (): TStore;
    // When used with a selector, return the selected slice
    <U>(selector: (state: TStore) => U): U;
  };
};

// Create a vanilla store (React-independent)
// should be strongly typed for return type
export const createVanillaAppStore = <TStore>({
  name,
  slices,
  middlewares = [],
}: {
  name: string;
  slices: SliceCreators<TStore>;
  middlewares?: any[];
}) => {
  // ensure only one instance of the store is created per app
  if (!window.smythos_global_stores) {
    window.smythos_global_stores = {};
  }
  const existingInstance = window.smythos_global_stores[name];

  // infer the return type of createStore() (StoreApi)
  // Infer the return type of the curried function createStore<TStore>()()
  if (existingInstance) {
    return existingInstance as StoreApi<TStore>;
  }

  let initializer: StateCreator<TStore, [], [], TStore> = (set, get, store) => {
    const sliceResults = slices.map((s) => s(set, get, store));
    const merged = Object.assign({}, ...sliceResults);

    return {
      ...merged,
      init: async () => {
        await Promise.all(
          sliceResults.filter((s): s is Slice => typeof s.init === 'function').map((s) => s.init()),
        );
      },
    };
  };

  const initMiddlewares = (initializer: StateCreator<TStore, [], [], TStore>) => {
    return middlewares.reduce((cfg, mw) => mw(cfg), initializer);
  };

  // Use createStore instead of create to avoid React dependency
  const store = createStore<TStore>()(subscribeWithSelector(initMiddlewares(initializer)));

  window.smythos_global_stores[name] = store;

  return store;
};

export const createAppStore = <TStore>(options: {
  name: string;
  slices: SliceCreators<TStore>;
  middlewares?: any[];
}): AppStore<TStore> => {
  const vanillaStore = createVanillaAppStore<TStore>(options); // singleton store
  const useStoreHook = <U>(selector?: (state: TStore) => U) => useStore(vanillaStore, selector);
  let modifiedStore: AppStore<TStore> = vanillaStore as AppStore<TStore>;

  // put the hook in the vanilla store
  // Add type-safe hook for selecting store state
  modifiedStore.useStore = useStoreHook as AppStore<TStore>['useStore'];

  return modifiedStore;
};
