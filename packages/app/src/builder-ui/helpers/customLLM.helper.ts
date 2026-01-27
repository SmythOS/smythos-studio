import { errorToast, successToast } from '@src/shared/components/toast';
import { authStore } from '@src/shared/state_stores/auth/store';
import {
  BEDROCK_REGIONS,
  CUSTOM_LLM_FEATURES,
  CUSTOM_LLM_PROVIDERS,
  VERTEX_AI_REGIONS,
} from '../../shared/constants/custom-llm.constants';
import { customModels } from '../../shared/custom-models';
import { CustomLLMProviders } from '../../shared/types';
import { COMP_NAMES } from '../config';
import { createBadge, generateModelStatusBadges } from '../ui/badges';
import { confirm } from '../ui/dialogs';
import { closeTwDialog, twEditValuesWithCallback } from '../ui/tw-dialogs';
import { createSpinner, delay } from '../utils';
import { getTokenTag } from '../utils/LLM.utils';

declare var $;

// TODO: Remove this file and its functions.
// This file and its functions are deprecated since custom model management
// has been moved to the /vault page. This file will be removed in future

export async function hasCustomLLMAccess() {
  try {
    // either have custom models enabled or to be a smyth stuff

    const state = authStore.getState();
    const subs = state.userInfo?.subs;
    if (
      subs?.plan?.properties?.flags?.['customModelsEnabled'] === true ||
      subs?.properties?.customModelsEnabled === true
    ) {
      return true;
    }

    const url = `/api/status`;
    const result = await fetch(url).then((res) => res.json());
    const isSmythStaff = result?.status?.user?.isSmythStaff;
    const isCustomLLMAllowed = result?.status?.user?.isCustomLLMAllowed;

    return isSmythStaff || isCustomLLMAllowed;
  } catch {
    return false;
  }
}

async function addButtonClickHandler(component, event) {
  _editValueDialog({
    component,
  });
}

async function actionsHandler(component, modelElm) {
  const modelWrapperElm = modelElm.closest('.select.smt-input-select');
  const modelListElm = modelWrapperElm.querySelector('.drop-container .option-list');
  const listItems = modelListElm.querySelectorAll('li');

  modelWrapperElm.querySelector('.select-input').style.width = 'calc(100% - 143px)';

  listItems.forEach((item) => {
    const linkElm = item.querySelector('a');
    linkElm.addEventListener('click', async (event) => {
      const buttonElm = event.target as HTMLElement;
      const modelEntryId = buttonElm.getAttribute('data-custom-model-entry-id');
      const modelEntryName = buttonElm.getAttribute('data-custom-model-entry-name');
      const modelProvider = buttonElm.getAttribute('data-model-provider');

      const actionType = buttonElm.getAttribute('data-action-type');
      if (actionType === 'delete-custom-llm') {
        const spinner = createSpinner('red', 'mt-0');
        buttonElm.appendChild(spinner);

        try {
          await confirm(
            '',
            `Are you sure you want to delete the custom model named "${modelEntryName}"?`,
            {
              btnYesLabel: 'Yes, Delete',
              btnNoLabel: 'No, Cancel',
              btnYesClass: 'bg-smyth-red-500 border-smyth-red-500',
              btnYesCallback: async (btnElm) => {
                btnElm.textContent = 'Deleting...';
                btnElm.disabled = true;

                await fetch(`/api/page/builder/custom-llm/${modelProvider}/${modelEntryId}`, {
                  method: 'DELETE',
                });

                await component.refreshLLMModels();

                btnElm.textContent = 'Yes, Delete';
                btnElm.disabled = false;

                successToast(`Custom model "${modelEntryName}" has been successfully deleted.`);
              },
            },
          );
        } catch {
          errorToast(`Something went wrong while deleting the custom model.`);
        } finally {
          spinner?.remove();
        }
      } else if (actionType === 'edit-custom-llm') {
        const spinner = createSpinner('blue', 'spinner-inside-option-item mt-0');
        buttonElm.appendChild(spinner);

        try {
          await _editValueDialog({
            component,
            actionType: 'edit',
            modelDetails: {
              provider: modelProvider,
              entryName: modelEntryName,
            },
          });
        } catch {
          errorToast(`Something went wrong while editing the custom model.`);
        } finally {
          spinner?.remove();
        }
      }
    });
  });
}

