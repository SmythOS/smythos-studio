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
import { LLMRegistry } from '@src/shared/services/LLMRegistry.service';
import React, { useEffect, useState } from 'react';
import type { UserCustomModel } from '../types/types';

interface CreateUserCustomModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<UserCustomModel, 'id'>) => void;
  editModel?: UserCustomModel;
  isProcessing: boolean;
}

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
    baseUrl: '',
    fallbackLLM: '',
  });

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

  const fallbackOptions = LLMRegistry.getSortedModelsByFeatures('tools').map((model) => {
    let badge = getTempBadge(model.tags);
    badge = badge ? ' (' + badge + ')' : '';
    return {
      id: model.entryId,
      name: model.label + badge, // Add tags like "(Personal)" as shown in Default LLM section
    };
  });

  useEffect(() => {
    if (editModel) {
      setFormData({
        name: editModel.name,
        modelId: editModel.modelId,
        baseUrl: editModel.baseUrl,
        fallbackLLM: editModel.fallbackLLM,
      });
    } else {
      setFormData({
        name: '',
        modelId: '',
        baseUrl: '',
        fallbackLLM: '',
      });
    }
  }, [editModel, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.modelId.trim() ||
      !formData.baseUrl.trim() ||
      !formData.fallbackLLM.trim()
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

  const isFormValid =
    formData.name.trim() &&
    formData.modelId.trim() &&
    formData.baseUrl.trim() &&
    formData.fallbackLLM.trim();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isProcessing) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1E1E1E]">
            {editModel ? 'Edit Custom Model' : 'Setup Custom Model'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="baseUrl" className="text-base font-normal mr-2 text-[#1E1E1E]">
              Base URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="baseUrl"
              type="url"
              value={formData.baseUrl}
              onChange={(e) => handleInputChange('baseUrl', e.target.value)}
              placeholder="https://api.smythos.com/example"
              fullWidth
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallbackLLM">
              Fallback Model <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500">
              Select a model from the same options available in Default LLM settings
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

          <div className="flex justify-between gap-4 pt-4">
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
