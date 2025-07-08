import llmParams from '../../params/LLM.params.json';
import { createSpinner } from '../general.utils';
import { getAllowedContextTokens, getAllowedCompletionTokens } from '../LLM.utils';
import { setRangeInputValue, replaceValidationRules } from './index';

const toggleFields = (event) => {
  const modelField = event?.target as HTMLSelectElement;

  const formGroupElms = modelField
    .closest('.form')
    .querySelectorAll('.form-group, .form-group-div');
  const selectedModel = modelField.value;

  if (formGroupElms && formGroupElms?.length > 0) {
    // Use window models directly to ensure we always have the latest values
    const llm = window['__LLM_MODELS__']?.[selectedModel]?.llm;

    for (const formGroupElm of formGroupElms) {
      const fieldElm = formGroupElm.querySelector('[data-supported-models]');

      if (!fieldElm) continue;

      const supportedBy = fieldElm.getAttribute('data-supported-models');
      const supportedByArr = supportedBy.split(',').map((item) => item.toLowerCase());

      if (supportedByArr.includes('all') || supportedByArr.includes(llm?.toLowerCase())) {
        formGroupElm.classList.remove('hidden');
      } else {
        formGroupElm.classList.add('hidden');
      }
    }
  }
};

// * N:B Need to invoke this function with .bind(this), .call(this) or .apply(this) to get the correct context
function updateMaxTokens(event) {
  const target = event.target as HTMLSelectElement;
  const formElm = target.closest('.form');

  if (!formElm) return;

  const maxTokensElm = formElm.querySelector('#maxTokens') as HTMLInputElement;

  // Show loader as we need to get the API key info from the vault
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

  replaceValidationRules({
    fieldElm: maxTokensElm,
    attribute: 'max',
    targetValue: allowedMaxTokens,
    inputType: 'range',
  });

  const { defaultMaxTokens } = llmParams[llm] || llmParams['default'];

  const currentMaxTokensValue = maxTokensElm.valueAsNumber || defaultMaxTokens;
  const newMaxTokensValue = Math.min(currentMaxTokensValue, allowedMaxTokens);
  //console.log(`Updating max tokens: current value = ${currentMaxTokensValue}, new value = ${newMaxTokensValue}`);

  setRangeInputValue(formElm, 'maxTokens', `${newMaxTokensValue}`);

  // update the context tokens information
  const allowedMaxContextTokens = getAllowedContextTokens(model);
  //console.log(`Allowed max context tokens for model ${model}: ${allowedMaxContextTokens}`);

  const contextTokensElm = formElm.querySelector('#maxContextTokens') as HTMLInputElement;

  if (contextTokensElm) {
    contextTokensElm.querySelector('.tokens_num').textContent = allowedMaxContextTokens
      ? allowedMaxContextTokens.toLocaleString() + ' tokens'
      : 'Unknown';
  }

  // Remove the loader
  spinner.remove();
}

export default {
  toggleFields,
  updateMaxTokens,
};
