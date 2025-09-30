import type {
  ApiKey,
  ApiKeysResponse,
  EnterpriseModel,
  LocalModel,
  UserModel,
} from '@react/features/vault/types/types';
import {
  apiKeyService,
  enterpriseModelService,
  localModelService,
  recommendedModelsService,
  userModelService,
  vaultService,
} from '@react/features/vault/vault-business-logic';
import { hasCustomLLMAccess } from '@src/builder-ui/helpers/customLLM.helper';
import { queryClient } from '@src/react/shared/query-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

export function useVault() {
  const [enterpriseModels, setEnterpriseModels] = useState<EnterpriseModel[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize all services
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [entModels, keysData] = await Promise.all([
        enterpriseModelService.getEnterpriseModels(),
        apiKeyService.fetchAPIKeys(),
      ]);

      setEnterpriseModels(entModels);
      setApiKeys(keysData.keys || []);
    } catch (error) {
      console.error(
        'Failed to fetch vault data:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      // Set default empty states
      setEnterpriseModels([]);
      setApiKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export vault structure
  const exportVault = useCallback(async () => {
    try {
      const structure = await vaultService.exportVaultStructure();
      return structure;
    } catch (error) {
      console.error(
        'Failed to export vault structure:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error; // Re-throw to handle in the UI
    }
  }, []);

  const deleteKey = async (keyId: string) => {
    try {
      await apiKeyService.deleteApiKey(keyId);
      setApiKeys((prev) => prev.filter((key) => key.key !== keyId));
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const useUserModels = (options = {}) => {
    return useQuery<UserModel[], Error>({
      queryKey: ['get_vault_user_models'],
      queryFn: () => userModelService.fetchUserModels(),
      ...options,
    });
  };

  const useAddUserModelKey = () => {
    return useMutation<
      { error?: string } | Omit<ApiKey, 'id' | 'owner'>,
      Error,
      { modelId: string; keyName: string; apiKey: string }
    >({
      mutationFn: ({ modelId, keyName, apiKey }) =>
        userModelService.addUserModelKey(modelId, keyName, apiKey),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['get_vault_user_models'] });
      },
    });
  };

  const useUpdateUserModelKey = () => {
    return useMutation<
      { error?: string } | Omit<ApiKey, 'id' | 'owner'>,
      Error,
      { modelId: string; keyName: string; apiKey: string }
    >({
      mutationFn: ({ modelId, keyName, apiKey }) =>
        userModelService.updateUserModelKey(modelId, keyName, apiKey),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['get_vault_user_models'] });
      },
    });
  };

  const useDeleteUserModelKey = () => {
    return useMutation<
      { error?: string } | Omit<ApiKey, 'id' | 'owner'>,
      Error,
      { modelId: string }
    >({
      mutationFn: ({ modelId }) => userModelService.deleteUserModelKey(modelId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['get_vault_user_models'] });
      },
    });
  };

  const useApiKeys = (options = {}) => {
    return useQuery<ApiKeysResponse, Error>({
      queryKey: ['get_vault_api_keys'],
      queryFn: () => apiKeyService.fetchAPIKeys(),
      ...options,
    });
  };

  const useAddKey = (onSuccess: () => void, onError: (error: Error) => void) => {
    return useMutation<
      { error?: string } | Omit<ApiKey, 'id' | 'owner'>,
      Error,
      Omit<ApiKey, 'id' | 'owner'>
    >({
      mutationFn: (keyDetails: Omit<ApiKey, 'id' | 'owner'>) => apiKeyService.addApiKey(keyDetails),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['get_vault_api_keys'] });
        onSuccess();
      },
      onError: (error: Error) => {
        onError(error);
      },
    });
  };

  const useUpdateKey = (onSuccess: () => void, onError: (error: Error) => void) => {
    return useMutation<
      { error?: string | null },
      Error,
      {
        keyId: string;
        updatedFields: Partial<ApiKey> & { keyName: string };
      }
    >({
      mutationFn: ({
        keyId,
        updatedFields,
      }: {
        keyId: string;
        updatedFields: Partial<ApiKey> & { keyName: string };
      }) => apiKeyService.updateApiKey(keyId, updatedFields),
      onSuccess: () => {
        queryClient.invalidateQueries(['get_vault_api_keys']);
        onSuccess();
      },
      onError: (error: Error) => {
        onError(error);
      },
    });
  };

  const useDeleteKey = (keyId: string, onSuccess: () => void, onError: () => void) => {
    return useMutation<ApiKeysResponse, Error>({
      mutationFn: () => apiKeyService.deleteApiKey(keyId),
      onSuccess: () => {
        queryClient.invalidateQueries(['get_vault_api_keys']);
        onSuccess();
      },
      onError: () => {
        onError();
      },
    });
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    enterpriseModels,
    apiKeys,
    isLoading,
    exportVault,
    deleteKey,
    useUserModels,
    useApiKeys,
    useDeleteKey,
    useUpdateKey,
    useAddKey,
    useAddUserModelKey,
    useUpdateUserModelKey,
    useDeleteUserModelKey,
  };
}

