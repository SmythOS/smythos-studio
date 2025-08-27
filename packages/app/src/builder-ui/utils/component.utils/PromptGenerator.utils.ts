import { getVaultData } from '../vault.utils';
import { setRangeInputValue, replaceValidationRules } from './index';
import { createSpinner } from '../general.utils';
import llmParams from '../../params/LLM.params.json';
import { getAllowedContextTokens, getAllowedCompletionTokens } from '../LLM.utils';

declare var Metro, $;

// ! DEPRECATED file in favor of src/frontend/helpers/LLMFormController.helper.ts, will be replaced by LLMFormController

const toggleFields = (modelField: HTMLSelectElement) => {
  const formGroupElms = modelField
    .closest('.form')
    .querySelectorAll('.form-group, .form-group-div');
  const selectedModel = modelField.value;

  if (formGroupElms && formGroupElms?.length > 0) {
    // Use window models directly to ensure we always have the latest values
    const llm = window['__LLM_MODELS__']?.[selectedModel]?.llm?.toLowerCase();

    for (const formGroupElm of formGroupElms) {
      const fieldElm = formGroupElm.querySelector('[data-supported-models]');

      if (!fieldElm) continue;

      const supportedBy = fieldElm?.getAttribute('data-supported-models');
      const supportedByArr = supportedBy?.split(',').map((item) => item.toLowerCase());

      if (supportedByArr.includes('all') || supportedByArr.includes(llm)) {
        formGroupElm.classList.remove('hidden');
      } else {
        formGroupElm.classList.add('hidden');
      }
      const hideStopField = ['o1', 'o1-mini', 'o1-preview']?.includes(selectedModel?.toLowerCase());
      if (hideStopField) {
        if (formGroupElm.getAttribute('data-field-name') === 'stopSequences') {
          formGroupElm.classList.add('hidden');
        }
      }
    }
  }
};

// * N:B Need to invoke this function with .bind(this), .call(this) or .apply(this) to get the correct context
function updateFieldsInfo(modelField: HTMLSelectElement) {
  const selectedModel = modelField.value;
  // Use window models directly to ensure we always have the latest values
  const llm = window['__LLM_MODELS__']?.[selectedModel]?.llm?.toLowerCase();

  const formElm = modelField.closest('.form');

  const temperatureField = formElm.querySelector('#temperature') as HTMLInputElement;
  const stopSequencesField = formElm.querySelector('#stopSequences') as HTMLInputElement;
  const topPField = formElm.querySelector('#topP') as HTMLInputElement;
  const topKField = formElm.querySelector('#topK') as HTMLInputElement;
  const frequencyPenaltyField = formElm.querySelector('#frequencyPenalty') as HTMLInputElement;
  const presencePenaltyField = formElm.querySelector('#presencePenalty') as HTMLInputElement;

  const {
    defaultTemperature,
    maxTemperature,
    defaultTopP,
    minTopP,
    maxTopP,
    defaultTopK,
    minTopK,
    maxTopK,
    maxFrequencyPenalty,
    maxPresencePenalty,
    maxStopSequences,
    hint,
  } = llmParams[llm] || llmParams['default'];

  // Update field function
  function updateField({ fieldElm, minValue, maxValue, defaultValue }) {
    const currentValue = parseFloat(fieldElm.value);

    if (currentValue > maxValue) {
      fieldElm.value = maxValue;
    } else if (currentValue < minValue) {
      fieldElm.value = minValue;
    }

    replaceValidationRules({
      fieldElm,
      attribute: 'min',
      targetValue: minValue,
      inputType: 'range',
    });
    replaceValidationRules({
      fieldElm,
      attribute: 'max',
      targetValue: maxValue,
      inputType: 'range',
    });
    setRangeInputValue(formElm, fieldElm.id, fieldElm.value || defaultValue);
  }

  // Update temperature field
  updateField({
    fieldElm: temperatureField,
    minValue: 0,
    maxValue: maxTemperature,
    defaultValue: defaultTemperature,
  });
  temperatureField.closest('.form-group').setAttribute('data-hint-text', hint.temperature);

  // Update stopSequences field
  replaceValidationRules({
    fieldElm: stopSequencesField,
    attribute: 'data-max-tags',
    targetValue: maxStopSequences,
  });
  stopSequencesField.closest('.form-group').setAttribute('data-hint-text', hint.stopSequences);
  const stopSequencesData = $(stopSequencesField).data('taginput');
  if (stopSequencesData && typeof stopSequencesData.clear === 'function') {
    stopSequencesData.clear();
  }

  // Update Top P field
  updateField({
    fieldElm: topPField,
    minValue: minTopP,
    maxValue: maxTopP,
    defaultValue: defaultTopP,
  });
  topPField.closest('.form-group').setAttribute('data-hint-text', hint.topP);

  // Update Top K field
  updateField({
    fieldElm: topKField,
    minValue: minTopK,
    maxValue: maxTopK,
    defaultValue: defaultTopK,
  });
  topKField.closest('.form-group').setAttribute('data-hint-text', hint.topK);

  // Update Frequency Penalty field
  updateField({
    fieldElm: frequencyPenaltyField,
    minValue: 0,
    maxValue: maxFrequencyPenalty,
    defaultValue: 0,
  });
  frequencyPenaltyField
    .closest('.form-group')
    .setAttribute('data-hint-text', hint.frequencyPenalty);

  // Update Presence Penalty field
  updateField({
    fieldElm: presencePenaltyField,
    minValue: 0,
    maxValue: maxPresencePenalty,
    defaultValue: 0,
  });
  presencePenaltyField.closest('.form-group').setAttribute('data-hint-text', hint.presencePenalty);
}

