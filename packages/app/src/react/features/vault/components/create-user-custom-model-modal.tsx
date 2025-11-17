import ToolTip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import { Checkbox } from '@src/react/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Input } from '@src/react/shared/components/ui/input';
import { Label } from '@src/react/shared/components/ui/label';
import ConfirmModal from '@src/react/shared/components/ui/modals/ConfirmModal';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/react/shared/components/ui/select';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { CUSTOM_LLM_FEATURES } from '@src/shared/constants/custom-llm.constants';
import { LLMRegistry } from '@src/shared/services/LLMRegistry.service';
import { generateKeyTemplateVar } from '@src/shared/utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { UserCustomModel } from '../types/types';
import { userCustomModelService } from '../vault-business-logic';

/**
 * SVG icon for info tooltips
 */
const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
<path d="M3 12C3 16.9699 7.02908 21 12 21C16.9709 21 21 16.9699 21 12C21 7.02908 16.9709 3 12 3C7.02908 3 3 7.02908 3 12Z" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.0057 15.6932V11.3936M12 8.35426V8.29102" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/**
 * SVG icon for showing password (eye icon)
 */
const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/**
 * SVG icon for hiding password (eye-slash icon)
 */
const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

interface CreateUserCustomModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<UserCustomModel, 'id'>) => void; // eslint-disable-line no-unused-vars
  editModel?: UserCustomModel;
  isProcessing: boolean;
}

// Get available fallback models from LLMRegistry (same as Default LLM section)
const TEMP_BADGES = {
  enterprise: true,
  smythos: true,
  personal: true,
  limited: true,
};

const getTempBadge = (tags: string[]) => {
  return tags.filter((tag) => TEMP_BADGES?.[tag?.toLowerCase()]).join(' ');
};

/**
 * Extracts the key name from a vault key template variable
 * @param templateVariable - The template variable string (e.g., "{{KEY(My API Key)}}")
 * @returns The extracted key name or empty string if not a valid template variable
 */
const extractKeyNameFromTemplate = (templateVariable: string): string => {
  const match = templateVariable?.match(/\{\{KEY\((.+?)\)\}\}/);
  return match ? match[1] : '';
};

/**
 * Transforms the base URL by removing '.forbidden' from it
 * @param url - The URL to transform
 * @returns The transformed URL with '.forbidden' removed
 */
const transformBaseURL = (url: string): string => {
  if (!url) return url;
  return url.replace(/\.forbidden/gi, '');
};

