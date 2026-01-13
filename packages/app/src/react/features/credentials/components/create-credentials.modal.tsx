/**
 * CreateCredentialsModal Component
 *
 * A two-step modal for creating and editing credentials:
 * - Step 1: Select provider from dropdown
 * - Step 2: Fill in dynamic form based on provider's schema
 *
 * @component
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
import { TextArea } from '@src/react/shared/components/ui/newDesign/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/react/shared/components/ui/select';
import React, { useEffect, useMemo, useState } from 'react';
import { credentialsClient } from '../clients/credentials.client';
import credentialsSchema from '../credentials-schema.json';
import { parseCredsShemaPlaceholders } from '../utils';
import { CredentialFormSkeleton } from './credential-form-skeleton';
import { PasswordInput } from './password-input';

/**
 * Field schema definition from credentials-schema.json
 */
interface CredentialField {
  key: string;
  label: string;
  type: 'string' | 'password' | 'number' | 'email' | 'url' | 'textarea';
  required: boolean;
  placeholder?: string;
  default?: string;
}

/**
 * Provider schema definition
 */
interface ProviderSchema {
  id: string;
  name: string;
  group: string;
  auth_type: string;
  description: string;
  logo_url?: string;
  fields: CredentialField[];
  docs_url?: string;
  test_endpoint?: string;

  metadata?: {
    requires_callback?: boolean;
    callback_path?: string;
  };
}

/**
 * Credential connection (for edit mode)
 */
export interface CredentialConnection {
  id: string;
  name: string;
  provider: string;
  group: string;
  credentials: Record<string, string>;
  isActive?: boolean;
  isReadOnly?: boolean;
  isManaged?: boolean;
  customProperties?: Record<string, any>;
}

/**
 * Props for CreateCredentialsModal
 */
interface CreateCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;

  onSuccess?: (data: {
    id?: string;
    name: string;
    provider: string;
    credentials: Record<string, string>;
    isEdit: boolean;
  }) => void;
  group: string;
  editConnection?: CredentialConnection;
}

/**
 * Validates a field value based on its type and requirements
 */
