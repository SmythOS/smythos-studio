import type {
  CreateEnterpriseModelStep1,
  CreateEnterpriseModelStep2,
} from '@react/features/vault/types/enterprise-model';
import type { EnterpriseModel } from '@react/features/vault/types/types';
import { enterpriseModelService } from '@react/features/vault/vault-business-logic';
import IconToolTip from '@src/react/shared/components/_legacy/ui/tooltip/IconToolTip';
import { Button } from '@src/react/shared/components/ui/button';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { errorToast, successToast } from '@src/shared/components/toast';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import {
  Code,
  FileScan,
  FileText,
  Image,
  Pencil,
  PlusCircle,
  Sparkles,
  Trash2,
  Video
} from 'lucide-react';
import { useState } from 'react';
import {
  useCanUseEnterpriseModels,
  useCreateEnterpriseModel,
  useDeleteEnterpriseModel,
  useEnterpriseModels,
  useUpdateEnterpriseModel,
} from '../hooks/use-vault';
import { CreateEnterpriseModal, DeleteEnterpriseModelModal } from './create-enterprise-modal';

export function EnterpriseModels({ pageAccess }: { pageAccess: { write: boolean } }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<EnterpriseModel | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<EnterpriseModel | undefined>();

  // Fetch models
  const { data: models = [], isLoading, error } = useEnterpriseModels();
  const { data: canUseEnterpriseModels = false, isLoading: isLoadingCanUseEnterpriseModels } =
    useCanUseEnterpriseModels();

  // Mutations
  const createModel = useCreateEnterpriseModel();
  const updateModel = useUpdateEnterpriseModel();
  const deleteModel = useDeleteEnterpriseModel();

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'text-completion':
        return <FileText className="h-4 w-4" />;
      case 'document':
        return <FileScan className="h-4 w-4" />;
      case 'code':
        return <Code className="h-4 w-4" />;
      case 'tools':
        return <Sparkles className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleCreateModel = async (
    data: CreateEnterpriseModelStep1 & CreateEnterpriseModelStep2,
  ) => {
    setIsProcessing(true);
    try {
      if (editingModel) {
        const result = await updateModel.mutateAsync({
          modelId: editingModel.id,
          updatedFields: {
            name: data.name,
            modelName: data.modelName,
            provider: data.provider,
            features: data.features,
            contextWindowSize: data.contextWindowSize,
            completionTokens: data.completionTokens,
            tags: data.tags,
            settings: {
              foundationModel: data.modelName,
              customModel: data.customModelName,
              region: data.region,
              keyId: data.settings?.keyId,
              secretKey: data.settings?.secretKey,
              sessionKey: data.settings?.sessionKey,
              projectId: data.settings?.projectId,
              jsonCredentials: data.settings?.jsonCredentials,
            },
          },
        });
        successToast('Enterprise model updated successfully');
        setIsCreateModalOpen(false);
        setEditingModel(undefined);
        return result;
      } else {
        const result = await createModel.mutateAsync({
          name: data.name,
          modelName: data.modelName,
          provider: data.provider,
          features: data.features,
          contextWindowSize: data.contextWindowSize,
          completionTokens: data.completionTokens,
          tags: data.tags,
          settings: {
            foundationModel: data.modelName,
            customModel: data.customModelName,
            region: data.region,
            keyId: data.settings?.keyId,
            secretKey: data.settings?.secretKey,
            sessionKey: data.settings?.sessionKey,
            projectId: data.settings?.projectId,
            jsonCredentials: data.settings?.jsonCredentials,
          },
        });
        successToast('Enterprise model created successfully');
        setIsCreateModalOpen(false);
        setEditingModel(undefined);
        return result;
      }
    } catch (error) {
      console.error('Error saving model:', error);
      errorToast(editingModel
        ? 'Failed to update enterprise model'
        : 'Failed to create enterprise model');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditButtonClick = (model: EnterpriseModel) => {
    setEditingModel(model);
    setIsCreateModalOpen(true);
  };

  const handleDeleteButtonClick = (model: EnterpriseModel) => {
    setModelToDelete(model);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (model: EnterpriseModel) => {
    setIsProcessing(true);
    try {
      await deleteModel.mutateAsync({ modelId: model.id, provider: model.provider });
      successToast('Enterprise model deleted successfully');
      setIsDeleteModalOpen(false);
      setModelToDelete(undefined);
    } catch (error) {
      console.error('Error deleting model:', error);
      errorToast('Failed to delete enterprise model');
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg bg-white text-gray-800 border border-solid border-gray-200 shadow-sm p-6">
        <div className="text-red-500">Error loading enterprise models</div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 rounded-lg border border-solid border-[#d9d9d9] flex-col justify-start items-start gap-3 flex">
      <div className="self-stretch text-[#1e1e1e] text-lg font-semibold font-['Inter'] leading-snug">
        Enterprise Models{' '}
        <IconToolTip
          classes="w-72"
          html="Enterprise models offer control over configurations, enterprise-grade security, and scalable performance for high-volume tasks."
        />
      </div>
      <div className="w-full space-y-4">
        {isLoading || isLoadingCanUseEnterpriseModels ? (
          <div className="py-4 text-center text-gray-500">Loading models...</div>
        ) : canUseEnterpriseModels ? (
          <>
            {models.length === 0 ? (
              <div className="py-4 text-center text-gray-500">No enterprise models found</div>
            ) : (
              models.map((model) => (
                <div key={model.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 items-center rounded-md bg-[#F1C5FF] px-2 text-xs font-medium text-[#772590]">
                      Enterprise
                    </span>
                    <span className="font-medium text-[#374151] max-w-[200px] truncate">
                      {model.name}
                    </span>
                    {model.modelName && (
                      <span className="inline-flex h-5 items-center rounded-md bg-[#f3f4f6] px-2 text-xs font-medium text-[#6b7280]">
                        {model.modelName}
                      </span>
                    )}
                    {model.tags &&
                      model.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex h-5 items-center rounded-md bg-[#f3f4f6] px-2 text-xs font-medium text-[#6b7280]"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#6b7280]">
                      {model.contextWindowSize
                        ? `${enterpriseModelService.getTokenTag(model.contextWindowSize)} tokens`
                        : ''}
                    </span>
                    {model.features &&
                      model.features.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f8f6ff] text-[#5f4cd9]"
                          title={feature}
                        >
                          {getFeatureIcon(feature)}
                        </span>
                      ))}
                    {pageAccess?.write && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditButtonClick(model)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {pageAccess?.write && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteButtonClick(model)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            {pageAccess?.write && (
              <div className="w-full flex justify-center">
                <CustomButton
                  variant="secondary"
                  addIcon
                  Icon={<PlusCircle className="mr-2 h-4 w-4" />}
                  handleClick={() => setIsCreateModalOpen(true)}
                  label="Add Enterprise Model"
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="self-stretch">
              <span className="text-[#757575] text-sm font-normal font-['Inter'] leading-tight">
                <span
                  className="underline cursor-pointer"
                  onClick={() => {
                    window.open('/plans', '_blank');
                  }}
                >
                  Upgrade to Enterprise Plan
                </span>{' '}
                to integrate enterprise-grade AI models like AWS Bedrock or Google Vertex. See{' '}
              </span>
              <a
                href={`${SMYTHOS_DOCS_URL}/agent-studio/key-concepts/vault#set-up-an-enterprise-model`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#757575] text-sm font-normal font-['Inter'] underline leading-tight"
              >
                documentation
              </a>
              <span className="text-[#757575] text-sm font-normal font-['Inter'] leading-tight">
                .
              </span>
            </div>
            <div className="self-stretch rounded-lg bg-white mt-4">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg
                      width="24"
                      height="25"
                      viewBox="0 0 24 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M17.2559 12.2761L14.1719 11.8361C13.9539 11.8071 13.7639 11.6711 13.6639 11.4721L12.2869 8.72313C12.1779 8.50414 12.0079 8.33214 11.7789 8.21214C11.4989 8.06614 11.1779 8.03714 10.8769 8.13213C10.5749 8.22814 10.3279 8.43714 10.1809 8.72114L8.80086 11.4711C8.69986 11.6701 8.50986 11.8071 8.29086 11.8361L5.20786 12.2761C4.94986 12.3141 4.70786 12.4401 4.52686 12.6291C4.31086 12.8511 4.19486 13.1441 4.19986 13.4541C4.20586 13.7661 4.33186 14.0571 4.55686 14.2741L6.78786 16.4151C6.94886 16.5691 7.01886 16.7821 6.98186 17.0011L6.45286 20.0241C6.41186 20.2751 6.45386 20.5291 6.57486 20.7611C6.87686 21.3261 7.58586 21.5501 8.16186 21.2551L10.9169 19.8261C11.1149 19.7231 11.3529 19.7231 11.5509 19.8261L14.2959 21.2411C14.4649 21.3371 14.6539 21.3851 14.8509 21.3851C14.9129 21.3851 14.9759 21.3801 15.0389 21.3711C15.3479 21.3211 15.6199 21.1541 15.8039 20.8991C15.9889 20.6431 16.0639 20.3321 16.0129 20.0211L15.4849 17.0001C15.4459 16.7831 15.5189 16.5601 15.6799 16.4141L17.9059 14.2661C18.0949 14.0881 18.2179 13.8471 18.2539 13.5861C18.3379 12.9521 17.8889 12.3641 17.2559 12.2761Z"
                        fill="#7C4FFF"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M21.4208 6.08926C20.4118 5.75926 19.6148 4.96426 19.2888 3.96026C19.2218 3.75426 19.0298 3.61426 18.8138 3.61426C18.5968 3.61426 18.4048 3.75426 18.3378 3.96026C18.0108 4.96426 17.2138 5.75926 16.2068 6.08926C16.0008 6.15626 15.8618 6.34826 15.8618 6.56426C15.8618 6.78026 16.0008 6.97226 16.2068 7.03926C17.2138 7.36926 18.0108 8.16526 18.3378 9.16926C18.4048 9.37526 18.5968 9.51426 18.8138 9.51426C19.0298 9.51426 19.2218 9.37426 19.2888 9.16926C19.6148 8.16526 20.4118 7.36926 21.4208 7.03926C21.6268 6.97226 21.7658 6.78026 21.7658 6.56426C21.7658 6.34826 21.6268 6.15626 21.4208 6.08926Z"
                        fill="#7C4FFF"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.70113 9.26558C4.93613 8.54358 5.50913 7.97058 6.23513 7.73358C6.38313 7.68458 6.48413 7.54658 6.48413 7.39058C6.48413 7.23558 6.38313 7.09758 6.23513 7.04858C5.50913 6.81158 4.93613 6.23858 4.70113 5.51658C4.65313 5.36858 4.51513 5.26758 4.35913 5.26758C4.20313 5.26758 4.06513 5.36858 4.01613 5.51658C3.78113 6.23858 3.20713 6.81158 2.48213 7.04858C2.33413 7.09758 2.23413 7.23558 2.23413 7.39058C2.23413 7.54658 2.33413 7.68458 2.48213 7.73358C3.20713 7.97058 3.78113 8.54358 4.01613 9.26558C4.06513 9.41358 4.20313 9.51458 4.35913 9.51458C4.51513 9.51458 4.65313 9.41358 4.70113 9.26558Z"
                        fill="#7C4FFF"
                      />
                    </svg>
                  </div>
                  <div className="text-black text-sm font-normal font-['Inter']">
                    Enterprise model
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <CustomButton
                    variant="secondary"
                    label="Upgrade to Enterprise Plan"
                    isLink
                    linkTo="/plans"
                    external
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <CreateEnterpriseModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isProcessing) {
            setIsCreateModalOpen(false);
            setEditingModel(undefined);
          }
        }}
        onSubmit={handleCreateModel}
        editModel={editingModel}
        isProcessing={isProcessing}
      />
      <DeleteEnterpriseModelModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isProcessing) {
            setIsDeleteModalOpen(false);
            setModelToDelete(undefined);
          }
        }}
        model={modelToDelete}
        onConfirm={handleDeleteConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
