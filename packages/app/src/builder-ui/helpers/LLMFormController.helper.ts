import { LLMRegistry } from '../../shared/services/LLMRegistry.service';
import llmParams from '../params/LLM.params.json';
import { generateModelCapabilityBadges, generateModelStatusBadges } from '../ui/badges';
import {
  updateInactiveEffectState,
  updateMutualExclusiveHintsVisibility,
} from '../ui/form/mutually-exclusive-fields';
import { createSpinner } from '../utils/general.utils';

declare var $;

export class LLMFormController {
  public static toggleFields(modelField: HTMLSelectElement) {
    const formGroupElms = modelField
      .closest('.form')
      .querySelectorAll('.form-group, .form-group-div');
    const selectedModel = modelField.value;

    if (formGroupElms && formGroupElms?.length > 0) {
      // Use window models directly to ensure we always have the latest values
      const provider =
        window['__LLM_MODELS__']?.[selectedModel]?.provider?.toLowerCase() ||
        window['__LLM_MODELS__']?.[selectedModel]?.llm?.toLowerCase();

      for (const formGroupElm of formGroupElms) {
        const fieldElm = formGroupElm.querySelector('[data-supported-models]');

        if (!fieldElm) continue;

        const supportedBy = fieldElm.getAttribute('data-supported-models');
        const supportedByArr =
          supportedBy?.split(',').map((item) => item?.toLowerCase()?.trim()) || [];
        const excludedBy = fieldElm.getAttribute('data-excluded-models');
        const excludedByArr =
          excludedBy?.split(',').map((item) => item?.toLowerCase()?.trim()) || [];

        if (
          (supportedByArr.includes('all') ||
            supportedByArr.includes(provider) ||
            supportedByArr.includes(selectedModel?.toLowerCase())) &&
          !excludedByArr.includes(selectedModel?.toLowerCase())
        ) {
          formGroupElm.classList.remove('hidden');
        } else {
          formGroupElm.classList.add('hidden');
        }
        const hideStopField = ['o1', 'o1-mini', 'o1-preview']?.includes(
          selectedModel?.toLowerCase(),
        );
        if (hideStopField) {
          if (formGroupElm.getAttribute('data-field-name') === 'stopSequences') {
            formGroupElm.classList.add('hidden');
          }
        }
      }
    }
  }

