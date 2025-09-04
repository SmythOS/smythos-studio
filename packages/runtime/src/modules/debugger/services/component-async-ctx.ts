import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export const componentAsyncCtx = {
  run: async (callback, initialValue = {}) => {
    return await asyncLocalStorage.run(initialValue, callback);
  },
  enterWith: (initialValue = {}) => {
    // preserve the store (if any)
    const store = (asyncLocalStorage.getStore() as any) || {};
    return asyncLocalStorage.enterWith({ ...store, ...initialValue });
  },
  get: (key: string) => {
    const store = asyncLocalStorage.getStore();
    if (store) {
      return store[key];
    }
    return null;
  },
  set: (key: string, value: any) => {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store[key] = value;
    } else {
      console.log('ComponentAsyncCtx: no store found');
    }
  },
};
