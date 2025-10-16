import { VAULT_SCOPE_AGENT_LLM } from '@src/shared/constants/general';
import type { ApiKey, BuiltInModel, UserCustomModel, UserModel } from './types/types';

export const builtInModelService = {
  models: [
    { id: 'openai', name: 'OpenAI', isEnabled: true, icon: 'openai' },
    { id: 'anthropic', name: 'Anthropic', isEnabled: true, icon: 'anthropic' },
    { id: 'googleai', name: 'Google AI', isEnabled: false, icon: 'googleai' },
    { id: 'perplexity', name: 'Perplexity', isEnabled: true, icon: 'perplexity' },
  ],

  getBuiltInModels: async (): Promise<BuiltInModel[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return builtInModelService.models;
  },

  toggleBuiltInModelStatus: async (modelId: string, isEnabled: boolean): Promise<BuiltInModel> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const model = builtInModelService.models.find((m) => m.id === modelId);
    if (model) {
      model.isEnabled = isEnabled;
      return model;
    } else {
      throw new Error('Model not found');
    }
  },
};

export const userModelService = {
  customModels: [
    { id: 'user/openai', name: 'OpenAI', apiKey: 'key-12345', icon: 'openai' },
    { id: 'user/anthropic', name: 'Anthropic', apiKey: 'key-67890', icon: 'anthropic' },
    { id: 'user/googleai', name: 'Google AI', apiKey: 'key-11223', icon: 'googleai' },
    { id: 'user/perplexity', name: 'Perplexity', apiKey: 'key-44556', icon: 'perplexity' },
  ],

  fetchUserModels: async (): Promise<UserModel[]> => {
    try {
      const response = await fetch('/api/page/vault/keys?scope=global', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch user models:', response.statusText);
        throw new Error('Failed to fetch user models');
      }

      const result = await response.json();
      const models = Object.entries(result.data || {}).map(([id, value]: [string, any]) => ({
        id,
        apiKey: value.key,
        name: value.name || 'Unknown Model',
        icon: value.name?.toLowerCase() || 'none',
      }));

      return models;
    } catch (error) {
      console.error('Error fetching user models:', error);
      throw new Error(error.error || error.message || 'Failed to fetch user models');
    }
  },

  addUserModelKey: async (
    modelId: string,
    keyName: string,
    apiKey: string,
  ): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/page/vault/keys/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: apiKey.trim(),
          keyName: keyName.trim(),
          scope: ['global'],
        }),
      });

      if (!response.ok) {
        console.error('Failed to add user model key:', response.statusText);
        throw new Error('Failed to add user model key');
      }

      const result = await response.json();
      if (result.success) {
        return { error: null };
      } else {
        throw new Error('Failed to add user model key');
      }
    } catch (error) {
      console.error('Error adding user model key:', error);
      throw new Error(error.error || error.message || 'Failed to add user model key');
    }
  },

  updateUserModelKey: async (
    modelId: string,
    keyName: string,
    apiKey: string,
  ): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/page/vault/keys/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope: ['global'],
          key: apiKey.trim(),
          keyName: keyName.trim(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to update user model key:', response.statusText);
        throw new Error('Failed to update user model key');
      }

      const result = await response.json();
      if (result.success) {
        return { error: null };
      } else {
        throw new Error('Failed to update user model key');
      }
    } catch (error) {
      console.error('Error updating user model key:', error);
      throw new Error(error.error || error.message || 'Failed to update user model key');
    }
  },

  deleteUserModelKey: async (modelId: string): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/page/vault/keys/${modelId}`, { method: 'DELETE' });
      return { error: null };
    } catch (error) {
      console.error('Error deleting user model key:', error);
      throw new Error(error.error || error.message || 'Failed to delete user model key');
    }
  },
};

export const apiKeyService = {
  apiKeys: [],

  fetchAPIKeys: async (): Promise<{ keys?: ApiKey[]; error?: string }> => {
    try {
      const response = await fetch(
        '/api/page/vault/keys?excludeScope=global,' + VAULT_SCOPE_AGENT_LLM,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        console.error('Failed to fetch API keys:', response.statusText);
        return { error: 'Failed to fetch API keys' };
      }

      const result = await response.json();

      // Convert the response data object into an array of ApiKey objects
      const keys = Object.entries(result.data || {}).map(([id, value]: [string, any]) => ({
        id,
        name: value.name,
        owner: value.owner || 'Unknown',
        scope: value.scope || ['Unknown'],
        key: value.key,
      }));

      return { keys };
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return { error: 'An unexpected error occurred while fetching API keys' };
    }
  },

  addApiKey: async (keyDetails: Omit<ApiKey, 'id' | 'owner'>): Promise<Omit<ApiKey, 'owner'>> => {
    try {
      const response = await fetch('/api/page/vault/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: keyDetails.key?.trim(),
          keyName: keyDetails.name?.trim(),
          scope: keyDetails.scope?.map((s) => s.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add API key: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        key: keyDetails.key,
        id: result.data.keyId,
        name: keyDetails.name,
        scope: keyDetails.scope,
      };
    } catch (error) {
      console.error('Error adding API key:', error);
      throw new Error(error.error || error.message || 'Failed to add API key');
    }
  },

  updateApiKey: async (
    keyId: string,
    updatedFields: Partial<ApiKey>,
  ): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/page/vault/keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) {
        throw new Error(`Failed to update API key: ${response.statusText}`);
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating API key:', error);
      throw new Error(error.error || error.message || 'Failed to update API key');
    }
  },

  deleteApiKey: async (keyId: string): Promise<{ error?: string }> => {
    try {
      const response = await fetch(`/api/page/vault/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete API key: ${response.statusText}`);
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw new Error(error.error || error.message || 'Failed to delete API key');
    }
  },
};

export const globalModelKeyNameMap = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  googleai: 'GoogleAI',
  togetherai: 'TogetherAI',
  groq: 'Groq',
  xai: 'xAI',
};

export const vaultService = {
  exportVaultStructure: async () => {
    try {
      const res = await fetch('/api/page/vault/keys?fields=name,key');
      const resJson = await res.json();
      const data = resJson?.data || {};
      const teamId = resJson?.teamId;

      // Convert the data to the expected format
      const dataToExport = {};
      for (const [id, value] of Object.entries(data)) {
        let keyName = (value as { name: string })?.name;
        keyName = globalModelKeyNameMap?.[id?.toLowerCase()] || keyName;
        dataToExport[keyName] = (value as Record<string, string>)?.key;
      }

      // Return the structured data
      return {
        [teamId]: dataToExport,
      };
    } catch (error) {
      console.error('Error exporting vault structure:', error);
      throw new Error('Failed to export vault structure');
    }
  },
};

export const recommendedModelsService = {
  getNameByProviderId: (providerId: string) => {
    return globalModelKeyNameMap?.[providerId?.toLowerCase()] || providerId;
  },
  getRecommendedModels: async (): Promise<Record<string, { enabled: boolean }>> => {
    try {
      const res = await fetch('/api/page/vault/recommended-models');
      const resJson = await res.json();
      return resJson?.data || {};
    } catch (error) {
      console.error('Error fetching recommended models:', error);
      throw new Error('Failed to get recommended models');
    }
  },
  updateRecommendedModels: async (providerId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/page/vault/recommended-models/${providerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });
      return res.json();
    } catch (error) {
      console.error('Error updating recommended models:', error);
      throw new Error('Failed to update recommended models');
    }
  },
};

export const userCustomModelService = {
  userCustomModels: [],

  /**
   * Fetches all user custom LLM models for the current team
   */
  getUserCustomModels: async (): Promise<UserCustomModel[]> => {
    try {
      const response = await fetch('/api/page/vault/user-custom-llm', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user custom models');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user custom models');
      }

      // Convert the user custom LLM data to our UserCustomModel format
      // Handle both new field names (contextWindow, maxOutputTokens) and old ones (tokens, completionTokens)
      const models = Object.entries(result.data || {}).map(([id, value]: [string, any]) => ({
        id: value.id || id,
        name: value.name,
        modelId: value.modelId,
        baseURL: value.baseURL,
        provider: value.provider,
        // Check for new field name first, then fall back to old field name
        contextWindow: value.contextWindow !== undefined ? value.contextWindow : value.tokens,
        maxOutputTokens:
          value.maxOutputTokens !== undefined ? value.maxOutputTokens : value.completionTokens,
        fallbackLLM: value.fallbackLLM || '', // Provide default empty string for backward compatibility with cached data
        features: value.features,
      }));

      return models;
    } catch (error) {
      console.error('Error fetching user custom models:', error);
      return [];
    }
  },

  /**
   * Creates a new user custom LLM model
   */
  createUserCustomModel: async (
    modelDetails: Omit<UserCustomModel, 'id'>,
  ): Promise<UserCustomModel> => {
    try {
      const response = await fetch('/api/page/vault/user-custom-llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelDetails),
      });

      if (!response.ok) {
        throw new Error('Failed to create user custom model');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create user custom model');
      }

      // Return the created model with the generated ID
      return {
        id: result.data.id,
        name: result.data.name,
        modelId: modelDetails.modelId,
        baseURL: modelDetails.baseURL,
        provider: modelDetails.provider,
        contextWindow: modelDetails.contextWindow,
        maxOutputTokens: modelDetails.maxOutputTokens,
        fallbackLLM: modelDetails.fallbackLLM,
        features: modelDetails.features,
      };
    } catch (error) {
      console.error('Error creating user custom model:', error);
      throw new Error(error.error || error.message || 'Failed to create user custom model');
    }
  },

  /**
   * Updates an existing user custom LLM model
   */
  updateUserCustomModel: async (
    modelId: string,
    updatedFields: Partial<UserCustomModel>,
  ): Promise<UserCustomModel> => {
    try {
      const response = await fetch(`/api/page/vault/user-custom-llm/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) {
        throw new Error('Failed to update user custom model');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user custom model');
      }

      // Return the updated model
      return {
        id: modelId,
        name: result.data.name,
        modelId: updatedFields.modelId || '',
        baseURL: updatedFields.baseURL || '',
        provider: updatedFields.provider || '',
        contextWindow: updatedFields.contextWindow,
        maxOutputTokens: updatedFields.maxOutputTokens,
        fallbackLLM: updatedFields.fallbackLLM || '',
        features: updatedFields.features,
      };
    } catch (error) {
      console.error('Error updating user custom model:', error);
      throw new Error(error.error || error.message || 'Failed to update user custom model');
    }
  },

  /**
   * Deletes a user custom LLM model
   */
  deleteUserCustomModel: async (modelId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/page/vault/user-custom-llm/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user custom model');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user custom model');
      }
    } catch (error) {
      console.error('Error deleting user custom model:', error);
      throw new Error(error.error || error.message || 'Failed to delete user custom model');
    }
  },
};
