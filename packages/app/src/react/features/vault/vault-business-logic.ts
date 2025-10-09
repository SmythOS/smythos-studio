import { VAULT_SCOPE_AGENT_LLM } from '@src/shared/constants/general';
import type { UserProfile, BuiltInModel, UserModel, EnterpriseModel, ApiKey } from './types/types';
import { customModels } from '@src/shared/custom-models';
import {
  CUSTOM_LLM_PROVIDERS,
  CUSTOM_LLM_REGIONS,
} from '@src/shared/constants/custom-llm.constants';

export interface Provider {
  id: string;
  name: string;
  models: {
    id: string;
    llm: string;
    label: string;
    tokens: number;
    tags?: string[];
    components: string[];
    completionTokens: number;
    supportsSystemPrompt: boolean;
    supportsStreamingToolUse?: boolean;
  }[];
  regions: {
    text: string;
    value: string;
  }[];
}

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

export const enterpriseModelService = {
  enterpriseModels: [],

  getEnterpriseModels: async (): Promise<EnterpriseModel[]> => {
    try {
      const response = await fetch('/api/page/vault/custom-llm', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch enterprise models');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch enterprise models');
      }

      // Convert the custom LLM data to our EnterpriseModel format
      const models = Object.entries(result.data || {}).map(([id, value]: [string, any]) => ({
        id: value.id,
        name: value.name,
        modelName: value.settings?.foundationModel,
        provider: value.provider,
        contextWindowSize: value.tokens || 0,
        completionTokens: value.completionTokens || 0,
        features: value.features || [],
        tags: value.tags || [],
        enabled: true,
        isCustomLLM: true,
        settings: value.settings,
      }));

      return models;
    } catch (error) {
      console.error('Error fetching enterprise models:', error);
      return [];
    }
  },

  createEnterpriseModel: async (
    modelDetails: Omit<EnterpriseModel, 'id'>,
  ): Promise<EnterpriseModel> => {
    try {
      // Convert our EnterpriseModel format to the custom LLM format
      const customLLMData = {
        name: modelDetails.name,
        provider: modelDetails.provider,
        features: modelDetails.features,
        settings: {
          ...modelDetails.settings,
          foundationModel: modelDetails.modelName,
        },
      };

      const response = await fetch('/api/page/vault/custom-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customLLMData),
      });

      if (!response.ok) {
        throw new Error('Failed to create enterprise model');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create enterprise model');
      }

      // Convert the response back to our EnterpriseModel format
      return {
        id: result.data.id,
        name: modelDetails.name,
        modelName: modelDetails.modelName,
        provider: modelDetails.provider,
        contextWindowSize: modelDetails.contextWindowSize,
        completionTokens: modelDetails.completionTokens,
        features: modelDetails.features,
        tags: modelDetails.tags || [],
        enabled: true,
        isCustomLLM: true,
        settings: modelDetails.settings,
      };
    } catch (error) {
      console.error('Error creating enterprise model:', error);
      throw new Error(error.error || error.message || 'Failed to create enterprise model');
    }
  },

  updateEnterpriseModel: async (
    modelId: string,
    updatedFields: Partial<EnterpriseModel>,
  ): Promise<EnterpriseModel> => {
    try {
      // Extract the actual model ID from the enterprise prefix
      const customLLMId = modelId.replace('enterprise/', '');

      // ! DEPRECATED: Will be removed. As the model data is already available from the form fields in updatedFields parameter. No need to fetch current model data since we have all required fields
      // Get the current model data first
      // const currentModel = await fetch(`/api/page/vault/custom-llm/${customLLMId}`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      // }).then((res) => res.json());

      // if (!currentModel.success) {
      //   throw new Error(currentModel.error || 'Failed to fetch current model data');
      // }

      // Merge the current data with the updates
      // const customLLMData = {
      //   name: updatedFields.name || currentModel.data.name,
      //   provider: updatedFields.provider || currentModel.data.provider,
      //   features: updatedFields.features || currentModel.data.features,
      //   settings: {
      //     ...currentModel.data.settings,
      //     ...updatedFields.settings,
      //     foundationModel: updatedFields.modelName || currentModel.data.settings?.foundationModel,
      //   },
      // };

      const modelData = {
        name: updatedFields.name,
        provider: updatedFields.provider,
        features: updatedFields.features,
        settings: {
          ...updatedFields.settings,
          foundationModel: updatedFields.modelName,
        },
      };

      const response = await fetch(`/api/page/vault/custom-llm/${customLLMId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      if (!response.ok) {
        throw new Error('Failed to update enterprise model');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update enterprise model');
      }

      // Return the updated model in our format
      // return {
      //   ...currentModel.data,
      //   ...updatedFields,
      //   id: modelId,
      //   tags: ['Enterprise', ...(updatedFields.tags || currentModel.data.tags || [])],
      //   enabled: true,
      //   isCustomLLM: true,
      // };

      return {
        ...result.data,
        ...updatedFields,
        id: modelId,
        tags: ['Enterprise', ...(updatedFields.tags || [])],
        enabled: true,
        isCustomLLM: true,
      };
    } catch (error) {
      console.error('Error updating enterprise model:', error);
      throw new Error(error.error || error.message || 'Failed to update enterprise model');
    }
  },

  // get info of a single model
  getEnterpriseModel: async (modelId: string): Promise<EnterpriseModel> => {
    try {
      const response = await fetch(`/api/page/vault/custom-llm/${modelId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch enterprise model');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch enterprise model');
      }

      // Convert the response to our EnterpriseModel format
      return {
        id: result.data.id,
        name: result.data.name,
        modelName: result.data.settings?.foundationModel,
        provider: result.data.provider,
        contextWindowSize: result.data.tokens || 0,
        completionTokens: result.data.completionTokens || 0,
        features: result.data.features || [],
        tags: result.data.tags || [],
        enabled: true,
        isCustomLLM: true,
        settings: result.data.settings,
      };
    } catch (error) {
      console.error('Error fetching enterprise model:', error);
      throw new Error(error.error || error.message || 'Failed to fetch enterprise model');
    }
  },

  deleteEnterpriseModel: async (modelId: string, provider: string): Promise<void> => {
    try {
      const response = await fetch(`/api/page/vault/custom-llm/${provider}/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete enterprise model');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete enterprise model');
      }
    } catch (error) {
      console.error('Error deleting enterprise model:', error);
      throw new Error(error.error || error.message || 'Failed to delete enterprise model');
    }
  },
  getTokenTag: (contextWindow: number) => {
    if (!contextWindow) return '';

    if (contextWindow >= 1000000) {
      return `${Math.floor(contextWindow / 1000000)}M`;
    } else {
      return `${Math.floor(contextWindow / 1000)}K`;
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

const globalModelKeyNameMap = {
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

interface CustomModel {
  llm: string;
  label: string;
  tokens: number;
  completionTokens: number;
  supportsSystemPrompt: boolean;
  supportsStreamingToolUse?: boolean;
  components?: string[];
  tags?: string[];
}

export const providerService = {
  providers: CUSTOM_LLM_PROVIDERS.map((provider) => ({
    id: provider.value,
    name: provider.text,
    models: Object.entries(customModels)
      .filter(([_, model]) => (model as CustomModel).llm === provider.value)
      .map(([id, model]: [string, CustomModel]) => ({
        id,
        llm: model.llm,
        label: model.label,
        tokens: model.tokens,
        tags: model.tags || [],
        components: model.components || [],
        completionTokens: model.completionTokens,
        supportsSystemPrompt: model.supportsSystemPrompt,
        supportsStreamingToolUse: model.supportsStreamingToolUse || false,
      })),
    regions: CUSTOM_LLM_REGIONS[provider.value] || [],
  })),

  getProviders: async (): Promise<Provider[]> => {
    return providerService.providers;
  },

  getProviderOptions: async (providerId: string): Promise<Provider | null> => {
    return providerService.providers.find((p) => p.id === providerId) || null;
  },
};
