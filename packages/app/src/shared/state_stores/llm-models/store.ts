import { devtools } from 'zustand/middleware';
import { createAppStore } from '..';
import { baseSlice } from './slices/base.slice';
import { LLMModelsSlice } from './types';

export type LLMModelsStore = LLMModelsSlice & {
  init: () => Promise<void>;
};

export const llmModelsStore = createAppStore<LLMModelsStore>({
  name: 'llm-models',
  slices: [baseSlice],
  middlewares: [devtools],
}); 