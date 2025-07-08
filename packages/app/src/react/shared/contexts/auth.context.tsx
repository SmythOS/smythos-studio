import { authStore } from '@shared/state_stores/auth';

/*
This file used to be a react context provider, but now we are moving
to a global state store arch where the store is a singleton accross 
vanilljs and react, hence, to make the transition easier, we are using
an alias to access the store so it appears smooth for the current consumers
*/
export const useAuthCtx = authStore.useStore;
