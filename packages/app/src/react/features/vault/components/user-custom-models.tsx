import { Button } from '@src/react/shared/components/ui/button';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { errorToast, successToast } from '@src/shared/components/toast';
import { Tooltip } from 'flowbite-react';
import { Info, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  useCreateUserCustomModel,
  useDeleteUserCustomModel,
  useUpdateUserCustomModel,
  useUserCustomModels,
} from '../hooks/use-vault';
import type { UserCustomModel } from '../types/types';
import {
  CreateUserCustomModelModal,
  DeleteUserCustomModelModal,
} from './create-user-custom-model-modal';

export function UserCustomModels({ pageAccess }: { pageAccess: { write: boolean } }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<UserCustomModel | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<UserCustomModel | undefined>();

  // Fetch models
  const { data: models = [], isLoading, error } = useUserCustomModels();

  // Mutations
  const createModel = useCreateUserCustomModel();
  const updateModel = useUpdateUserCustomModel();
  const deleteModel = useDeleteUserCustomModel();

  const handleCreateModel = async (data: Omit<UserCustomModel, 'id'>) => {
    // Check for duplicate names (case-insensitive)
    const existingModel = models.find(
      (model) =>
        model.name.toLowerCase() === data.name.toLowerCase() &&
        // When editing, exclude the current model from duplicate check
        (!editingModel || model.id !== editingModel.id),
    );

    if (existingModel) {
      errorToast(
        'A user custom model with this name already exists. Please choose a different name.',
      );
      return;
    }

    setIsProcessing(true);
    try {
      await createModel.mutateAsync(data);
      successToast('Custom model created successfully');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating user custom model:', error);
      errorToast('Failed to create user custom model');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateModel = async (data: Omit<UserCustomModel, 'id'>) => {
    if (!editingModel) return;

    // Check for duplicate names (case-insensitive)
    const existingModel = models.find(
      (model) =>
        model.name.toLowerCase() === data.name.toLowerCase() &&
        // When editing, exclude the current model from duplicate check
        model.id !== editingModel.id,
    );

    if (existingModel) {
      errorToast(
        'A user custom model with this name already exists. Please choose a different name.',
      );
      return;
    }

    setIsProcessing(true);
    try {
      await updateModel.mutateAsync({
        modelId: editingModel.id,
        updatedFields: data,
      });
      successToast('Custom model updated successfully');
      setEditingModel(undefined);
    } catch (error) {
      console.error('Error updating user custom model:', error);
      errorToast('Failed to update user custom model');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!modelToDelete) return;

    setIsProcessing(true);
    try {
      await deleteModel.mutateAsync({ modelId: modelToDelete.id });
      successToast('Custom model deleted successfully');
      setIsDeleteModalOpen(false);
      setModelToDelete(undefined);
    } catch (error) {
      console.error('Error deleting user custom model:', error);
      errorToast('Failed to delete user custom model');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditModel = (model: UserCustomModel) => {
    setEditingModel(model);
  };

  const handleDeleteClick = (model: UserCustomModel) => {
    setModelToDelete(model);
    setIsDeleteModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditingModel(undefined);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setModelToDelete(undefined);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-800">
          <Info className="h-4 w-4" />
          <span className="font-medium">Error loading custom models</span>
        </div>
        <p className="mt-1 text-sm text-red-600">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 rounded-lg border border-solid border-[#d9d9d9] flex-col justify-start items-start gap-3 flex">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 self-stretch text-[#1e1e1e] text-lg font-semibold font-['Inter'] leading-snug">
          Custom Models
          <Tooltip
            className="w-72 text-center"
            content="Custom models allow you to connect to your own LLM instances running locally or on your infrastructure"
          >
            <Info className="w-4 h-4" />
          </Tooltip>
        </div>
      </div>

      <div className="w-full space-y-4">
        {isLoading ? (
          <div className="py-4 text-center text-gray-500">Loading models...</div>
        ) : (
          <>
            {models.length === 0 ? (
              <div className="py-4 text-center text-gray-500">No custom models found</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  {models.map((model) => (
                    <div key={model.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 items-center rounded-md bg-blue-100 px-2 text-xs font-medium text-blue-800">
                          Custom
                        </span>
                        <span className="font-medium text-[#374151] max-w-[200px] truncate">
                          {model.name}
                        </span>
                        <span className="inline-flex h-5 items-center rounded-md bg-[#f3f4f6] px-2 text-xs font-medium text-[#6b7280] whitespace-nowrap">
                          {model.modelId}
                        </span>
                        <span className="inline-flex h-5 items-center rounded-md bg-[#f3f4f6] px-2 text-xs font-medium text-[#6b7280] whitespace-nowrap">
                          {model.baseUrl}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {pageAccess.write && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditModel(model)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(model)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 hover:text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pageAccess.write && (
              <div className="pt-4 flex justify-center">
                <CustomButton
                  variant="secondary"
                  addIcon
                  Icon={<PlusCircle className="mr-2 h-4 w-4" />}
                  handleClick={() => setIsCreateModalOpen(true)}
                  label="Add Custom Model"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreateUserCustomModelModal
        isOpen={isCreateModalOpen || !!editingModel}
        onClose={editingModel ? handleCloseEditModal : handleCloseCreateModal}
        onSubmit={editingModel ? handleUpdateModel : handleCreateModel}
        editModel={editingModel}
        isProcessing={isProcessing}
      />

      {/* Delete Modal */}
      <DeleteUserCustomModelModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteModel}
        model={modelToDelete}
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default UserCustomModels;
