import { StateCreator } from 'zustand';
import { LLMModelsSlice } from '../types';

export const baseSlice: StateCreator<
  LLMModelsSlice & { init: () => Promise<void> },
  [],
  [],
  LLMModelsSlice
> = (set, get) => ({
  models: {},
  isLoading: false,
  error: null,

  fetchModels: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/page/builder/llm-models');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const models = data.LLMModels || {};

      set({ models, isLoading: false });

      // Also set in window for backward compatibility
      window.__LLM_MODELS__ = models;
    } catch (error) {
      console.error('Failed to load LLM models:', error);

      set({
        error: error instanceof Error ? error.message : 'Failed to load LLM models',
        isLoading: false,
      });
    }
  },

  init: async () => {
    // Check if models are already loaded server-side
    if (window.__LLM_MODELS__ && Object.keys(window.__LLM_MODELS__).length > 0) {
      set({ models: window.__LLM_MODELS__, isLoading: false });
      return;
    }

    // Fallback to fetching models client-side
    await get().fetchModels();
  },
});
