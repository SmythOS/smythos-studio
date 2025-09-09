import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export const requestContext = {
  run: (callback, initialValue = {}) => {
    asyncLocalStorage.run(initialValue, callback);
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
    }
  },
};
