import { zodResolver } from '@hookform/resolvers/zod';
import type {
  CreateEnterpriseModelStep1,
  CreateEnterpriseModelStep2,
} from '@react/features/vault/types/enterprise-model';
import { EnterpriseModel } from '@react/features/vault/types/types';
import type { Provider } from '@react/features/vault/vault-business-logic';
import {
  enterpriseModelService,
  providerService,
} from '@react/features/vault/vault-business-logic';
import ToolTip from '@src/react/shared/components/_legacy/ui/tooltip/tooltip';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/react/shared/components/ui/select';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { Textarea } from '@src/react/shared/components/ui/textarea';
import {
  CUSTOM_LLM_FEATURES,
  CUSTOM_LLM_PROVIDERS,
} from '@src/shared/constants/custom-llm.constants';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaCircleExclamation } from 'react-icons/fa6';
import * as z from 'zod';

const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
<path d="M3 12C3 16.9699 7.02908 21 12 21C16.9709 21 21 16.9699 21 12C21 7.02908 16.9709 3 12 3C7.02908 3 3 7.02908 3 12Z" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.0057 15.6932V11.3936M12 8.35426V8.29102" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const step1Schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(80, 'Name must be less than 80 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Name can only contain a-z, A-Z, 0-9, spaces, hyphens, and underscores',
    ),
  provider: z.string().min(1, 'Provider is required'),
  features: z.array(z.string()).min(1, 'At least one feature must be selected'),
});

const getStep2Schema = (provider: string) => {
  const baseSchema = {
    modelName: z.string().min(1, 'Model name is required'),
    customModelName: z.string().optional(),
    region: z.string().min(1, 'Region is required'),
  };

  if (provider === 'Bedrock') {
    return z.object({
      ...baseSchema,
      settings: z.object({
        keyId: z
          .string()
          .min(1, 'Key ID is required')
          .max(100, 'Key ID must be less than 100 characters'),
        secretKey: z
          .string()
          .min(1, 'Secret Key is required')
          .max(150, 'Secret Key must be less than 150 characters'),
        sessionKey: z.string().optional(),
      }),
    });
  }

  if (provider === 'VertexAI') {
    return z.object({
      ...baseSchema,
      settings: z.object({
        jsonCredentials: z
          .string()
          .min(1, 'JSON Credentials are required')
          .max(10000, 'JSON Credentials must be less than 10000 characters'),
        projectId: z
          .string()
          .min(1, 'Project ID is required')
          .max(100, 'Project ID must be less than 100 characters'),
      }),
    });
  }

  return z.object(baseSchema);
};

interface CreateEnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEnterpriseModelStep1 & CreateEnterpriseModelStep2) => void;
  editModel?: EnterpriseModel;
  isProcessing: boolean;
}

const FEATURES = CUSTOM_LLM_FEATURES;

