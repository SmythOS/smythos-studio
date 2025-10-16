import type {
  ApiKey,
  ApiKeysResponse,
  UserCustomModel,
  UserModel,
} from '@react/features/vault/types/types';
import {
  apiKeyService,
  recommendedModelsService,
  userCustomModelService,
  userModelService,
  vaultService,
} from '@react/features/vault/vault-business-logic';
import { queryClient } from '@src/react/shared/query-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

export function useVault() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize all services
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const keysData = await apiKeyService.fetchAPIKeys();
      setApiKeys(keysData.keys || []);
    } catch (error) {
      console.error(
        'Failed to fetch vault data:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      // Set default empty states
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

// User Custom Model Hooks
const USER_CUSTOM_MODEL_QUERY_KEYS = {
  USER_CUSTOM_MODELS: ['userCustomModels'],
} as const;

export function useUserCustomModels() {
  return useQuery({
    queryKey: USER_CUSTOM_MODEL_QUERY_KEYS.USER_CUSTOM_MODELS,
    queryFn: () => userCustomModelService.getUserCustomModels(),
  });
}

export function useCreateUserCustomModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modelDetails: Omit<UserCustomModel, 'id'>) =>
      userCustomModelService.createUserCustomModel(modelDetails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_CUSTOM_MODEL_QUERY_KEYS.USER_CUSTOM_MODELS });
    },
  });
}

export function useUpdateUserCustomModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      modelId,
      updatedFields,
    }: {
      modelId: string;
      updatedFields: Partial<UserCustomModel>;
    }) => userCustomModelService.updateUserCustomModel(modelId, updatedFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_CUSTOM_MODEL_QUERY_KEYS.USER_CUSTOM_MODELS });
    },
  });
}

export function useDeleteUserCustomModel() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { modelId: string }>({
    mutationFn: ({ modelId }) => userCustomModelService.deleteUserCustomModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_CUSTOM_MODEL_QUERY_KEYS.USER_CUSTOM_MODELS });
    },
  });
}
