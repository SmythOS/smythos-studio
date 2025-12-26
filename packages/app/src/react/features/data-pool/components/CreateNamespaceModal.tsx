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
import { Tooltip, TooltipContent, TooltipTrigger } from '@src/react/shared/components/ui/tooltip';
import { errorToast, successToast } from '@src/shared/components/toast';
import { Info, PlusCircle, Settings } from 'lucide-react';
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreateCredentialsModal
} from '../../credentials/components/create-credentials.modal';
import credentialsSchema from '../../credentials/credentials-schema.json';
import { dataPoolClient } from '../client/datapool.client';
import { useDataPoolContext } from '../contexts/data-pool.context';
import type { EmbeddingModel } from '../types';

interface CreateNamespaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProviderSchema {
  id: string;
  name: string;
  logo_url?: string;
}

export const CreateNamespaceModal: FC<CreateNamespaceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { credentials, credentialsLoading, getCredentialById, refetchCredentials } = useDataPoolContext();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [dimensions, setDimensions] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDimensionsReadOnly, setIsDimensionsReadOnly] = useState(false);
  // State for Create Credentials Modal
  const [isCreateCredModalOpen, setIsCreateCredModalOpen] = useState(false);

  /**
   * Get provider logo URL from schema
   */
  const getProviderLogo = (providerId: string): string | undefined => {
    const provider = (credentialsSchema as ProviderSchema[]).find((p) => p.id === providerId);
    return provider?.logo_url;
  };

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
  const handleCredentialChange = (value: string) => {
    // If "create_new" is selected, open the create credentials modal
    if (value === '__create_new__') {
      setIsCreateCredModalOpen(true);
      return;
    }
    
    // If "manage_connections" is selected, navigate to vault page
    if (value === '__manage_connections__') {
      onClose();
      navigate('/vault');
      return;
    }
    
    setSelectedCredentialId(value);
    handleDimentionDynamicChange('connection', value);
    setError(null);
  };

  const handleDimentionDynamicChange = (change: 'embedding_model' | 'connection', id: string) => {
    setIsDimensionsReadOnly(false);

    if (change === 'embedding_model') {
      // check if model is text-embedding-ada-002, then set dimensions to 1536 and read only
      if (id === 'text-embedding-ada-002') {
        setDimensions('1536');
        setIsDimensionsReadOnly(true);
      }
    }

    if (change === 'connection') {
      // check if smyth conneciton, then set dimensions to 1536 and read only
      if (id === '__smythos_vectordb_cred__') {
        setDimensions('1536');
        setIsDimensionsReadOnly(true);
      }
    }

    
    
  }; 

  /**
   * Handle successful credential creation
   */
  const handleCredentialCreated = (data: {
    id?: string;
    name: string;
    provider: string;
    credentials: Record<string, string>;
    isEdit: boolean;
  }) => {
    // Close the create credentials modal
    setIsCreateCredModalOpen(false);
    
    // Refetch credentials to get the new one
    refetchCredentials();
    
    // Auto-select the newly created credential
    if (data.id) {
      setSelectedCredentialId(data.id);
      successToast('Connection created successfully. You can now use it.');
    }
  };

  /**
   * Handle name input change
   */
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  };

  const isFormValid = name.trim() !== '' && selectedCredentialId !== '' && selectedModelId !== '' && dimensions !== '';

  return (
    <>
    <Dialog 
     open={isOpen} onOpenChange={onClose}>
      <DialogContent className={'sm:max-w-[500px] max-h-[90vh] overflow-y-auto'}>
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
                onValueChange={handleCredentialChange}
                disabled={credentialsLoading || isCreating}
              >
                <SelectTrigger className="w-full" disabled={credentialsLoading || isCreating}>
                  <SelectValue placeholder="Select a provider">
                    {selectedCredentialId && (() => {
                      const selectedCred = getCredentialById(selectedCredentialId);
                      const logo = selectedCred ? getProviderLogo(selectedCred.provider) : undefined;
                      return (
                        <div className="flex items-center gap-2">
                          {logo && (
                            <img
                              src={logo}
                              alt={selectedCred?.name || 'Provider'}
                              className="w-5 h-5 object-contain"
                            />
                          )}
                          <span>{selectedCred?.name}</span>
                          {selectedCred?.isManaged && (
                            <span className="text-xs text-gray-500">Managed</span>
                          )}
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Create New Connection Option */}
                  <SelectItem value="__create_new__">
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <PlusCircle className="w-4 h-4" />
                      <span>Create New Connection</span>
                    </div>
                  </SelectItem>
                  
                  {/* Manage Connections Option */}
                  <SelectItem value="__manage_connections__">
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                      <Settings className="w-4 h-4" />
                      <span>Manage Connections</span>
                    </div>
                  </SelectItem>
                  
                  {/* Separator */}
                  {credentials.length > 0 && (
                    <div className="border-t border-gray-200 my-1" />
                  )}
                  
                  {/* Existing Credentials */}
                  {credentials.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No connections found
                    </div>
                  ) : (
                    credentials.map((cred) => {
                      const logo = getProviderLogo(cred.provider);
                      return (
                        <SelectItem key={cred.id} value={cred.id}>
                          <div className="flex items-center gap-2">
                            {logo && (
                              <img
                                src={logo}
                                alt={cred.name}
                                className="w-5 h-5 object-contain"
                              />
                            )}
                            <span>{cred.name}</span>
                            {cred.isManaged && (
                              <span className="text-xs text-gray-500">Managed</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
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
                  onValueChange={(value) => {

                    setSelectedModelId(value);
                    handleDimentionDynamicChange('embedding_model', value);
                  }}
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
                <label className="text-gray-700  text-sm font-normal flex items-center">
                  Vector Dimensions
                  <Tooltip>
                  <TooltipTrigger asChild>
                <Info className="w-4 h-4 cursor-help ml-1" />
              </TooltipTrigger>
                        <TooltipContent side="right" className="w-[200px] text-center">
                          <p>
                            The dimension should match the one configured in your vector database provider.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1536"
                  value={dimensions}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDimensions(e.target.value)}
                  disabled={isCreating}
                  readOnly={isDimensionsReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                />
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

    {/* Create Credentials Modal */}
    <CreateCredentialsModal
    isOpen={isCreateCredModalOpen}
    onClose={() => setIsCreateCredModalOpen(false)}
    onSuccess={handleCredentialCreated}
    group="vector_db_creds"
  />
  </>
  );
};

