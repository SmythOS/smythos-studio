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
import React, { useEffect, useMemo, useState } from 'react';
import type { UserCustomModel } from '../types/types';

interface CreateUserCustomModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<UserCustomModel, 'id'>) => void;
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
  });

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

  useEffect(() => {
    if (editModel) {
      setFormData({
        name: editModel.name,
        modelId: editModel.modelId,
        baseURL: editModel.baseURL,
        provider: editModel.provider,
        contextWindow: editModel.contextWindow,
        maxOutputTokens: editModel.maxOutputTokens,
        fallbackLLM: editModel.fallbackLLM || '',
        features: editModel.features || ['text'],
      });
    } else {
      setFormData({
        name: '',
        modelId: '',
        baseURL: '',
        provider: '',
        contextWindow: undefined,
        maxOutputTokens: undefined,
        fallbackLLM: '',
        features: ['text'],
      });
    }
  }, [editModel, isOpen, fallbackOptions]);

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

    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const isFormValid =
    formData.name?.trim() &&
    formData.modelId?.trim() &&
    formData.baseURL?.trim() &&
    formData.provider?.trim();

  // Filter features to only show Text Completion and Function calling/Tool Use
  const userCustomModelFeatures = CUSTOM_LLM_FEATURES.filter(
    (feature) => feature.value === 'text' || feature.value === 'tools',
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isProcessing) {
          onClose();
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-normal mr-2 text-[#1E1E1E]">
                Name <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="modelId" className="text-base font-normal mr-2 text-[#1E1E1E]">
                Model ID <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="baseURL" className="text-base font-normal mr-2 text-[#1E1E1E]">
                Base URL <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="provider" className="text-base font-normal mr-2 text-[#1E1E1E]">
                Provider / Compatible SDK <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="contextWindow" className="text-base font-normal mr-2 text-[#1E1E1E]">
                Context Window
              </Label>
              <Input
                id="contextWindow"
                type="number"
                min="2048"
                max="2000000"
                step="4"
                value={formData.contextWindow !== undefined ? String(formData.contextWindow) : ''}
                onChange={(e) => handleNumericInputChange('contextWindow', e.target.value)}
                placeholder="128000"
                fullWidth
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                The total number of tokens the model can process, including input and output.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxOutputTokens" className="text-base font-normal mr-2 text-[#1E1E1E]">
                Maximum Output Tokens
              </Label>
              <Input
                id="maxOutputTokens"
                type="number"
                min="256"
                max="200000"
                step="4"
                value={formData.maxOutputTokens !== undefined ? String(formData.maxOutputTokens) : ''}
                onChange={(e) => handleNumericInputChange('maxOutputTokens', e.target.value)}
                placeholder="4096"
                fullWidth
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                The maximum number of tokens the model can generate in a single response.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fallbackLLM">
                Fallback Model
              </Label>
              <p className="text-xs text-gray-500">
                The model used when the custom model is unavailable.
              </p>
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
              <Label className="text-base font-normal text-[#1E1E1E]">Features</Label>
              <div className="grid grid-cols-2 gap-4 ml-2">
                {userCustomModelFeatures.map((feature) => (
                  <div key={feature.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={feature.value}
                      checked={formData.features.includes(feature.value)}
                      onCheckedChange={() => handleFeatureToggle(feature.value)}
                      className="data-[state=checked]:bg-[#3C89F9] data-[state=checked]:border-[#3C89F9] data-[state=checked]:text-[#FFFF] shadow-none"
                    />
                    <Label htmlFor={feature.value} className="text-sm font-normal cursor-pointer">
                      {feature.text}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-white">
            <CustomButton
              type="button"
              variant="secondary"
              handleClick={onClose}
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
  if (!model) return null;

  if (!isOpen) {
    return null;
  }

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