// * N:B Need to invoke this function with .bind(this), .call(this) or .apply(this) to get the correct context
function updateMaxTokens(modelField: HTMLSelectElement) {
  const formElm = modelField.closest('.form');

  if (!formElm) return;

  const maxTokensElm = formElm.querySelector('#maxTokens') as HTMLInputElement;

  // Show spinner as we need to get the API key info from the vault
  const spinner = createSpinner('grey', 'mt-1 mr-2');
  const formGroup = maxTokensElm.closest('.form-group');
  formGroup.querySelector('.form-label').appendChild(spinner);

  /*
        We get the model with the field ID instead of the event.target.value
        As updateMaxTokens() used outside of the event handler
    */
  const model = (formElm?.querySelector('#model') as HTMLSelectElement)?.value;

  // Use window models directly to ensure we always have the latest values
  const llm =
    window['__LLM_MODELS__']?.[model]?.provider?.toLowerCase() ||
    window['__LLM_MODELS__']?.[model]?.llm?.toLowerCase(); // ! DEPRECATED: `llm` property will be removed in the future

  // Set the hint text
  const { hint } = llmParams[llm] || llmParams['default'];
  formGroup.setAttribute('data-hint-text', hint.maxTokens);

  // TODO: While the maximum tokens are accessible through window['__LLM_MODELS__'], we still need fetch the key and models info from the server and verify the maximum tokens to synchronize with the addition or removal of vault keys. Or need to find a different ways
  /* const { data: apiKeyInfo = null } = await getVaultData({
        scope: 'global',
        keyId: llm,
        ignoreCache: true, // ignore cache result in case the user has the builder page in incognito mode
    });
    const hasAPIKey = !!apiKeyInfo; // apiKeyInfo is null if there is no API key */

  const allowedMaxTokens = getAllowedCompletionTokens(model);
  //console.log(`Allowed max tokens for model ${model}: ${allowedMaxTokens}`);
  // Check if model is 'o1-preview' or 'gpt-o1-mini' and enforce minimum value
  if (['o1', 'o1-mini', 'o1-preview'].includes(model)) {
    const currentMaxTokensValue = maxTokensElm.valueAsNumber;
    if (currentMaxTokensValue < 1536) {
      maxTokensElm.value = '1536'; // Set to minimum required value
    }
  }
  replaceValidationRules({
    fieldElm: maxTokensElm,
    attribute: 'max',
    targetValue: allowedMaxTokens,
    inputType: 'range',
  });

  const { defaultMaxTokens } = llmParams[llm] || llmParams['default'];

  const currentMaxTokensValue =
    maxTokensElm.valueAsNumber >= defaultMaxTokens ? maxTokensElm.valueAsNumber : defaultMaxTokens;
  const newMaxTokensValue = Math.min(currentMaxTokensValue, allowedMaxTokens);
  //console.log(`Updating max tokens: current value = ${currentMaxTokensValue}, new value = ${newMaxTokensValue}`);

  setRangeInputValue(formElm, 'maxTokens', `${newMaxTokensValue}`);

  // update the context tokens information
  const allowedMaxContextTokens = getAllowedContextTokens(model);
  //console.log(`Allowed max tokens for model ${model}: ${allowedMaxTokens}`);

  const contextTokensElm = formElm.querySelector('#maxContextTokens') as HTMLInputElement;

  if (contextTokensElm) {
    contextTokensElm.querySelector('.tokens_num').textContent = allowedMaxContextTokens
      ? allowedMaxContextTokens.toLocaleString() + ' tokens'
      : 'Unknown';
  }

  // Remove the spinner
  spinner.remove();
}

export default {
  toggleFields,
  updateFieldsInfo,
  updateMaxTokens,
};