  public static updateFieldsInfo(modelField: HTMLSelectElement) {
    const selectedModel = modelField.value;
    // Use window models directly to ensure we always have the latest values
    const llm =
      window['__LLM_MODELS__']?.[selectedModel]?.provider?.toLowerCase() ||
      window['__LLM_MODELS__']?.[selectedModel]?.llm?.toLowerCase();

    const formElm = modelField.closest('.form');

    const temperatureField = formElm.querySelector('#temperature') as HTMLInputElement;
    const stopSequencesField = formElm.querySelector('#stopSequences') as HTMLInputElement;
    const topPField = formElm.querySelector('#topP') as HTMLInputElement;
    const topKField = formElm.querySelector('#topK') as HTMLInputElement;
    const frequencyPenaltyField = formElm.querySelector('#frequencyPenalty') as HTMLInputElement;
    const presencePenaltyField = formElm.querySelector('#presencePenalty') as HTMLInputElement;

    const {
      defaultTemperature,
      minTemperature,
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

    // Update temperature field
    this.updateField({
      formElm,
      fieldElm: temperatureField,
      minValue: minTemperature,
      maxValue: maxTemperature,
      defaultValue: defaultTemperature,
    });
    temperatureField.closest('.form-group').setAttribute('data-hint-text', hint.temperature);

    // Update stopSequences field
    this.replaceValidationRules({
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
    this.updateField({
      formElm,
      fieldElm: topPField,
      minValue: minTopP,
      maxValue: maxTopP,
      defaultValue: defaultTopP,
    });
    topPField.closest('.form-group').setAttribute('data-hint-text', hint.topP);

    // Update Top K field
    this.updateField({
      formElm,
      fieldElm: topKField,
      minValue: minTopK,
      maxValue: maxTopK,
      defaultValue: defaultTopK,
    });
    topKField.closest('.form-group').setAttribute('data-hint-text', hint.topK);

    // Update Frequency Penalty field
    this.updateField({
      formElm,
      fieldElm: frequencyPenaltyField,
      minValue: 0,
      maxValue: maxFrequencyPenalty,
      defaultValue: 0,
    });
    frequencyPenaltyField
      .closest('.form-group')
      .setAttribute('data-hint-text', hint.frequencyPenalty);

    // Update Presence Penalty field
    this.updateField({
      formElm,
      fieldElm: presencePenaltyField,
      minValue: 0,
      maxValue: maxPresencePenalty,
      defaultValue: 0,
    });
    presencePenaltyField
      .closest('.form-group')
      .setAttribute('data-hint-text', hint.presencePenalty);

    // Update mutual exclusive hints visibility based on the selected model
    // Hints are only shown for models in the whitelist (e.g., Anthropic models)
    updateMutualExclusiveHintsVisibility(formElm as HTMLFormElement);
  }

  // * N:B Need to invoke this function with .bind(this), .call(this) or .apply(this) to get the correct context
  public static updateMaxTokens(modelField: HTMLSelectElement) {
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
    const _llmParams = llmParams[llm] || llmParams['default'];
    formGroup.setAttribute('data-hint-text', _llmParams.hint.maxTokens);

    // TODO: While the maximum tokens are accessible through window['__LLM_MODELS__'], we still need fetch the key and models info from the server and verify the maximum tokens to synchronize with the addition or removal of vault keys. Or need to find a different ways
    /* const { data: apiKeyInfo = null } = await getVaultData({
        scope: 'global',
        keyId: llm,
        ignoreCache: true, // ignore cache result in case the user has the builder page in incognito mode
    });
    const hasAPIKey = !!apiKeyInfo; // apiKeyInfo is null if there is no API key */

    const allowedMaxTokens = LLMRegistry.getAllowedCompletionTokens(model);

    const currentMaxTokensValue = maxTokensElm.valueAsNumber;

    // #region update the min max_tokens information
    const minMaxTokens = _llmParams?.minMaxTokens || 4;
    this.replaceValidationRules({
      fieldElm: maxTokensElm,
      attribute: 'min',
      targetValue: minMaxTokens,
      inputType: 'range',
    });
    // #endregion

    //console.log(`Allowed max tokens for model ${model}: ${allowedMaxTokens}`);
    // Check if model is 'o1-preview' or 'gpt-o1-mini' and enforce minimum value
    // TODO: If 1536 is really required as minimum then we need to find out a way to set it from the Component class (for example GenAILLM.class.ts)
    if (['o1', 'o1-mini', 'o1-preview'].includes(model)) {
      if (currentMaxTokensValue < 1536) {
        maxTokensElm.value = '1536'; // Set to minimum required value
      }
    }
    this.replaceValidationRules({
      fieldElm: maxTokensElm,
      attribute: 'max',
      targetValue: allowedMaxTokens,
      inputType: 'range',
    });

    let newMaxTokensValue = Math.min(currentMaxTokensValue, allowedMaxTokens); // Ensure the value is not greater than the allowed maximum value
    newMaxTokensValue = Math.max(newMaxTokensValue, minMaxTokens); // Ensure the value is not less than the minimum allowed value

    this.setRangeInputValue(formElm, 'maxTokens', `${newMaxTokensValue}`);

    // Remove the spinner
    spinner.remove();
  }

  public static updateMaxThinkingTokens(modelField: HTMLSelectElement) {
    const formElm = modelField.closest('.form');

    if (!formElm) return;

    const maxThinkingTokensElm = formElm.querySelector('#maxThinkingTokens') as HTMLInputElement;
    const maxTokensElm = formElm.querySelector('#maxTokens') as HTMLInputElement;

    if (!maxThinkingTokensElm || !maxTokensElm) return;

    const model = (formElm?.querySelector('#model') as HTMLSelectElement)?.value;
    const provider = window['__LLM_MODELS__']?.[model]?.provider?.toLowerCase();
    const _llmParams = llmParams[provider] || llmParams['default'];
    const defaultThinkingTokens = _llmParams?.defaultThinkingTokens || 1024;

    const allowedMaxReasoningTokens = LLMRegistry.getMaxReasoningTokens(model);

    if (maxThinkingTokensElm) {
      this.replaceValidationRules({
        fieldElm: maxThinkingTokensElm,
        attribute: 'min',
        targetValue: defaultThinkingTokens,
        inputType: 'range',
      });

      this.replaceValidationRules({
        fieldElm: maxThinkingTokensElm,
        attribute: 'max',
        targetValue: allowedMaxReasoningTokens,
        inputType: 'range',
      });

      const validMaxThinkingTokens = Math.min(
        allowedMaxReasoningTokens,
        maxThinkingTokensElm.valueAsNumber,
      );

      this.setRangeInputValue(formElm, 'maxThinkingTokens', `${validMaxThinkingTokens}`);
    }
  }

  public static updateContextSize(modelField: HTMLSelectElement) {
    const formElm = modelField.closest('.form');

    if (!formElm) return;

    const model = (formElm?.querySelector('#model') as HTMLSelectElement)?.value;

    // #region update the context tokens information
    const allowedMaxContextTokens = LLMRegistry.getAllowedContextTokens(model);

    const contextTokensElm = formElm.querySelector('#maxContextTokens') as HTMLInputElement;

    if (contextTokensElm) {
      if (allowedMaxContextTokens) {
        contextTokensElm.querySelector('.tokens_num').textContent =
          allowedMaxContextTokens.toLocaleString();
        contextTokensElm.classList.remove('hidden');
      } else {
        contextTokensElm.classList.add('hidden');
      }
    }
    // #endregion

    // #region update the web search context size information
    const allowedWebSearchContextTokens = LLMRegistry.getWebSearchContextTokens(model);

    const webSearchContextSizeElm = formElm.querySelector(
      '#webSearchContextSizeInfo',
    ) as HTMLInputElement;

    if (webSearchContextSizeElm) {
      if (allowedWebSearchContextTokens) {
        webSearchContextSizeElm.querySelector('.tokens_num').textContent =
          allowedWebSearchContextTokens.toLocaleString();
        webSearchContextSizeElm.classList.remove('hidden');
      } else {
        webSearchContextSizeElm.classList.add('hidden');
      }
    }

    // #endregion
  }

  /**
   * Latest version that filters models based on specific required features.
   * Most flexible approach for feature-based model selection.
   *
   * @param targetFeatures - Array of feature strings to filter models by. Models must support at least one of these features.
   *                        For example: ['text', 'image', 'image-generation']
   * @returns Array of model objects containing:
   *  - text: Display name with spacing for badges
   *  - value: Internal model identifier
   *  - badge: HTML string with both status and capability badges
   *  - tags: Array of model tags for sorting/filtering```````````````````
   */
  public static prepareModelSelectOptionsByFeatures(
    targetFeatures: string[],
    selectedModel?: string,
  ) {
    try {
      let modelOptions = [];

      const models = LLMRegistry.getSortedModelsByFeatures({
        features: targetFeatures,
        selectedModel,
      });

      for (const model of models) {
        let tags = model?.tags || [];
        let features = model?.features || [];

        // Show badges for supported features from target features
        const featuresSet = new Set(features);
        const supportedFeatures = targetFeatures.filter((feature) => featuresSet.has(feature));

        const statusBadges = generateModelStatusBadges(tags);
        const capabilityBadges = generateModelCapabilityBadges(supportedFeatures);

        // Model name moved to badge section to allow custom HTML structure for design requirements
        modelOptions.push({
          text: '',
          value: model.entryId,
          badge: `<span class="model-name-badge"><span class="model-name">${model?.label}</span> <span class="all-badges">${statusBadges}</span></span> <span class="float-right">${capabilityBadges}</span>`,
          tags,
          default: model?.default || false,
        });
      }

      return modelOptions;
    } catch (error) {
      console.error('Error preparing model select options:', error);
      return [];
    }
  }

  /**
   * Gets the default model entry ID from a collection of model options.
   * Returns the model marked as default, or the first available model.
   *
   * @param models - Array of model objects with value and optional default flag
   * @returns {string} The default model's entry ID, or empty string if none available
   */
  public static getDefaultModel(models: Array<{ value: string; default?: boolean }>): string {
    return models?.find((m) => m?.default === true)?.value || models?.[0]?.value;
  }

  // * Test this function interactively in case it may replace wrong text/value
  private static replaceValidationRules({
    fieldElm,
    attribute,
    targetValue,
    inputType = '',
  }: {
    fieldElm: HTMLInputElement;
    attribute: string;
    targetValue: number;
    inputType?: string;
  }) {
    if (!fieldElm) return;

    const currentValue = fieldElm?.getAttribute(attribute);
    const formGroupElm = fieldElm.closest('.form-group');

    // Update the HTML built-in attribute
    if (fieldElm.getAttribute(attribute)) {
      fieldElm.setAttribute(attribute, `${targetValue}`);
    }
    if (inputType === 'range') {
      const numFieldElm = formGroupElm.querySelector(`[data-rel="#${fieldElm?.id}"]`);
      if (numFieldElm?.getAttribute(attribute)) {
        numFieldElm.setAttribute(attribute, `${targetValue}`);
      }
    }

    // Update the Metro UI validation rules
    if (fieldElm.getAttribute('data-validate')) {
      const currentValidationRules = fieldElm.getAttribute('data-validate');
      // preceding '=' is to ensure that we are replacing the exact value case like 0, 0.01 etc.
      const newValidationRules = currentValidationRules.replace(
        `=${currentValue}`,
        `=${targetValue}`,
      );
      fieldElm.setAttribute('data-validate', newValidationRules);
    }

    // Update the error message
    const invalidFeedbackElm = formGroupElm?.querySelector('.invalid_feedback');

    if (invalidFeedbackElm) {
      // preceding ' ' is to ensure that we are replacing the exact value case like 0, 0.01 etc.
      invalidFeedbackElm.innerHTML = invalidFeedbackElm.innerHTML.replace(
        ` ${currentValue}`,
        ` ${targetValue}`,
      );
    }
  }

  // The formElm ensures that we are in the correct context, even when there are multiple IDs on the same page.
  private static setRangeInputValue(formElm, id, value) {
    if (formElm) {
      // Find elements within the form by ID and data-rel attribute
      const rangeField = formElm.querySelector(`#${id}`);
      const numField = formElm.querySelector(`[data-rel="#${id}"]`);

      // Set the value if the elements are found
      if (rangeField) rangeField.value = value;
      if (numField) numField.value = value;
    }
  }

  /**
   * Updates a field's validation rules and value when switching between LLM models.
   *
   * This method handles two main scenarios:
   * 1. **Standard fields**: Clamps values to new min/max range
   * 2. **Mutually exclusive fields**: Resets to provider-specific defaults when applicable
   *
   * ## Mutually Exclusive Fields
   *
   * Some fields are mutually exclusive for certain providers (e.g., Anthropic's
   * temperature and top_p). These fields are marked with `data-mutually-exclusive`
   * attribute containing configuration:
   *
   * ```json
   * {
   *   "group": "sampling-params",
   *   "models": ["claude-3-opus", "claude-3-sonnet"],
   *   "reset": -0.01,
   *   "reason": "..."
   * }
   * ```
   *
   * When switching models, if the new model is in the field's whitelist and the
   * current value doesn't match the reset value, the field is reset to maintain
   * proper mutual exclusivity.
   *
   * ### Example: OpenAI → Anthropic
   * - OpenAI uses Top P = 1 (both temperature and top_p can be set)
   * - Anthropic requires Top P = -0.01 (only temperature OR top_p)
   * - When switching to Claude, Top P resets from 1 to -0.01 ("not set")
   *
   * @param formElm - Parent form element for context
   * @param fieldElm - Input element to update
   * @param minValue - New minimum value for the field
   * @param maxValue - New maximum value for the field
   * @param defaultValue - Default value for the new model
   */
  private static updateField({ formElm, fieldElm, minValue, maxValue, defaultValue }) {
    const currentValue = parseFloat(fieldElm.value);
    let newValue = currentValue;

    // First, check for mutually exclusive field configuration
    const shouldResetForMutualExclusivity = this.shouldResetMutuallyExclusiveField(
      fieldElm,
      formElm,
      currentValue,
      defaultValue,
    );

    if (shouldResetForMutualExclusivity) {
      // Reset to the configured reset value (e.g., -0.01 for Anthropic)
      newValue = defaultValue;
    } else if (currentValue > maxValue) {
      // Clamp to maximum if current value exceeds new range
      newValue = maxValue;
    } else if (currentValue < minValue) {
      // Clamp to minimum if current value is below new range
      newValue = minValue;
    }

    // Update validation rules to reflect new model's constraints
    this.replaceValidationRules({
      fieldElm,
      attribute: 'min',
      targetValue: minValue,
      inputType: 'range',
    });
    this.replaceValidationRules({
      fieldElm,
      attribute: 'max',
      targetValue: maxValue,
      inputType: 'range',
    });

    // Apply the new value to both range and number inputs
    this.setRangeInputValue(formElm, fieldElm.id, newValue);

    // Update visual state (blur effect for negative/"not set" values)
    updateInactiveEffectState(fieldElm);
  }

  /**
   * Determines if a field should be reset based on mutually exclusive configuration.
   *
   * A field should be reset when:
   * 1. It has a `data-mutually-exclusive` attribute
   * 2. The current model is in the field's whitelist
   * 3. The current value is not already the reset value (avoid unnecessary resets)
   *
   * @param fieldElm - The field element to check
   * @param formElm - Parent form element (to get current model)
   * @param currentValue - Current numeric value of the field
   * @param resetValue - The value to reset to (from provider config)
   * @returns true if field should be reset to resetValue
   */
  private static shouldResetMutuallyExclusiveField(
    fieldElm: HTMLElement,
    formElm: HTMLElement,
    currentValue: number,
    resetValue: number,
  ): boolean {
    // Check if field has mutually exclusive configuration
    const mutualExclusiveAttr = fieldElm.getAttribute('data-mutually-exclusive');
    if (!mutualExclusiveAttr) {
      return false; // Not a mutually exclusive field
    }

    try {
      const config = JSON.parse(mutualExclusiveAttr);

      // Get the current model from the form
      const modelSelector = formElm.querySelector('#model') as HTMLSelectElement;
      if (!modelSelector) {
        return false; // Can't determine model, skip reset
      }

      const currentModel = modelSelector.value?.toLowerCase();
      if (!currentModel) {
        return false;
      }

      // Check if current model is in the whitelist
      const whitelistedModels = config.models || [];
      const isModelApplicable =
        whitelistedModels.length === 0 || // Empty whitelist = apply to all models
        whitelistedModels.some((model: string) => model.toLowerCase() === currentModel);

      if (!isModelApplicable) {
        return false; // Model not in whitelist, don't reset
      }

      // Use the reset value from config if specified, otherwise use resetValue parameter
      const targetResetValue = config.reset !== undefined ? config.reset : resetValue;

      // Only reset if current value is different from target reset value
      // This avoids unnecessary resets when value is already correct
      // Use small epsilon for floating point comparison
      const epsilon = 0.0001;
      const isDifferent = Math.abs(currentValue - targetResetValue) > epsilon;

      return isDifferent;
    } catch (error) {
      // If config parsing fails, don't reset (fail gracefully)
      console.warn('Failed to parse data-mutually-exclusive config:', error);
      return false;
    }
  }
}