// Query keys
const QUERY_KEYS = {
  ENTERPRISE_MODELS: ['enterpriseModels'],
  CAN_USE_ENTERPRISE_MODELS: ['canUseEnterpriseModels'],
} as const;

export function useEnterpriseModels() {
  return useQuery({
    queryKey: QUERY_KEYS.ENTERPRISE_MODELS,
    queryFn: () => enterpriseModelService.getEnterpriseModels(),
  });
}

export function useCanUseEnterpriseModels() {
  return useQuery({
    queryFn: () => hasCustomLLMAccess(),
    queryKey: QUERY_KEYS.CAN_USE_ENTERPRISE_MODELS,
  });
}

export function useCreateEnterpriseModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modelDetails: Omit<EnterpriseModel, 'id'>) =>
      enterpriseModelService.createEnterpriseModel(modelDetails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTERPRISE_MODELS });
    },
  });
}

export function useUpdateEnterpriseModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      modelId,
      updatedFields,
    }: {
      modelId: string;
      updatedFields: Partial<EnterpriseModel>;
    }) => enterpriseModelService.updateEnterpriseModel(modelId, updatedFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTERPRISE_MODELS });
    },
  });
}

export function useDeleteEnterpriseModel() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { modelId: string; provider: string }>({
    mutationFn: ({ modelId, provider }) =>
      enterpriseModelService.deleteEnterpriseModel(modelId, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTERPRISE_MODELS });
    },
  });
}

export function useRecommendedModels() {
  return useQuery({
    queryKey: ['recommendedModels'],
    queryFn: () => recommendedModelsService.getRecommendedModels(),
  });
}

export function useUpdateRecommendedModel() {
  return useMutation({
    mutationFn: ({ providerId, enabled }: { providerId: string; enabled: boolean }) =>
      recommendedModelsService.updateRecommendedModels(providerId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendedModels'] });
    },
  });
}

// Local Model Hooks
const LOCAL_MODEL_QUERY_KEYS = {
  LOCAL_MODELS: ['localModels'],
} as const;

export function useLocalModels() {
  return useQuery({
    queryKey: LOCAL_MODEL_QUERY_KEYS.LOCAL_MODELS,
    queryFn: () => localModelService.getLocalModels(),
  });
}

export function useCreateLocalModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modelDetails: Omit<LocalModel, 'id'>) =>
      localModelService.createLocalModel(modelDetails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCAL_MODEL_QUERY_KEYS.LOCAL_MODELS });
    },
  });
}

export function useUpdateLocalModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      modelId,
      updatedFields,
    }: {
      modelId: string;
      updatedFields: Partial<LocalModel>;
    }) => localModelService.updateLocalModel(modelId, updatedFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCAL_MODEL_QUERY_KEYS.LOCAL_MODELS });
    },
  });
}

export function useDeleteLocalModel() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { modelId: string }>({
    mutationFn: ({ modelId }) => localModelService.deleteLocalModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCAL_MODEL_QUERY_KEYS.LOCAL_MODELS });
    },
  });
}