export function CreateUserCustomModelModal({
  isOpen,
  onClose,
  onSubmit,
  editModel,
  isProcessing,
}: CreateUserCustomModelModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    modelId: '',
    baseURL: '',
    provider: '',
    contextWindow: undefined as number | undefined,
    maxOutputTokens: undefined as number | undefined,
    fallbackLLM: '',
    features: ['text'],
    apiKey: '',
    apiKeyName: '',
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeyFromVault, setIsApiKeyFromVault] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  const [showApiKeyPassword, setShowApiKeyPassword] = useState(false);
  const [hasRevealedApiKey, setHasRevealedApiKey] = useState(false);
  const [hasModifiedApiKey, setHasModifiedApiKey] = useState(false);
  const [shouldRemoveApiKey, setShouldRemoveApiKey] = useState(false);
  const [openAdvanceOption, setOpenAdvanceOption] = useState(false);

  // Track if modal was just opened to distinguish from data updates
  const prevIsOpenRef = useRef(isOpen);

  const fallbackOptions = useMemo(() => {
    return LLMRegistry.getSortedModelsByFeatures('tools').map((model) => {
      let badge = getTempBadge(model.tags);
      badge = badge ? ' (' + badge + ')' : '';
      return {
        id: model.entryId,
        name: model.label + badge, // Add tags like "(Personal)" as shown in Default LLM section
      };
    });
  }, []);

  /**
   * Memoize serialized editModel to properly track deep changes
   * This ensures we detect changes in nested objects like credentials
   */
  const editModelKey = useMemo(() => {
    return JSON.stringify(editModel);
  }, [editModel]);

  /**
   * Effect to populate form data when modal opens or editModel changes
   * This ensures formData ALWAYS updates when editModel changes, including credentials
   */
  useEffect(() => {
    // Detect if modal is transitioning from closed to open
    const isModalOpening = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    // Only process when modal is open
    if (!isOpen) {
      return;
    }

    if (editModel) {
      // Extract API key info from template variable if present
      const apiKeyTemplateVariable = editModel.credentials?.apiKey || '';
      const extractedKeyName = extractKeyNameFromTemplate(apiKeyTemplateVariable);
      // If we successfully extracted a key name, it means there's a vault key
      const hasVaultKey = extractedKeyName !== '';

      // Update formData with latest editModel values
      // Only update apiKey field if it's currently empty (not revealed) or if modal is just opening
      setFormData((prev) => ({
        name: editModel.name || '',
        modelId: editModel.modelId || '',
        baseURL: editModel.baseURL || '',
        provider: editModel.provider || '',
        contextWindow: editModel.contextWindow,
        maxOutputTokens: editModel.maxOutputTokens,
        fallbackLLM: editModel.fallbackLLM || '',
        features: editModel.features || ['text'],
        // Preserve revealed apiKey if user has revealed it, otherwise clear it
        apiKey: hasRevealedApiKey && prev.apiKey ? prev.apiKey : '',
        apiKeyName: extractedKeyName,
      }));

      setIsApiKeyFromVault(hasVaultKey);

      // Only reset reveal states when modal is first opening, not on data updates
      if (isModalOpening) {
        setShowApiKey(false);
        setShowApiKeyPassword(false);
        setHasRevealedApiKey(false);
        setHasModifiedApiKey(false);
        setShouldRemoveApiKey(false);
      }
    } else {
      // Reset form for creating new model
      setFormData({
        name: '',
        modelId: '',
        baseURL: '',
        provider: '',
        contextWindow: undefined,
        maxOutputTokens: undefined,
        fallbackLLM: '',
        features: ['text'],
        apiKey: '',
        apiKeyName: '',
      });
      setIsApiKeyFromVault(false);
      setShowApiKey(false);
      setShowApiKeyPassword(false);
      setHasRevealedApiKey(false);
      setHasModifiedApiKey(false);
      setShouldRemoveApiKey(false);
    }
    // We use editModelKey instead of editModel directly to ensure deep change detection
    // editModelKey is a memoized JSON string that changes whenever editModel's properties change
    // Note: We don't include hasRevealedApiKey in dependencies to avoid re-running when user reveals key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editModelKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name?.trim() ||
      !formData.modelId?.trim() ||
      !formData.baseURL?.trim() ||
      !formData.provider?.trim()
    ) {
      return;
    }

    // Prepare the submission data
    // Apply transformer to remove '.forbidden' in case user manually entered it or it wasn't cleaned
    const cleanedBaseURL = transformBaseURL(formData.baseURL);

    const submissionData: Omit<UserCustomModel, 'id'> = {
      name: formData.name,
      modelId: formData.modelId,
      baseURL: cleanedBaseURL,
      provider: formData.provider,
      contextWindow: formData.contextWindow,
      maxOutputTokens: formData.maxOutputTokens,
      fallbackLLM: formData.fallbackLLM,
      features: formData.features,
    };

    // Handle API key credentials based on different scenarios:
    // IMPORTANT: Only update credentials when user explicitly modifies the API key
    if (shouldRemoveApiKey) {
      // User clicked "Remove Key" - set credentials to empty object to signal removal
      // The backend will handle deleting the key from vault
      submissionData.credentials = {} as typeof submissionData.credentials;
    } else if (editModel?.credentials && !hasModifiedApiKey) {
      // Scenario: Editing a model that has existing credentials, and user hasn't modified the key
      // Preserve the existing credentials (template variable) unchanged
      // This ensures we don't accidentally reset the key when updating other fields
      submissionData.credentials = editModel.credentials;
    } else if (hasModifiedApiKey || (!editModel && formData.apiKey?.trim())) {
      // Scenario 1: User has modified the API key (revealed and changed it)
      // Scenario 2: Creating new model with an API key
      // Only include credentials if there's actually a key value
      if (formData.apiKey?.trim()) {
        submissionData.credentials = {
          apiKey: formData.apiKey.trim(),
          isUserKey: true,
        };
      }
    }
    // If none of the above conditions match, credentials won't be included (undefined)
    // This means: editing a model without credentials, or creating without a key

    onSubmit(submissionData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handles API key input changes and marks it as modified
   * @param value - The new API key value
   */
  const handleApiKeyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      apiKey: value,
    }));
    // Mark the API key as modified when user types in the field
    setHasModifiedApiKey(true);
  };

  /**
   * Handles numeric input changes for context window and max output tokens
   * @param field - The field name to update
   * @param value - The string value from the input
   */
  const handleNumericInputChange = (field: string, value: string) => {
    // If empty string, set to undefined
    if (value === '') {
      setFormData((prev) => ({
        ...prev,
        [field]: undefined,
      }));
      return;
    }

    // Parse the number
    const numValue = parseInt(value, 10);

    // Only update if it's a valid number (not NaN)
    if (!isNaN(numValue)) {
      setFormData((prev) => ({
        ...prev,
        [field]: numValue,
      }));
    }
  };

  /**
   * Handles toggling of feature checkboxes
   * @param featureValue - The feature value to toggle ('text', 'tools', etc.)
   */
  const handleFeatureToggle = (featureValue: string) => {
    setFormData((prev) => {
      const currentFeatures = prev.features;
      const isCurrentlySelected = currentFeatures.includes(featureValue);

      // If feature is selected, remove it; otherwise, add it
      const newFeatures = isCurrentlySelected
        ? currentFeatures.filter((f) => f !== featureValue)
        : [...currentFeatures, featureValue];

      // Ensure at least one feature is selected; default to 'text' if none
      if (newFeatures.length === 0) {
        return {
          ...prev,
          features: ['text'],
        };
      }

      return {
        ...prev,
        features: newFeatures,
      };
    });
  };

  /**
   * Handles revealing the API key from vault
   * Fetches the decrypted API key using the key name we already have
   * If key cannot be retrieved, sets empty value allowing user to enter a new key
   */
  const handleRevealApiKey = async () => {
    if (!formData.apiKeyName) return;

    setIsLoadingApiKey(true);
    try {
      // Use the vault key name we already extracted from credentials when modal opened
      // No need to fetch the model again - we already have the key name
      const apiKey = await userCustomModelService.getVaultKeyByName(formData.apiKeyName);

      // Check if we got an actual key (not a template variable or empty string)
      // If it's a template or empty, set empty string so user can enter a new key
      const actualKey = apiKey && !apiKey.startsWith('{{KEY(') ? apiKey : '';

      setFormData((prev) => ({
        ...prev,
        apiKey: actualKey,
      }));

      setShowApiKey(true);
      setHasRevealedApiKey(true); // Mark that user has revealed the key - now it can be updated
    } catch {
      // If fetching fails, set empty value so user can enter a new key
      setFormData((prev) => ({
        ...prev,
        apiKey: '',
      }));

      setShowApiKey(true);
      setHasRevealedApiKey(true);
    } finally {
      setIsLoadingApiKey(false);
    }
  };

  /**
   * Handles removing the API key from the model
   * Sets a flag that will delete the key from vault when the form is submitted
   */
  const handleRemoveApiKey = () => {
    setShouldRemoveApiKey(true);
    // Keep isApiKeyFromVault true so we can show a proper "will be removed" message
    // Don't switch to input mode
  };

  const isFormValid =
    formData.name?.trim() &&
    formData.modelId?.trim() &&
    formData.baseURL?.trim() &&
    formData.provider?.trim();

  /**
   * Handles closing the modal and ensures state is properly reset
   */
  const handleClose = () => {
    // Reset reveal state when closing without saving
    setShowApiKey(false);
    setShowApiKeyPassword(false);
    setHasRevealedApiKey(false);
    setHasModifiedApiKey(false);
    setShouldRemoveApiKey(false);
    // Clear any revealed API key data
    if (isApiKeyFromVault) {
      setFormData((prev) => ({
        ...prev,
        apiKey: '',
      }));
    }
    onClose();
  };

  // Filter features to only show Text Completion and Function calling/Tool Use
  const userCustomModelFeatures = CUSTOM_LLM_FEATURES.filter(
    (feature) => feature.value === 'text' || feature.value === 'tools',
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isProcessing) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1E1E1E]">
              {editModel ? 'Edit Custom Model' : 'Setup Custom Model'}
            </DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden rounded-md flex-1">
          <div className="px-6 pt-4 space-y-4 overflow-y-auto h-[540px]">
            <div className="space-y-2">
              <div className="mb-2">
                <Label htmlFor="name" className="text-base font-normal mr-2 text-[#1E1E1E]">
                  Name <span className="text-red-500">*</span>
                </Label>
                <ToolTip
                  text="The name that will appear in the model dropdown list"
                  classes="w-[182px] text-center"
                  placement="right"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: infoIcon }}
                    className="w-4 h-4 text-gray-400"
                  />
                </ToolTip>
              </div>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="My Custom Model"
                fullWidth
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="mb-2">
                <Label htmlFor="modelId" className="text-base font-normal mr-2 text-[#1E1E1E]">
                  Model ID <span className="text-red-500">*</span>
                </Label>
                <ToolTip
                  text="The exact model identifier used by your LLM provider (e.g., llama-3.1-8b-instant, qwen2.5-7b-instruct-1m)"
                  classes="w-[220px] text-center"
                  placement="right"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: infoIcon }}
                    className="w-4 h-4 text-gray-400"
                  />
                </ToolTip>
              </div>
              <Input
                id="modelId"
                type="text"
                value={formData.modelId}
                onChange={(e) => handleInputChange('modelId', e.target.value)}
                placeholder="qwen2.5-7b-instruct-1m"
                fullWidth
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="mb-2">
                <Label htmlFor="baseURL" className="text-base font-normal mr-2 text-[#1E1E1E]">
                  Base URL <span className="text-red-500">*</span>
                </Label>
                <ToolTip
                  text="The API endpoint URL for your LLM service. For OpenAI compatible APIs, include `/v1` in the URL (e.g., http://127.0.0.1:1234/v1, https://openai.example.com/v1). For Ollama, use the base URL without `/v1` (e.g., http://127.0.0.1:11434)"
                  classes="w-[280px] text-center"
                  placement="right"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: infoIcon }}
                    className="w-4 h-4 text-gray-400"
                  />
                </ToolTip>
              </div>
              <Input
                id="baseURL"
                type="url"
                value={formData.baseURL}
                onChange={(e) => handleInputChange('baseURL', e.target.value)}
                placeholder="http://127.0.0.1:1234/v1"
                fullWidth
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="mb-2">
                <Label htmlFor="provider" className="text-base font-normal mr-2 text-[#1E1E1E]">
                  Provider / Compatible SDK <span className="text-red-500">*</span>
                </Label>
                <ToolTip
                  text="The SDK/API format your model uses. Select OpenAI for OpenAI-compatible APIs or Ollama for Ollama-compatible APIs"
                  classes="w-[220px] text-center"
                  placement="right"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: infoIcon }}
                    className="w-4 h-4 text-gray-400"
                  />
                </ToolTip>
              </div>
              <Select
                value={formData.provider}
                onValueChange={(value) => handleInputChange('provider', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Ollama">Ollama</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="mb-2">
                <Label htmlFor="apiKey" className="text-base font-normal mr-2 text-[#1E1E1E]">
                  API Key {isApiKeyFromVault && '(Stored in Vault)'}
                </Label>
                <ToolTip
                  text="Optional API key for your custom model. The key will be securely stored in your team vault. Leave empty if your model does not require authentication."
                  classes="w-[240px] text-center"
                  placement="right"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: infoIcon }}
                    className="w-4 h-4 text-gray-400"
                  />
                </ToolTip>
              </div>
              {shouldRemoveApiKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700 font-medium">
                        API key will be removed from vault when you save
                      </p>
                    </div>
                    <CustomButton
                      type="button"
                      variant="secondary"
                      handleClick={() => setShouldRemoveApiKey(false)}
                      className="whitespace-nowrap"
                      label="Undo"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Click &apos;Undo&apos; to cancel the removal, or &apos;
                    {editModel ? 'Update Model' : 'Create Model'}&apos; to confirm and delete the
                    key from vault.
                  </p>
                </div>
              ) : isApiKeyFromVault && !showApiKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="apiKeyName"
                      type="text"
                      value={generateKeyTemplateVar(formData.apiKeyName)}
                      disabled
                      fullWidth
                      className="w-full bg-gray-50"
                    />
                    <CustomButton
                      type="button"
                      variant="secondary"
                      handleClick={handleRevealApiKey}
                      disabled={isLoadingApiKey}
                      className="whitespace-nowrap"
                      addIcon={isLoadingApiKey}
                      Icon={isLoadingApiKey ? <Spinner size="sm" /> : undefined}
                      label={isLoadingApiKey ? 'Loading...' : 'Reveal Key'}
                    />
                    <CustomButton
                      type="button"
                      variant="secondary"
                      handleClick={handleRemoveApiKey}
                      className="whitespace-nowrap bg-red-50 text-red-600 hover:bg-red-100"
                      label="Remove Key"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    This API key is stored securely in the vault as a template variable. Click
                    &apos;Reveal Key&apos; to view or update it, or &apos;Remove Key&apos; to delete
                    it.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKeyPassword ? 'text' : 'password'}
                      value={formData.apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="sk-..."
                      fullWidth
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeyPassword(!showApiKeyPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                      aria-label={showApiKeyPassword ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKeyPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {isApiKeyFromVault && showApiKey && (
                    <p className="text-xs text-gray-500">
                      Enter a new API key to update the existing one. Changes will only be saved if
                      you modify the key.
                    </p>
                  )}
                  {!isApiKeyFromVault && formData.apiKey && (
                    <p className="text-xs text-gray-500">
                      This key will be securely stored in your team vault.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Options - Collapsible Section */}
            <div className="space-y-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setOpenAdvanceOption(!openAdvanceOption)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center">
                  <Label className="text-base font-semibold mr-2 text-[#1E1E1E] cursor-pointer">
                    Advanced Options
                  </Label>
                  <ToolTip
                    text="Configure advanced settings like context window, output limits, fallback models, and supported features"
                    classes="w-[220px] text-center"
                    placement="right"
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: infoIcon }}
                      className="w-4 h-4 text-gray-400"
                    />
                  </ToolTip>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${openAdvanceOption ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {openAdvanceOption && (
                <div className="space-y-4 pt-2 ps-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <div className="mb-2">
                      <Label
                        htmlFor="contextWindow"
                        className="text-base font-normal mr-2 text-[#1E1E1E]"
                      >
                        Context Window
                      </Label>
                      <ToolTip
                        text="The total number of tokens the model can process, including input and output"
                        classes="w-[200px] text-center"
                        placement="right"
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: infoIcon }}
                          className="w-4 h-4 text-gray-400"
                        />
                      </ToolTip>
                    </div>
                    <Input
                      id="contextWindow"
                      type="number"
                      min="2048"
                      max="2000000"
                      step="4"
                      value={
                        formData.contextWindow !== undefined ? String(formData.contextWindow) : ''
                      }
                      onChange={(e) => handleNumericInputChange('contextWindow', e.target.value)}
                      placeholder="128000"
                      fullWidth
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="mb-2">
                      <Label
                        htmlFor="maxOutputTokens"
                        className="text-base font-normal mr-2 text-[#1E1E1E]"
                      >
                        Maximum Output Tokens
                      </Label>
                      <ToolTip
                        text="The maximum number of tokens the model can generate in a single response"
                        classes="w-[200px] text-center"
                        placement="right"
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: infoIcon }}
                          className="w-4 h-4 text-gray-400"
                        />
                      </ToolTip>
                    </div>
                    <Input
                      id="maxOutputTokens"
                      type="number"
                      min="1024"
                      max="200000"
                      step="4"
                      value={
                        formData.maxOutputTokens !== undefined
                          ? String(formData.maxOutputTokens)
                          : ''
                      }
                      onChange={(e) => handleNumericInputChange('maxOutputTokens', e.target.value)}
                      placeholder="4096"
                      fullWidth
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="mb-2">
                      <Label
                        htmlFor="fallbackLLM"
                        className="text-base font-normal mr-2 text-[#1E1E1E]"
                      >
                        Fallback Model
                      </Label>
                      <ToolTip
                        text="Select a fallback model from your available models. This model will be used automatically when your custom model is unavailable"
                        classes="w-[220px] text-center"
                        placement="right"
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: infoIcon }}
                          className="w-4 h-4 text-gray-400"
                        />
                      </ToolTip>
                    </div>
                    <Select
                      value={formData.fallbackLLM}
                      onValueChange={(value) => handleInputChange('fallbackLLM', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {fallbackOptions.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="mb-2">
                      <Label className="text-base font-normal mr-2 text-[#1E1E1E]">Features</Label>
                      <ToolTip
                        text="Select the capabilities your model supports: Text Completion for generating text, and Function calling/Tool Use for executing functions"
                        classes="w-[220px] text-center"
                        placement="right"
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: infoIcon }}
                          className="w-4 h-4 text-gray-400"
                        />
                      </ToolTip>
                    </div>
                    <div className="grid grid-cols-2 gap-4 ml-2">
                      {userCustomModelFeatures.map((feature) => (
                        <div key={feature.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={feature.value}
                            checked={formData.features.includes(feature.value)}
                            onCheckedChange={() => handleFeatureToggle(feature.value)}
                            className="data-[state=checked]:bg-[#3C89F9] data-[state=checked]:border-[#3C89F9] data-[state=checked]:text-[#FFFF] shadow-none"
                          />
                          <Label
                            htmlFor={feature.value}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {feature.text}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-white">
            <CustomButton
              type="button"
              variant="secondary"
              handleClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
              label="Cancel"
            />
            <CustomButton
              className="flex-1"
              type="submit"
              variant="primary"
              disabled={!isFormValid || isProcessing}
              addIcon={isProcessing}
              Icon={<Spinner size="sm" />}
              label={
                isProcessing
                  ? editModel
                    ? 'Updating...'
                    : 'Creating...'
                  : editModel
                    ? 'Update Model'
                    : 'Create Model'
              }
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserCustomModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  model?: UserCustomModel;
  isProcessing: boolean;
}

export function DeleteUserCustomModelModal({
  isOpen,
  onClose,
  onConfirm,
  model,
  isProcessing,
}: DeleteUserCustomModelModalProps) {
  if (!isOpen || !model) return null;

  return (
    <ConfirmModal
      onClose={onClose}
      label={isProcessing ? 'Deleting...' : 'Delete'}
      handleConfirm={onConfirm}
      message="Delete Custom Model"
      lowMsg={`Are you sure you want to delete the user custom model "${model.name}"? This action cannot be undone.`}
      isLoading={isProcessing}
      width="max-w-[600px] w-[calc(100vw_-_-20px)]"
      confirmBtnClasses="bg-red-600 hover:bg-red-700 text-white"
    />
  );
}
