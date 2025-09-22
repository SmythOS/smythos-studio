import { ApiKey } from '@react/features/vault/types/types';
import ConfirmModal from '@react/shared/components/ui/modals/ConfirmModal';
import { cn, copyTextToClipboard } from '@react/shared/utils/general';
import { scopeOptions } from '@src/react/features/vault/helpers/vault.helper';
import { Button } from '@src/react/shared/components/ui/button';
import { Checkbox } from '@src/react/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Input } from '@src/react/shared/components/ui/input';
import { Label } from '@src/react/shared/components/ui/label';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { TextArea } from '@src/react/shared/components/ui/newDesign/textarea';
import { errorToast, successToast } from '@src/shared/components/toast';
import classNames from 'classnames';
import { Tooltip } from 'flowbite-react';
import { Check, Copy, Info, Pencil, Trash2 } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { FaCircleExclamation } from 'react-icons/fa6';
import { useVault } from '../hooks/use-vault';

interface DeleteApiKeyDialogProps {
  apiKey: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteApiKeyDialog: FC<DeleteApiKeyDialogProps> = ({ isOpen, apiKey, onClose }) => {
  const { useDeleteKey } = useVault();
  const { mutate: deleteKey, isLoading } = useDeleteKey(
    apiKey,
    () => {
      successToast('The API key has been deleted successfully');
      onClose();
    },
    () => {
      errorToast('Failed to delete API key');
    },
  );

  const handleDelete = async () => {
    deleteKey();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ConfirmModal
      onClose={onClose}
      label={isLoading ? 'Deleting...' : 'Delete'}
      handleConfirm={handleDelete}
      message="Are you sure?"
      lowMsg="This action cannot be undone. This will permanently delete the API key."
      isLoading={isLoading}
      width="max-w-[600px] w-[calc(100vw_-_-20px)]"
      confirmBtnClasses="bg-red-600 hover:bg-red-700 text-white"
    />
  );
};

interface UpdateApiKeyDialogProps {
  apiKey: ApiKey | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'edit' | 'add';
}

const validationRules = {
  key: { required: true, maxLength: 10000 },
  keyName: {
    required: true,
    maxLength: 300,
    pattern: /^[a-zA-Z0-9\s_()-@.]+$/,
  },
  scope: { required: true },
};

const errorMessages = {
  key: 'Key is required and must be less than 10000 characters.',
  keyName:
    'Name is required, must be less than 300 characters, and can only contain letters, numbers, spaces, and the following special characters: _()-@.',
  scope: 'At least one scope must be selected.',
};

export const UpdateApiKeyDialog: FC<UpdateApiKeyDialogProps> = ({
  isOpen,
  apiKey,
  onClose,
  mode,
}) => {
  const { useUpdateKey, useAddKey } = useVault();
  const [formData, setFormData] = useState({
    key: apiKey?.key || '',
    keyName: apiKey?.name || '',
    scope: apiKey?.scope || [],
  });

  const [errors, setErrors] = useState({
    key: '',
    keyName: '',
    scope: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        key: apiKey?.key || '',
        keyName: apiKey?.name || '',
        scope: apiKey?.scope || [],
      });
      // Clear errors when dialog opens
      setErrors({
        key: '',
        keyName: '',
        scope: '',
      });
    }
  }, [isOpen, apiKey]);

  const validateField = (field: string, value: string | string[]) => {
    let error = '';

    if (field === 'keyName') {
      if (!value) {
        error = 'Name is required';
      } else if (typeof value === 'string') {
        if (value.length > validationRules.keyName.maxLength) {
          error = `Name must be less than ${validationRules.keyName.maxLength} characters`;
        } else if (!validationRules.keyName.pattern.test(value)) {
          error = errorMessages.keyName;
        }
      }
    }

    if (field === 'key') {
      if (!value) {
        error = 'Key is required';
      } else if (typeof value === 'string' && value.length > validationRules.key.maxLength) {
        error = errorMessages.key;
      }
    }

    if (field === 'scope') {
      if (Array.isArray(value) && value.length === 0) {
        error = errorMessages.scope;
      }
    }

    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));

    return !error;
  };

  const validateForm = () => {
    const keyNameValid = validateField('keyName', formData.keyName);
    const keyValid = validateField('key', formData.key);
    const scopeValid = validateField('scope', formData.scope);

    return keyNameValid && keyValid && scopeValid;
  };

  const { mutate: updateKey, isLoading: isUpdateLoading } = useUpdateKey(
    () => {
      successToast('The API key has been updated successfully');
      onClose();
    },
    (error) => {
      errorToast(error.message || 'Failed to update API key');
    },
  );

  const { mutate: addKey, isLoading: isAddLoading } = useAddKey(
    () => {
      successToast('The API key has been added successfully');
      onClose();
    },
    (error) => {
      errorToast(error.message || 'Failed to add API key');
    },
  );

  const isLoading = mode === 'edit' ? isUpdateLoading : isAddLoading;

  const handleInputChange = (field: 'keyName' | 'key', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    validateField(field, value);
  };

  const handleScopeChange = (scope: string, checked: boolean) => {
    const newScope = checked
      ? [...formData.scope, scope]
      : formData.scope.filter((s) => s !== scope);

    setFormData((prev) => ({
      ...prev,
      scope: newScope,
    }));
    validateField('scope', newScope);
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    if (mode === 'edit' && apiKey) {
      updateKey({
        keyId: apiKey.id,
        updatedFields: {
          key: formData.key,
          scope: formData.scope,
          keyName: formData.keyName,
        },
      });
    } else {
      addKey({
        key: formData.key,
        scope: formData.scope,
        name: formData.keyName,
      });
    }
  };

  const isFormValid = () => {
    return (
      formData.keyName.trim() !== '' &&
      formData.key.trim() !== '' &&
      formData.scope.length > 0 &&
      !errors.keyName &&
      !errors.key &&
      !errors.scope
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
          <DialogTitle className="text-xl text-[#1E1E1E]">
            {mode === 'edit' ? 'Edit API Key' : 'Add API Key'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 pb-4">
          <div>
            <Label
              htmlFor="name"
              className="text-left text-base font-normal min-w-[50px] max-w-[50px] text-[#1E1E1E]"
            >
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="keyName"
              value={formData.keyName}
              onChange={(e) => handleInputChange('keyName', e.target.value)}
              fullWidth
              error={!!errors.keyName}
              errorMessage={errors.keyName}
              placeholder="API Key Name"
              className="mt-2"
            />
          </div>
          <div>
            <Label
              htmlFor="key"
              className="text-left mb-2 text-base font-normal min-w-[50px] max-w-[50px] text-[#1E1E1E]"
            >
              Key <span className="text-red-500">*</span>
            </Label>

            <TextArea
              id="key"
              value={formData.key}
              onChange={(e) => handleInputChange('key', e.target.value)}
              className={cn('min-h-[60px]', 'mt-2')}
              error={!!errors.key}
              errorMessage={errors.key}
              fullWidth
              placeholder="Add Key"
            />
          </div>
          <div>
            <Label className="text-left text-base font-normal text-[#1E1E1E]">
              Scope <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-col gap-4 mt-3 ml-2">
              {scopeOptions.map((scope) => (
                <div
                  key={scope.value}
                  className={classNames('flex items-center space-x-2')}
                  style={{
                    order:
                      scope.value == 'APICall'
                        ? 3
                        : scope.value == 'HuggingFace'
                          ? 2
                          : scope.value == 'ZapierAction'
                            ? 4
                            : 1,
                  }}
                >
                  <Checkbox
                    id={`edit-${scope.value}`}
                    checked={formData.scope.includes(scope.value)}
                    onCheckedChange={(checked) =>
                      handleScopeChange(scope.value, checked as boolean)
                    }
                    className="data-[state=checked]:bg-[#3C89F9] data-[state=checked]:border-[#3C89F9] data-[state=checked]:text-[#FFFF] shadow-none"
                  />
                  <Label
                    htmlFor={`edit-${scope.value}`}
                    className={cn('text-[#1E1E1E]', 'font-normal')}
                  >
                    {scope.label}
                  </Label>
                </div>
              ))}
            </div>
            {errors.scope && (
              <div className="flex items-start mt-4">
                <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
                <p className="text-[12px] text-red-500 font-normal">{errors.scope}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <CustomButton
            variant="secondary"
            handleClick={onClose}
            disabled={isLoading}
            label="Cancel"
            className="hidden"
          />
          <CustomButton
            handleClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
            label={isLoading ? 'Saving...' : 'Save'}
            className={cn('w-[100px]', 'rounded-lg')}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function ApiKeys({ pageAccess }: { pageAccess: { write: boolean } }) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const { useApiKeys } = useVault();

  const { data } = useApiKeys();

  const handleCopy = async (key: string, keyId: string) => {
    try {
      await copyTextToClipboard(key);
      setCopiedKeyId(keyId);
      setTimeout(() => {
        setCopiedKeyId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setSelectedKey(null);
  };

  const handleAddClose = () => {
    setAddModalOpen(false);
    setSelectedKey(null);
  };

  return (
    <div className="rounded-lg bg-card text-card-foreground border border-solid border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 pr-2 flex-wrap">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            API Keys
            <Tooltip
              className="w-72 text-center"
              content="Add API keys by providing a token (up to 10,000 characters), a unique name, and selecting a scope: All, API Call, Hugging Face, or Zapier Action."
            >
              <Info className="w-4 h-4" />
            </Tooltip>
          </h2>
          {pageAccess?.write && (
            <CustomButton
              variant="tertiary"
              handleClick={() => setAddModalOpen(true)}
              label="Add Key"
              addIcon
              Icon={<FaPlus className="inline mr-1" />}
            />
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm text-left table-fixed">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pr-4 py-2 w-1/6">Name</th>
                <th className="px-4 py-2 w-1/6">Owner</th>
                <th className="px-4 py-2 w-1/6">Scope</th>
                <th className="px-4 py-2 w-1/6">Key</th>
                <th className="px-4 py-2 w-1/3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {data?.keys?.length ? (
                data.keys.map((key, index) => (
                  <tr key={index} className="border-t">
                    <td className="pr-4 py-2 truncate">{key.name}</td>
                    <td className="px-4 py-2 truncate">{key.owner}</td>
                    <td className="px-4 py-2 truncate">{key.scope?.join(', ')}</td>
                    <td className="px-4 py-2 truncate">
                      <span className="font-mono">•••••••••••</span>
                    </td>
                    <td className="pl-4 py-2">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(key.key, key.id)}
                        >
                          {copiedKeyId === key.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {pageAccess?.write && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={key.scope?.includes('CUSTOM_LLM')}
                            onClick={() => {
                              setSelectedKey(key);
                              setEditModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {pageAccess?.write && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={key.scope?.includes('CUSTOM_LLM')}
                            onClick={() => {
                              setSelectedKey(key);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 hover:text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t">
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No API keys found. Add your first key to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <UpdateApiKeyDialog
        isOpen={editModalOpen}
        onClose={handleEditClose}
        apiKey={selectedKey}
        mode="edit"
      />
      <UpdateApiKeyDialog isOpen={addModalOpen} onClose={handleAddClose} apiKey={null} mode="add" />
      <DeleteApiKeyDialog
        isOpen={deleteModalOpen}
        apiKey={selectedKey?.id || ''}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedKey(null);
        }}
      />
    </div>
  );
}