// TODO [Forhad]: Need to refactor this function to make it more maintainable
async function _editValueDialog({
  component,
  actionType,
  modelDetails,
}: {
  component: any;
  actionType?: 'edit' | 'add';
  modelDetails?: {
    provider?: string;
    entryName?: string;
  };
}) {
  // if the dialog is already loading, we return
  if (_editValueDialog['isLoading']) return;
  else _editValueDialog['isLoading'] = true;

  const modelElm = document.getElementById('model');
  const formGroupElm = modelElm?.closest('.form-group');
  const formLabelElm = formGroupElm?.querySelector('.form-label');
  const spinner = createSpinner('black', 'ml-2 absolute right-2.5 top-3.5');

  if (formLabelElm) {
    // Remove the existing spinner before adding a new one. This spinner is used to display the custom model button.
    if (formGroupElm?.querySelector(':scope > .smyth-spinner')) {
      const existingSpinner = formGroupElm?.querySelector(':scope > .smyth-spinner');
      existingSpinner.remove();
    }

    formLabelElm.insertAdjacentElement('afterend', spinner);
  }

  // we fetch the saved model info here to properly handle same loading animation both for edit and add
  let savedModelInfo = {};
  if (actionType === 'edit') {
    const getCustomLLMWithKeys = await fetch(
      `/api/page/builder/custom-llm/with-credentials/${modelDetails.provider}/${modelDetails.entryName}`,
    ).then((res) => res.json());

    savedModelInfo = getCustomLLMWithKeys?.data;
  }

  const modelInfoFields = _getModelInfoFields(
    savedModelInfo,
    actionType,
    component.constructor.name,
  );

  twEditValuesWithCallback(
    {
      title: `Edit Model Info`,
      fields: modelInfoFields,
      actions: [
        {
          label: 'Next',
          cssClass: 'bg-smyth-emerald-400 cursor-pointer',
          requiresValidation: true,
          callback: async (modelInfo, modelInfoDialog) => {
            if (!modelInfo || Object.keys(modelInfo)?.length === 0) return;

            closeTwDialog(modelInfoDialog); // Close the model info dialog

            const provider = modelInfo.provider;

            const modelSettingFields = _getModelSettingFields({
              provider,
              compName: component.constructor.name,
              savedModelInfo,
            });

            twEditValuesWithCallback(
              {
                title: `Edit Model Settings`,
                fields: modelSettingFields,
                actions: [
                  {
                    label: actionType === 'edit' ? 'Update' : 'Create',
                    cssClass: 'bg-smyth-emerald-400 clm-btn-create cursor-pointer',
                    requiresValidation: true,
                    callback: async (modelSettings, modelSettingsDialog) => {
                      if (!modelSettings || Object.keys(modelSettings)?.length === 0) return;

                      const createBtnElm = modelSettingsDialog.querySelector('.clm-btn-create');

                      createBtnElm.textContent =
                        actionType === 'edit' ? 'Updating...' : 'Creating...';
                      createBtnElm.disabled = true;

                      const llmDataToSave = {
                        ...modelInfo,
                        settings: {
                          ...modelSettings,
                        },
                      };

                      if (actionType === 'edit') {
                        llmDataToSave.id = savedModelInfo?.['id'] || '';
                      }

                      try {
                        const saveCustomLLM = await fetch(`/api/page/builder/custom-llm`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(llmDataToSave),
                        }).then((res) => res.json());

                        const savedName = saveCustomLLM?.data?.name;

                        await component.refreshLLMModels();

                        // Adding a delay to ensure the new model is properly set as selected
                        await delay(300);

                        const selectBox = $('#model').data('select');
                        selectBox.val(savedName);

                        closeTwDialog(modelSettingsDialog); // Close the model settings dialog

                        successToast(`Custom model "${savedName}" has been successfully added.`);
                      } catch (error) {
                        errorToast(`Something went wrong while adding the custom model.`);
                      } finally {
                        spinner?.remove();
                        createBtnElm.textContent = actionType === 'edit' ? 'Update' : 'Create';
                        createBtnElm.disabled = false;
                        _editValueDialog['isLoading'] = false;
                      }
                    },
                  },
                ],
                onCloseClick: (_, dialog) => {
                  spinner?.remove();
                  _editValueDialog['isLoading'] = false;
                  closeTwDialog(dialog);
                },
              },
              '',
              '',
              'none',
            );
          },
        },
      ],
      onCloseClick: (_, dialog) => {
        spinner?.remove();
        _editValueDialog['isLoading'] = false;
        closeTwDialog(dialog);
      },
      onDOMReady: null,
      onLoad: null,
    },
    '423px',
    '300px',
    'none',
  );
}