const validateField = (field: CredentialField, value: string): string | null => {
  // Check required fields
  if (field.required && (!value || value.trim() === '')) {
    return `${field.label} is required`;
  }

  // Skip type validation if field is not required and empty
  if (!value || value.trim() === '') {
    return null;
  }

  // Type-specific validation
  switch (field.type) {
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${field.label} must be a valid email address`;
      }
      break;
    }
    case 'url': {
      try {
        new URL(value);
      } catch {
        return `${field.label} must be a valid URL`;
      }
      break;
    }
    case 'number': {
      if (isNaN(Number(value))) {
        return `${field.label} must be a valid number`;
      }
      break;
    }
  }

  return null;
};

/**
 * CreateCredentialsModal Component
 */
export function CreateCredentialsModal({
  isOpen,
  onClose,
  onSuccess,
  group,
  editConnection,
}: CreateCredentialsModalProps) {
  // Step management (1 = select provider, 2 = fill form)
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [connectionName, setConnectionName] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isResolvingVaultKeys, setIsResolvingVaultKeys] = useState<boolean>(false);

  // Determine if in edit mode
  const isEditMode = !!editConnection;

  // Filter providers by group
  const availableProviders = useMemo(() => {
    return (credentialsSchema as ProviderSchema[]).filter((provider) => provider.group === group);
  }, [group]);

  // Get selected provider schema
  const selectedProvider = useMemo(() => {
    return availableProviders.find((p) => p.id === selectedProviderId);
  }, [availableProviders, selectedProviderId]);

  /**
   * Initialize form data when opening in edit mode
   * Resolves vault keys to show actual values
   */
  useEffect(() => {
    const loadConnectionData = async () => {
      if (isOpen) {
        if (isEditMode && editConnection) {
          // Edit mode: resolve vault keys and populate form
          setIsResolvingVaultKeys(true);

          try {
            // Fetch credential with resolved vault keys
            const resolvedCredential = await credentialsClient.fetchCredentialForEdit(
              editConnection.id,
              group,
            );

            setConnectionName(resolvedCredential.name);
            setSelectedProviderId(resolvedCredential.provider);
            setCredentials(resolvedCredential.credentials);
            setStep(2); // Go directly to form step
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading credential for edit:', error);
            // Fallback to unresolved data
            setConnectionName(editConnection.name);
            setSelectedProviderId(editConnection.provider);
            setCredentials(editConnection.credentials);
            setStep(2);
          } finally {
            setIsResolvingVaultKeys(false);
          }
        } else {
          // Create mode: reset form
          setConnectionName('');
          setSelectedProviderId('');
          setCredentials({});
          setStep(1);
          setIsResolvingVaultKeys(false);
        }
        // Reset validation state
        setErrors({});
        setTouched({});
      }
    };

    loadConnectionData();
  }, [isOpen, isEditMode, editConnection, group]);

  /**
   * Handle provider selection and move to step 2
   */
  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
    // Initialize credentials object with default values or empty strings
    const provider = availableProviders.find((p) => p.id === providerId);
    if (provider) {
      const initialCredentials: Record<string, string> = {};
      provider.fields.forEach((field) => {
        // Use default value if available in create mode, otherwise empty string
        initialCredentials[field.key] = field.default || '';
      });
      setCredentials(initialCredentials);
    }
    setStep(2);
  };

  /**
   * Handle going back to step 1
   */
  const handleBack = () => {
    setStep(1);
    setErrors({});
    setTouched({});
  };

  /**
   * Handle credential field change
   */
  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));

    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  /**
   * Handle field blur (mark as touched)
   */
  const handleBlur = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));

    // Validate field on blur
    if (selectedProvider) {
      const field = selectedProvider.fields.find((f) => f.key === key);
      if (field) {
        const error = validateField(field, credentials[key] || '');
        if (error) {
          setErrors((prev) => ({ ...prev, [key]: error }));
        }
      }
    }
  };

  /**
   * Validate all fields
   */
  const validateAllFields = (): boolean => {
    if (!selectedProvider) return false;

    const newErrors: Record<string, string> = {};

    // Validate connection name
    if (!connectionName.trim()) {
      newErrors.connectionName = 'Connection name is required';
    }

    // Validate credential fields
    selectedProvider.fields.forEach((field) => {
      const error = validateField(field, credentials[field.key] || '');
      if (error) {
        newErrors[field.key] = error;
      }
    });

    setErrors(newErrors);

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = { connectionName: true };
    selectedProvider.fields.forEach((field) => {
      allTouched[field.key] = true;
    });
    setTouched(allTouched);

    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      return;
    }

    if (isProcessing || !selectedProviderId) {
      return;
    }

    setIsProcessing(true);

    try {
      // Transform credentials to include sensitivity metadata based on field types
      const credentialsWithMetadata: Record<string, { value: string; sensitive: boolean }> = {};

      if (selectedProvider) {
        selectedProvider.fields.forEach((field) => {
          const value = credentials[field.key] || '';
          credentialsWithMetadata[field.key] = {
            value,
            sensitive: field.type === 'password',
          };
        });
      }

      const credentialData = {
        group,
        name: connectionName,
        provider: selectedProviderId,
        credentials: credentialsWithMetadata,
        authType: selectedProvider.auth_type,
      };

      let result;
      if (isEditMode && editConnection?.id) {
        // Update existing credential
        result = await credentialsClient.updateCredential(editConnection.id, credentialData);
      } else {
        // Create new credential
        result = await credentialsClient.createCredential(credentialData);
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess({
          ...result,
          isEdit: isEditMode,
        });
      }

      // Close modal on success
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error submitting credentials:', error);

      // Set error for connection name field to display to user
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save credential. Please try again.';
      setErrors((prev) => ({
        ...prev,
        connectionName: errorMessage,
      }));
      setTouched((prev) => ({ ...prev, connectionName: true }));
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Get input type for HTML input element
   */
  const getInputType = (fieldType: CredentialField['type']): string => {
    switch (fieldType) {
      case 'password':
        return 'password';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Credential Connection' : 'Add Credential Connection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {isResolvingVaultKeys ? (
            <CredentialFormSkeleton />
          ) : (
            <div className="grid gap-4 py-4">
              {/* Step 1: Provider Selection (only shown in create mode) */}
              {step === 1 && !isEditMode && (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-700 mb-1 text-sm font-normal flex items-center">
                      Select Provider <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Select
                      disabled={isProcessing}
                      data-qa="choose-provider"
                      value={selectedProviderId}
                      onValueChange={handleProviderSelect}
                    >
                      <SelectTrigger
                        className="w-full"
                        disabled={isProcessing || isResolvingVaultKeys}
                      >
                        <SelectValue placeholder="Choose a provider..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No providers available for this group
                          </div>
                        ) : (
                          availableProviders.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              <div className="flex items-start gap-2">
                                {provider.logo_url && (
                                  <img
                                    src={provider.logo_url}
                                    alt={provider.name}
                                    className="w-5 h-5 mt-0.5 object-contain flex-shrink-0"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium">{provider.name}</span>
                                  {provider.description && (
                                    <span className="text-xs text-muted-foreground">
                                      {provider.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 2: Dynamic Form */}
              {step === 2 && selectedProvider && (
                <div className="space-y-4">
                  {/* Connection Name */}
                  <div>
                    <Input
                      label="Connection Name"
                      required
                      fullWidth
                      placeholder="e.g., My Vector Database"
                      value={connectionName}
                      onChange={(e) => {
                        setConnectionName(e.target.value);
                        if (errors.connectionName) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.connectionName;
                            return newErrors;
                          });
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, connectionName: true }));
                        if (!connectionName.trim()) {
                          setErrors((prev) => ({
                            ...prev,
                            connectionName: 'Connection name is required',
                          }));
                        }
                      }}
                      error={touched.connectionName && !!errors.connectionName}
                      errorMessage={errors.connectionName}
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Provider Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2">
                        {selectedProvider.logo_url && (
                          <img
                            src={selectedProvider.logo_url}
                            alt={selectedProvider.name}
                            className="w-5 h-5 mt-0.5 object-contain flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedProvider.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedProvider.description}
                          </p>
                        </div>
                      </div>
                      {selectedProvider.docs_url && (
                        <a
                          href={selectedProvider.docs_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Documentation
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Fields */}
                  {selectedProvider.fields.map((field) => (
                    <div key={field.key}>
                      {field.type === 'textarea' ? (
                        <TextArea
                          label={field.label}
                          required={field.required}
                          fullWidth
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          value={credentials[field.key] || ''}
                          onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                          onBlur={() => handleBlur(field.key)}
                          error={touched[field.key] && !!errors[field.key]}
                          errorMessage={errors[field.key]}
                          disabled={isProcessing || isResolvingVaultKeys}
                          rows={3}
                          autoGrow={true}
                          maxHeight={200}
                        />
                      ) : field.type === 'password' ? (
                        <PasswordInput
                          label={field.label}
                          required={field.required}
                          fullWidth
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          value={credentials[field.key] || ''}
                          onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                          onBlur={() => handleBlur(field.key)}
                          error={touched[field.key] && !!errors[field.key]}
                          errorMessage={errors[field.key]}
                          disabled={isProcessing || isResolvingVaultKeys}
                        />
                      ) : (
                        <Input
                          label={field.label}
                          required={field.required}
                          fullWidth
                          type={getInputType(field.type)}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          value={credentials[field.key] || ''}
                          onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                          onBlur={() => handleBlur(field.key)}
                          error={touched[field.key] && !!errors[field.key]}
                          errorMessage={errors[field.key]}
                          disabled={isProcessing || isResolvingVaultKeys}
                        />
                      )}
                    </div>
                  ))}

                  {selectedProvider.metadata?.callback_path && (
                    <div>
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Callback Path: </span>
                        <span className="text-gray-500">
                          {parseCredsShemaPlaceholders(selectedProvider.metadata.callback_path)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {step === 2 && !isEditMode && (
              <CustomButton
                variant="secondary"
                type="button"
                handleClick={handleBack}
                disabled={isProcessing}
                label="Back"
              />
            )}
            <CustomButton
              variant="primary"
              type="submit"
              loading={isProcessing || isResolvingVaultKeys}
              disabled={
                isProcessing ||
                isResolvingVaultKeys ||
                (step === 1 && !selectedProviderId && !isEditMode) ||
                (step === 2 && (!connectionName.trim() || Object.keys(errors).length > 0))
              }
              label={isEditMode ? 'Save Changes' : step === 1 ? 'Continue' : 'Create Connection'}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
