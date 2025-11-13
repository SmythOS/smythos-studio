/**
 * Create Namespace Modal
 *
 * Modal for creating a new data space/namespace
 */

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Input } from '@src/react/shared/components/ui/input';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/react/shared/components/ui/select';
import { errorToast, successToast } from '@src/shared/components/toast';
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { dataPoolClient } from '../client/datapool.client';
import { useDataPoolContext } from '../contexts/data-pool.context';
import type { EmbeddingModel } from '../types';

interface CreateNamespaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateNamespaceModal: FC<CreateNamespaceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { credentials, credentialsLoading } = useDataPoolContext();
  const [name, setName] = useState('');
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [dimensions, setDimensions] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch embedding models when modal opens
  useEffect(() => {
    const fetchEmbeddingModels = async () => {
      if (isOpen && embeddingModels.length === 0) {
        setIsLoadingModels(true);
        try {
          const models = await dataPoolClient.listEmbeddingModels();
          setEmbeddingModels(models);
          // Pre-select first model if available
          if (models.length > 0) {
            setSelectedModelId(models[0].model);
          }
        } catch {
          // Silently fail - user will see empty dropdown
        } finally {
          setIsLoadingModels(false);
        }
      }
    };

    fetchEmbeddingModels();
  }, [isOpen, embeddingModels.length]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedCredentialId('');
      setDimensions('');
      setError(null);
    }
  }, [isOpen]);

  /**
   * Handle create namespace
   */
  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      setError('Please enter a name for the data space');
      return;
    }

    if (!selectedCredentialId) {
      setError('Please select a vector database provider');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Prepare embeddings config
      const embeddingsConfig = selectedModelId
        ? {
            modelId: selectedModelId,
            dimensions: dimensions ? parseInt(dimensions, 10) : undefined,
          }
        : undefined;

      await dataPoolClient.createNamespace({
        label: name.trim(),
        credentialId: selectedCredentialId,
        embeddings: embeddingsConfig,
      });

      successToast('Data space created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create data space. Please try again.';
      setError(errorMessage);
      errorToast(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle credential selection change
   */
  const handleCredentialChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCredentialId(e.target.value);
    setError(null);
  };

  /**
   * Handle name input change
   */
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  };

  const isFormValid = name.trim() !== '' && selectedCredentialId !== '' && selectedModelId !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Data Space</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Set up a Data Space to unlock your agents' ability to search, automate, and learn
            from your data — using RAG and other tools
          </p>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <div className="grid gap-4 py-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-gray-700 mb-1 text-sm font-normal flex items-center">
                Vector Database Provider <span className="text-red-500 ml-1">*</span>
              </label>
              <Select
                value={selectedCredentialId}
                onValueChange={setSelectedCredentialId}
                disabled={credentialsLoading || isCreating}
              >
                <SelectTrigger className="w-full" disabled={credentialsLoading || isCreating}>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {credentials.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No vector database connections found
                    </div>
                  ) : (
                    credentials.map((cred) => (
                      <SelectItem key={cred.id} value={cred.id}>
                        {cred.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {credentials.length === 0 && !credentialsLoading && (
                <p className="text-xs text-amber-600">
                  No vector database connections found. Please add one in the Vault page first.
                </p>
              )}
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Input
                label="Name"
                required
                fullWidth
                type="text"
                placeholder="Name your data space"
                value={name}
                onChange={handleNameChange}
                disabled={isCreating}
                error={!!error}
                errorMessage={error || undefined}
              />
            </div>

            {/* Embedding Model Selection and Dimensions - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Embedding Model Selection */}
              <div className="space-y-2">
                <label className="text-gray-700 mb-1 text-sm font-normal flex items-center">
                  Embedding Model <span className="text-red-500 ml-1">*</span>
                </label>
                <Select
                  value={selectedModelId}
                  onValueChange={setSelectedModelId}
                  disabled={isLoadingModels || isCreating}
                >
                  <SelectTrigger className="w-full" disabled={isLoadingModels || isCreating}>
                    <SelectValue placeholder="Select an embedding model" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingModels ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading models...
                      </div>
                    ) : embeddingModels.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No models available
                      </div>
                    ) : (
                      embeddingModels.map((model) => (
                        <SelectItem key={model.model} value={model.model}>
                          {model.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Dimensions Input */}
              <div className="space-y-2">
                <label className="text-gray-700 mb-1 text-sm font-normal flex items-center">
                  Vector Dimensions
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1536 (optional)"
                  value={dimensions}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDimensions(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                />
                <p className="text-xs text-gray-500">
                  Leave empty for default
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <CustomButton
              variant="secondary"
              type="button"
              label="Cancel"
              handleClick={onClose}
              disabled={isCreating}
            />
            <CustomButton
              variant="primary"
              type="submit"
              label={isCreating ? 'Creating...' : 'Create'}
              disabled={!isFormValid || isCreating || credentialsLoading || isLoadingModels}
              loading={isCreating}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