export function CreateEnterpriseModal({
  isOpen,
  onClose,
  onSubmit,
  editModel,
  isProcessing,
}: CreateEnterpriseModalProps) {
  const [step, setStep] = useState(1);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const step1Form = useForm<CreateEnterpriseModelStep1>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: editModel?.name || '',
      provider: editModel?.provider || CUSTOM_LLM_PROVIDERS[0].value,
      features: editModel?.features || ['text'],
    },
  });

  const step2Form = useForm<CreateEnterpriseModelStep2>({
    resolver: zodResolver(getStep2Schema(selectedProvider?.id || 'Bedrock')),
    defaultValues: {
      modelName: editModel?.modelName || '',
      customModelName: editModel?.settings?.customModel || '',
      region: editModel?.settings?.region || '',
      settings: {
        keyId: editModel?.settings?.keyId || '',
        secretKey: editModel?.settings?.secretKey || '',
        sessionKey: editModel?.settings?.sessionKey || '',
        projectId: editModel?.settings?.projectId || '',
        jsonCredentials: editModel?.settings?.jsonCredentials || '',
      },
    },
  });

  const loadProviders = async () => {
    const providers = await providerService.getProviders();
    setProviders(providers);
  };

  const loadProviderOptions = async (providerId: string) => {
    const provider = await providerService.getProviderOptions(providerId);
    setSelectedProvider(provider);
  };

  const handleStep1Submit = async (data: CreateEnterpriseModelStep1) => {
    await loadProviderOptions(data.provider);
    setStep(2);
  };

  const handleClose = () => {
    step1Form.reset({
      name: '',
      provider: CUSTOM_LLM_PROVIDERS[0].value,
      features: ['text'],
    });
    step2Form.reset({
      modelName: '',
      customModelName: '',
      region: '',
      settings: {
        keyId: '',
        secretKey: '',
        sessionKey: '',
        projectId: '',
        jsonCredentials: '',
      },
    });
    setStep(1);
    setSelectedProvider(null);
    onClose();
  };

  const handleStep2Submit = (data: CreateEnterpriseModelStep2) => {
    onSubmit({ ...step1Form.getValues(), ...data });
  };

  useEffect(() => {
    if (isOpen) {
      if (!editModel) {
        step1Form.reset({
          name: '',
          provider: CUSTOM_LLM_PROVIDERS[0].value,
          features: ['text'],
        });
        step2Form.reset({
          modelName: '',
          customModelName: '',
          region: '',
          settings: {
            keyId: '',
            secretKey: '',
            sessionKey: '',
            projectId: '',
            jsonCredentials: '',
          },
        });
        setStep(1);
        setSelectedProvider(null);
      }
      loadProviders();
    }
  }, [isOpen, editModel]);

  useEffect(() => {
    if (editModel && isOpen) {
      step1Form.reset({
        name: editModel.name,
        provider: editModel.provider,
        features: editModel.features,
      });

      step2Form.reset({
        modelName: editModel.modelName,
        customModelName: editModel?.settings?.customModel || '',
        region: editModel.settings?.region,
        settings: {
          keyId: editModel.settings?.keyId,
          secretKey: editModel.settings?.secretKey,
          sessionKey: editModel.settings?.sessionKey,
          projectId: editModel.settings?.projectId,
          jsonCredentials: editModel.settings?.jsonCredentials,
        },
      });

      setStep(1); // Always start at step 1 even when editing
      loadProviderOptions(editModel.provider);
    }
  }, [editModel, isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isProcessing) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1E1E1E]">
            {editModel ? 'Edit Enterprise Model' : 'Add Enterprise Model'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="w-full">
                  <div className=" min-w-[80px] mb-2">
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
                    {...step1Form.register('name')}
                    error={!!step1Form.formState.errors.name}
                    className="w-full"
                    fullWidth
                    placeholder="API Key Name"
                  />
                </div>
                {step1Form.formState.errors.name && (
                  <div className="flex items-start mt-[2px]">
                    <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
                    <p className="text-[12px] text-red-500 font-normal">
                      {step1Form.formState.errors.name.message}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="w-full">
                  <div className="gap-2 min-w-[80px] mb-2">
                    <Label htmlFor="provider" className="text-base font-normal text-[#1E1E1E]">
                      Provider <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Select
                    onValueChange={(value) => step1Form.setValue('provider', value)}
                    defaultValue={step1Form.getValues('provider')}
                  >
                    <SelectTrigger className="w-full border-gray-300 border-b-gray-500 border-gray-300 border-b-gray-500 focus:border-b-2 focus:outline-none focus:ring-0 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500 ">
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {step1Form.formState.errors.provider && (
                  <p className="text-sm text-red-500">
                    {step1Form.formState.errors.provider.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-base font-normal text-[#1E1E1E]">Features</Label>
                <div className="grid grid-cols-2 gap-4 ml-2">
                  {FEATURES.map((feature) => (
                    <div key={feature.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature.value}
                        disabled={true}
                        checked={feature.value === 'text'}
                        className="data-[state=checked]:bg-[#3C89F9] data-[state=checked]:border-[#3C89F9] data-[state=checked]:text-[#FFFF] shadow-none"
                        onCheckedChange={(checked) => {
                          const features = step1Form.getValues('features');
                          if (checked) {
                            step1Form.setValue('features', [...features, feature.value]);
                          } else {
                            step1Form.setValue(
                              'features',
                              features.filter((f) => f !== feature.value),
                            );
                          }
                        }}
                      />
                      <Label htmlFor={feature.value} className="text-sm font-normal">
                        {feature.text}
                      </Label>
                    </div>
                  ))}
                </div>
                {step1Form.formState.errors.features && (
                  <p className="text-sm text-red-500">
                    {step1Form.formState.errors.features.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <CustomButton
                variant="primary"
                type="submit"
                label="Next"
                className="w-[100px] h-[48px] rounded-lg"
              />
            </div>
          </form>
        ) : (
          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
            <div className="space-y-4">
              <ModelNameField form={step2Form} selectedProvider={selectedProvider} />
              <CustomModelNameField form={step2Form} />

              {selectedProvider?.id === 'Bedrock' && (
                <>
                  <KeyIdField form={step2Form} />
                  <SecretKeyField form={step2Form} />
                  <SessionKeyField form={step2Form} />
                </>
              )}

              {selectedProvider?.id === 'VertexAI' && (
                <>
                  <JsonCredentialsField form={step2Form} />
                  <ProjectIdField form={step2Form} />
                </>
              )}

              <RegionField form={step2Form} selectedProvider={selectedProvider} />
            </div>

            <div className="flex justify-between gap-4">
              <CustomButton
                type="button"
                variant="secondary"
                handleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setStep(1);
                  setSelectedProvider(null);
                }}
                className="flex-1"
                label="Back"
              />
              <CustomButton
                className="flex-1"
                type="submit"
                variant="primary"
                disabled={isProcessing}
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
        )}
      </DialogContent>
    </Dialog>
  );
}

const ModelNameField = ({ form, selectedProvider }) => (
  <div className="space-y-2">
    <Label htmlFor="modelName" className="text-gray-700 mb-1 text-sm font-normal">
      Model Name <span className="text-red-500">*</span>
    </Label>
    <Select
      onValueChange={(value) => form.setValue('modelName', value)}
      defaultValue={form.getValues('modelName')}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {selectedProvider?.models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.label}{' '}
            <span className="ml-2 text-sm">{enterpriseModelService.getTokenTag(model.tokens)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {form.formState.errors.modelName && (
      <div className="flex items-start mt-[2px]">
        <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
        <p className="text-[12px] text-red-500 font-normal">
          {form.formState.errors.modelName.message}
        </p>
      </div>
    )}
    <p className="text-xs text-muted-foreground">
      Base/foundation model name (on-demand throughput)
    </p>
  </div>
);

const CustomModelNameField = ({ form }) => (
  <div className="space-y-2">
    <Label htmlFor="customModelName" className="text-gray-700 mb-1 text-sm font-normal">
      Custom Model Name (Optional)
    </Label>
    <Input id="customModelName" {...form.register('customModelName')} fullWidth />
    <p className="text-xs text-muted-foreground">
      Name/ARN of the fine-tuned model or provisioned throughput
    </p>
  </div>
);

const KeyIdField = ({ form }) => (
  <div className="space-y-2">
    <Label htmlFor="settings.keyId" className="text-gray-700 mb-1 text-sm font-normal">
      Key ID <span className="text-red-500">*</span>
    </Label>
    <Input
      id="settings.keyId"
      {...form.register('settings.keyId')}
      className={form.formState.errors.settings?.keyId ? 'border-red-500' : ''}
      fullWidth
    />
    {form.formState.errors.settings?.keyId && (
      <div className="flex items-start mt-[2px]">
        <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
        <p className="text-[12px] text-red-500 font-normal">
          {form.formState.errors.settings.keyId.message}
        </p>
      </div>
    )}
  </div>
);

const SecretKeyField = ({ form }) => (
  <div className="space-y-2">
    <Label htmlFor="settings.secretKey" className="text-gray-700 mb-1 text-sm font-normal">
      Secret Key <span className="text-red-500">*</span>
    </Label>
    <Input
      id="settings.secretKey"
      type="password"
      {...form.register('settings.secretKey')}
      className={form.formState.errors.settings?.secretKey ? 'border-red-500' : ''}
      fullWidth
    />
    {form.formState.errors.settings?.secretKey && (
      <div className="flex items-start mt-[2px]">
        <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
        <p className="text-[12px] text-red-500 font-normal">
          {form.formState.errors.settings.secretKey.message}
        </p>
      </div>
    )}
  </div>
);

const SessionKeyField = ({ form }) => (
  <div className="space-y-2">
    <Label htmlFor="settings.sessionKey" className="text-gray-700 mb-1 text-sm font-normal">
      Session Key (Can Be Left Blank)
    </Label>
    <Input id="settings.sessionKey" {...form.register('settings.sessionKey')} fullWidth />
    <p className="text-xs text-muted-foreground">
      By default, the session key should be left blank. However, if your AWS Key ID and Secret Key
      are generated with a session key, it becomes mandatory. Remember to update the keys when they
      expire.
    </p>
  </div>
);

const JsonCredentialsField = ({ form }) => (
  <div className="space-y-2">
    <Label htmlFor="settings.jsonCredentials" className="text-right">
      JSON Credentials <span className="text-red-500">*</span>
    </Label>
    <Textarea
      id="settings.jsonCredentials"
      {...form.register('settings.jsonCredentials')}
      className={`min-h-[100px] ${
        form.formState.errors.settings?.jsonCredentials ? 'border-red-500' : ''
      }`}
      fullWidth
    />
    {form.formState.errors.settings?.jsonCredentials && (
      <p className="text-sm text-red-500">
        {form.formState.errors.settings.jsonCredentials.message}
      </p>
    )}
  </div>
);

const ProjectIdField = ({ form }) => (
  <div className="space-y-2">
    <Label htmlFor="settings.projectId" className="text-right">
      Project ID <span className="text-red-500">*</span>
    </Label>
    <Input
      id="settings.projectId"
      {...form.register('settings.projectId')}
      className={form.formState.errors.settings?.projectId ? 'border-red-500' : ''}
      fullWidth
    />
    {form.formState.errors.settings?.projectId && (
      <p className="text-sm text-red-500">{form.formState.errors.settings.projectId.message}</p>
    )}
  </div>
);

const RegionField = ({ form, selectedProvider }) => (
  <div className="space-y-2">
    <Label htmlFor="region" className="text-gray-700 mb-1 text-sm font-normal">
      Region <span className="text-red-500">*</span>
    </Label>
    <Select
      onValueChange={(value) => form.setValue('region', value)}
      defaultValue={form.getValues('region')}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a region" />
      </SelectTrigger>
      <SelectContent>
        {selectedProvider?.regions.map((region) => (
          <SelectItem key={region.value} value={region.value}>
            {region.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {form.formState.errors.region && (
      <div className="flex items-start mt-[2px]">
        <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
        <p className="text-[12px] text-red-500 font-normal">
          {form.formState.errors.region.message}
        </p>
      </div>
    )}
  </div>
);

interface DeleteEnterpriseModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  model?: EnterpriseModel;
  onConfirm: (model: EnterpriseModel) => Promise<void>;
  isProcessing: boolean;
}

export function DeleteEnterpriseModelModal({
  isOpen,
  onClose,
  model,
  onConfirm,
  isProcessing,
}: DeleteEnterpriseModelModalProps) {
  if (!model) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isProcessing) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Enterprise Model</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the enterprise model "{model.name}"? This action cannot
            be undone.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <CustomButton
            className="ml-auto h-[48px] rounded-lg"
            handleClick={() => onConfirm(model)}
            label={isProcessing ? 'Deleting...' : 'Delete'}
            addIcon
            Icon={<img className="mr-2" src="/img/icons/Delete-White.svg" />}
            disabled={isProcessing}
            isDelete
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