function _getModelSettingFields({
  provider,
  compName,
  savedModelInfo,
}: {
  provider: string;
  compName: string;
  savedModelInfo: Record<string, any>;
}) {
  switch (provider) {
    case CustomLLMProviders.Bedrock:
      return _getBedrockSettingFields({ compName, savedModelInfo });
    case CustomLLMProviders.VertexAI:
      return _getVertexAISettingFields({ compName, savedModelInfo });
    default:
      return {};
  }
}

const DEFAULT_VALUES = {
  Bedrock: {
    model: 'ai21.jamba-instruct-v1:0',
    region: 'us-east-1',
  },
  VertexAI: {
    model: 'gemini-1.5-flash',
    region: 'us-central1',
  },
};

function _getModelInfoFields(
  savedModelInfo: Record<string, any> = {},
  actionType: 'edit' | 'add' = 'add',
  compName: string,
) {
  const defaultFeatures = savedModelInfo?.features || [
    'text',
    compName === COMP_NAMES.agentPlugin && 'tools',
  ];

  const modelInfoFields: any = {
    // LLM Entry Name
    name: {
      type: 'text',
      label: 'Name',
      value: savedModelInfo?.name || '',
      validate: 'required custom=isValidCustomLLMName maxlength=80',
      smythValidate: 'func=isUniqueCustomModelName',
      validateMessage: `Provide a unique Name containing only 'a-z', 'A-Z', '0-9', '-', '_', and spaces, with a maximum length of 80 characters.`,
      hint: 'The name that will appear in the model dropdown list',
      attributes: {
        'data-entry-id': savedModelInfo?.id,
      },
    },
    provider: {
      type: 'select',
      label: 'Provider',
      value: savedModelInfo?.provider || CustomLLMProviders.Bedrock,
      options: CUSTOM_LLM_PROVIDERS,
      validate: 'required custom=isValidCustomLLMProvider',
      validateMessage: `Please select a valid provider.`,
      readonly: actionType === 'edit' || compName === COMP_NAMES.agentPlugin,
    },
    // TODO (CUSTOM-LLM) : Apply validation for this field.
    features: {
      type: 'checkbox-group',
      label: 'Features',
      options: CUSTOM_LLM_FEATURES.map((feature) => {
        // ! TEMPORARY: All features are readonly
        feature['readonly'] = true;
        return feature;
      }),
      value: defaultFeatures,
    },
  };

  return modelInfoFields;
}

function _getBedrockSettingFields({
  compName,
  savedModelInfo,
}: {
  compName: string;
  savedModelInfo: Record<string, any>;
}) {
  let bedrockModels = [];

  for (const [key, value] of Object.entries(customModels)) {
    if (value.llm === CustomLLMProviders.Bedrock) {
      bedrockModels.push({ ...value, id: key });
    }
  }

  // Filter the bedrock models based on the component name
  bedrockModels = bedrockModels.filter((model) => model.components.includes(compName));

  // Add badge to the bedrock models
  const bedrockModelOptions = bedrockModels.map((model) => {
    let badge = '';

    if (model?.tags?.length > 0) {
      badge += generateModelStatusBadges(model.tags);
    }

    if (model?.tokens) {
      badge += createBadge(getTokenTag(model.tokens), 'text-gray-500 border-gray-500');
    }

    return {
      text: model.label,
      value: model.id,
      badge,
    };
  });

  const modelSettingFields = {
    // Base/Foundation Model Name
    foundationModel: {
      type: 'select',
      label: 'Model Name',
      value:
        savedModelInfo?.settings?.foundationModel ||
        DEFAULT_VALUES[CustomLLMProviders.Bedrock].model,
      options: bedrockModelOptions,
      validate: 'required custom=isValidBedrockModel',
      validateMessage: 'Please select a valid Bedrock model ID.',
      hint: 'Amazon Bedrock base/foundation model name (on-demand throughput)',
    },
    // Name/ARN of the Provisioned Throughput/Fine-tuned model
    customModel: {
      type: 'text',
      value: savedModelInfo?.settings?.customModel || '',
      label: 'Custom Model Name (Optional)',
      validate: 'maxlength=200',
      validateMessage: 'Custom model name should be less than 200 characters.',
      hint: 'Name/ARN of the fine-tuned model or provisioned throughput',
    },
    keyId: {
      type: 'password',
      label: 'Key ID',
      value: savedModelInfo?.settings?.keyId || '',
      validate: 'required maxlength=100',
      validateMessage:
        'Please provide a valid Key ID that is not empty and is less than 100 characters.',
    },
    secretKey: {
      type: 'password',
      label: 'Secret Key',
      value: savedModelInfo?.settings?.secretKey || '',
      validate: 'required maxlength=150',
      validateMessage:
        'Please provide a valid Secret Key that is not empty and is less than 150 characters.',
    },
    sessionKey: {
      type: 'password',
      label: 'Session Token (Can be left blank)',
      value: savedModelInfo?.settings?.sessionKey || '',
      validate: 'maxlength=2048',
      validateMessage: 'Please provide a valid Session Token that is less than 2048 characters.',
      hint: 'By default, the session token should be left blank. However, if your AWS Key ID and Secret Key are generated with a session token, it becomes mandatory. Remember to update the keys when they expire.',
    },
    region: {
      type: 'select',
      label: 'Region',
      value: savedModelInfo?.settings?.region || DEFAULT_VALUES[CustomLLMProviders.Bedrock].region,
      options: BEDROCK_REGIONS,
      validate: 'required custom=isValidBedrockRegion',
      validateMessage: 'Region is required',
    },
  };

  return modelSettingFields;
}

