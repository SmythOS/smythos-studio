import { UserModel } from '@react/features/vault/types/types';
import { copyTextToClipboard } from '@react/shared/utils/general';
import { Button } from '@src/react/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { TextArea } from '@src/react/shared/components/ui/newDesign/textarea';
import { errorToast, successToast } from '@src/shared/components/toast';
import { GLOBAL_VAULT_KEYS, SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { Check, Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useVault } from '../hooks/use-vault';
import { UpgradeModal } from './upgrade-modal';

interface SetupModalProps {
  isOpen: boolean;
  isEdit: boolean;
  model: UserModel;
  onClose: () => void;
  existingKey?: string;
}

// First, let's add validation rules and error messages
const validationRules = {
  apiKey: { required: true, maxLength: 10000 },
};

const errorMessages = {
  apiKey: 'API key is required and must be less than 10000 characters.',
};

function SetupModal({ isOpen, onClose, model, existingKey, isEdit }: SetupModalProps) {
  const [apiKey, setApiKey] = useState(existingKey || '');
  const [apiKeyError, setApiKeyError] = useState('');
  const { useAddUserModelKey, useUpdateUserModelKey } = useVault();
  const { mutate: addUserModelKey, isLoading } = useAddUserModelKey();

  const validateApiKey = (value: string, isSubmitting = false): boolean => {
    // Clear previous error
    setApiKeyError('');

    // Check required - only when submitting
    if (isSubmitting && !value.trim()) {
      setApiKeyError(errorMessages.apiKey);
      return false;
    }

    // Check max length - always
    if (value.length > validationRules.apiKey.maxLength) {
      setApiKeyError(errorMessages.apiKey);
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    // Validate with the submitting flag set to true
    if (!validateApiKey(apiKey, true)) {
      return;
    }

    addUserModelKey(
      { modelId: model.id, keyName: model.name, apiKey: apiKey.trim() },
      {
        onSuccess: () => {
          successToast(`API key ${isEdit ? 'updated' : 'added'} successfully`);
          onClose();
        },
        onError: () => {
          errorToast(`Failed to ${isEdit ? 'update' : 'add'} API key`);
        },
      },
    );
  };

  // Check if the Save button should be disabled
  const isSaveDisabled = isLoading || !!apiKeyError || (!isEdit && !apiKey.trim());

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          // Just close without validation
          setApiKeyError('');
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Update API Key for' : 'Setup API Key for'} {model.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-4">
            <TextArea
              label="API Key"
              id="apiKey"
              value={apiKey}
              placeholder="Enter your API key"
              onChange={(e) => {
                setApiKey(e.target.value);
                // Validate length on every change, but not emptiness
                validateApiKey(e.target.value, false);
              }}
              className="min-h-[80px]"
              error={!!apiKeyError}
              errorMessage={apiKeyError}
              fullWidth
            />
          </div>
        </div>
        <DialogFooter>
          <CustomButton
            handleClick={handleSubmit}
            disabled={isSaveDisabled}
            variant="tertiary"
            label={isLoading ? 'Saving...' : 'Save changes'}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DeleteUserModelKeyDialog = ({
  isOpen,
  apiKey,
  onClose,
}: {
  isOpen: boolean;
  apiKey: string;
  onClose: () => void;
}) => {
  const { useDeleteUserModelKey } = useVault();
  const { mutate: deleteKey, isLoading } = useDeleteUserModelKey();

  const handleDelete = async () => {
    deleteKey(
      { modelId: apiKey },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          console.error('Failed to delete API key:', error);
        },
      },
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isLoading) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. This will permanently delete the API key.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <CustomButton
            handleClick={onClose}
            disabled={isLoading}
            variant="secondary"
            label="Cancel"
          />
          <CustomButton
            handleClick={handleDelete}
            disabled={isLoading}
            isDelete
            label={isLoading ? 'Deleting...' : 'Delete'}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function UserModels({ pageAccess }: { pageAccess: { write: boolean } }) {
  const { useUserModels } = useVault();
  const { data: models, isLoading, error } = useUserModels();

  const [modalState, setModalState] = useState<{
    type: 'setup' | 'edit' | 'delete' | 'upgrade' | null;
    model: UserModel | null;
  }>({
    type: null,
    model: null,
  });

  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleCopy = async (apiKey: string) => {
    try {
      await copyTextToClipboard(apiKey);
      setCopiedKeyId(apiKey);
      setTimeout(() => {
        setCopiedKeyId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !models) {
    return <div>Error: {error?.message || 'Failed to load AI models'}</div>;
  }

  const handleModalSetupClose = () => {
    setModalState({ type: null, model: null });
    // addUserModelKey({ modelId: modalState.model?.id || '', apiKey: modalState.model?.apiKey || '' });
  };

  const handleModalUpdateClose = () => {
    setModalState({ type: null, model: null });
  };

  const handleModalDeleteClose = () => {
    setModalState({ type: null, model: null });
  };

  return (
    <div className="rounded-lg bg-card text-card-foreground border border-solid border-gray-200 shadow-sm">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Your Own AI Models</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Bring and maintain your own AI models. See{' '}
          <a
            href={`${SMYTHOS_DOCS_URL}/agent-studio/key-concepts/vault#custom-ai-model-configuration`}
            target="_blank"
            className="underline"
          >
            documentation
          </a>
          .
        </p>
        <div className="space-y-4">
          {Object.entries(GLOBAL_VAULT_KEYS).map(([key, value]) => {
            const model = models.find((m) => m.id.toLowerCase().includes(key.toLowerCase()));
            const hasKey = Boolean(model?.apiKey);

            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 items-center rounded-md bg-[#c0daff] px-2 text-xs font-medium text-[#235192]">
                    Personal
                  </span>
                  <img
                    src={`/img/provider_${key.toLowerCase()}.svg`}
                    alt={`${value?.['name']} icon`}
                    className="h-5 w-5"
                  />
                  <span>{value?.['name']}</span>
                </div>
                {hasKey ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(model?.apiKey || '')}
                    >
                      {copiedKeyId === model?.apiKey ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {pageAccess?.write && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setModalState({
                            type: 'edit',
                            model: {
                              id: key,
                              apiKey: model?.apiKey || '',
                              icon: key.toLowerCase(),
                              name: value?.['name'],
                            },
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {pageAccess?.write && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setModalState({
                            type: 'delete',
                            model,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                ) : (
                  pageAccess?.write && (
                    <CustomButton
                      variant="secondary"
                      handleClick={() =>
                        setModalState({
                          type: pageAccess?.write ? 'setup' : 'upgrade',
                          model: {
                            id: key,
                            apiKey: '',
                            icon: key.toLowerCase(),
                            name: value?.['name'],
                          },
                        })
                      }
                      label={pageAccess?.write ? 'Setup' : 'Upgrade Plan'}
                      dataAttributes={{
                        'data-qa': pageAccess?.write ? `${key}-setup-own-model-button` : '',
                      }}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Consolidated modal rendering */}
      {modalState.type === 'setup' && modalState.model && (
        <SetupModal
          isOpen={true}
          isEdit={false}
          onClose={handleModalSetupClose}
          model={modalState.model}
        />
      )}

      {modalState.type === 'edit' && modalState.model && (
        <SetupModal
          isOpen={true}
          isEdit={true}
          onClose={handleModalUpdateClose}
          model={modalState.model}
          existingKey={modalState.model.apiKey}
        />
      )}

      {modalState.type === 'delete' && modalState.model && (
        <DeleteUserModelKeyDialog
          isOpen={true}
          apiKey={modalState.model.id}
          onClose={handleModalDeleteClose}
        />
      )}

      <UpgradeModal
        isOpen={modalState.type === 'upgrade'}
        onClose={() => setModalState({ type: null, model: null })}
      />
    </div>
  );
}