function _getVertexAISettingFields({
  compName,
  savedModelInfo,
}: {
  compName: string;
  savedModelInfo: Record<string, any>;
}) {
  let vertexAIModels = [];

  for (const [key, value] of Object.entries(customModels)) {
    if (value.llm === CustomLLMProviders.VertexAI) {
      vertexAIModels.push({ ...value, id: key });
    }
  }

  // * There are some models that does not have context window and does not support system prompt, we need to exclude them for LLM Assistant
  if (compName === COMP_NAMES.llmAssistant) {
    vertexAIModels = vertexAIModels.filter((model) => model.supportsSystemPrompt && model?.tokens);
  }

  // Add badge to the bedrock models
  const vertexAIModelOptions = vertexAIModels.map((model) => {
    let badge = '';

    if (model?.tags?.length > 0) {
      badge += generateModelStatusBadges(model.tags);
    }

    if (model?.tokens) {
      badge += createBadge(getTokenTag(model.tokens), 'text-gray-500 border-gray-500');
    }

    return {
      text: model.label,
      value: model.id,
      badge,
    };
  });

  const modelSettingFields = {
    // Base/Foundation Model Name
    foundationModel: {
      type: 'select',
      label: 'Foundation Model',
      value:
        savedModelInfo?.settings?.foundationModel ||
        DEFAULT_VALUES[CustomLLMProviders.VertexAI].model,
      options: vertexAIModelOptions,
      validate: 'required custom=isValidVertexAIModel',
      validateMessage: 'Please select a valid Bedrock model ID.',
      hint: 'Google Vertex AI base/foundation model',
    },
    // ID of the fine tuned custom model
    customModel: {
      type: 'text',
      value: savedModelInfo?.settings?.customModel || '',
      label: 'Custom Model (Optional)',
      validate: 'maxlength=200',
      validateMessage: 'Custom model ID should be less than 200 characters.',
      hint: `Endpoint ID of the fine tuned model such as '1234567890123456789' or 'projects/123456789012/locations/us-central1/endpoints/1234567890123456789'`,
    },
    jsonCredentials: {
      type: 'textarea',
      label: 'Google Credentials (JSON)',
      value: savedModelInfo?.settings?.jsonCredentials || '',
      validate: 'required maxlength=10000',
      validateMessage:
        'Please provide a valid JSON Object that is not empty and is less than 10000 characters.',
      fieldCls: 'max-h-[100px]',
      onLoad: async (fieldElm) => {
        await delay(300);

        const fakeTextareaElm = fieldElm.querySelector('.fake-textarea');

        if (fakeTextareaElm) {
          fakeTextareaElm.style.maxHeight = '100px';
        }
      },
    },
    projectId: {
      type: 'text',
      label: 'Project ID',
      value: savedModelInfo?.settings?.projectId || '',
      validate: 'required maxlength=100',
      validateMessage: 'Please provide a valid Project ID that is less than 100 characters.',
    },
    region: {
      type: 'select',
      label: 'Region',
      value: savedModelInfo?.settings?.region || DEFAULT_VALUES[CustomLLMProviders.VertexAI].region,
      options: VERTEX_AI_REGIONS,
      validate: 'required',
      validateMessage: 'Region is required',
    },
  };

  return modelSettingFields;
}

export const customModelHelper = {
  addButtonClickHandler,
  hasCustomLLMAccess,
  actionsHandler,
};
