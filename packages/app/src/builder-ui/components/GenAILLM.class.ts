// TODO: Refactor this file (specially setting fields for different providers)
import { LLMRegistry } from '../../shared/services/LLMRegistry.service';
import { REASONING_EFFORTS } from '../constants';
import { LLMFormController } from '../helpers/LLMFormController.helper';
import llmParams from '../params/LLM.params.json';
import { createBadge } from '../ui/badges';
import { IconArrowRight, IconConfigure } from '../ui/icons';
import { refreshLLMModels, saveApiKey, setupSidebarTooltips } from '../utils';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// Since getWebSearchFields is called multiple times, using a static import is more efficient than a lazy import.
import ianaTimezones from '../params/IANA-time-zones';
import isoCountryCodes from '../params/ISO-country-code';

declare var Metro;

/*
 * Here field name like model, apiKey, temperature is very important
 * Because we have ID like #model, #apiKey, #temperature in the HTML
 * And we use those IDs to find the fields and update info in `../utils/component.utils/PromptGenerator.utils.ts`
 *
 */

export class GenAILLM extends Component {
  private modelOptions: string[];
  private modelParams: Record<string, any>;
  private defaultModel: string;
  private anthropicThinkingModels: string[];
  private openaiReasoningModels: string[];
  private groqReasoningModels: string[];
  private searchModels: string[];
  private gpt5ReasoningModels: string[];
  private gpt5Models: string[];
  private gptO3andO4Models: string[];
  private gptSearchModels: string[];

  protected async prepare() {
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures([
      'text',
      'image',
      'audio',
      'video',
      'document',
      'tools',
      'search',
      'reasoning',
    ]);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

    this.anthropicThinkingModels = LLMRegistry.getSortedModelsByFeatures(
      'reasoning',
      'anthropic',
    ).map((m) => m.entryId);
    this.openaiReasoningModels = LLMRegistry.getModelsByFeatures('reasoning', 'openai').map(
      (m) => m.entryId,
    );
    this.groqReasoningModels = LLMRegistry.getModelsByFeatures('reasoning', 'groq').map(
      (m) => m.entryId,
    );
    this.searchModels = LLMRegistry.getModelsByFeatures('search').map((m) => m.entryId);

    // Why getGpt5ReasoningModels instead of gptReasoningModels, some field like reasoning effort, verbosity etc only supported by gpt 5 models right now.
    this.gpt5ReasoningModels = LLMRegistry.getGpt5ReasoningModels();

    this.gpt5Models = LLMRegistry.getGpt5Models();
    this.gptO3andO4Models = LLMRegistry.getO3andO4Models();
    this.gptSearchModels = LLMRegistry.getModelsByFeatures('search', 'openai').map(
      (m) => m.entryId,
    );

    modelOptions.unshift('Echo');
    const model = this.data.model || this.defaultModel;

    //prevent losing the previously set model
    if (model && ![...modelOptions.map((item) => item?.value || item)].includes(model)) {
      modelOptions.push({
        text: model + '&nbsp;&nbsp', // Add non-breaking space entities to create visual spacing between model name and badge
        value: model,
        badge: createBadge('Removed', 'text-smyth-red-500 border-smyth-red-500'),
      });
    }

    // TODO: set warning if the model is not available

    //remove undefined models
    this.modelOptions = modelOptions.filter((e) => e);

    this.setModelParams(model);

    return true;
  }

  protected async init() {
    this.settings = await this.generateSettings();

    const dataEntries = [
      'model',
      'prompt',
      'temperature',
      'maxTokens',
      'stopSequences',
      'topP',
      'topK',
      'frequencyPenalty',
      'presencePenalty',
      'passthrough',
      'useSystemPrompt',
      'useContextWindow',
      'maxContextWindowLength',

      // Generic web search fields (for providers like OpenAI, Perplexity, etc.)
      'useWebSearch',
      'webSearchContextSize',
      'webSearchCity',
      'webSearchCountry',
      'webSearchRegion',
      'webSearchTimezone',

      // xAI Live Search specific fields
      'useSearch',
      'searchMode',
      'returnCitations',
      'maxSearchResults',
      'searchDataSources',
      'searchCountry',
      'excludedWebsites',
      'allowedWebsites',
      'includedXHandles',
      'excludedXHandles',
      'postFavoriteCount',
      'postViewCount',
      'rssLinks',
      'safeSearch',
      'fromDate',
      'toDate',

      'useReasoning',
      'maxThinkingTokens',
      'reasoningEffort',
      'verbosity',
    ];
    for (let item of dataEntries) {
      // Check if the field needs default value initialization
      const isUndefined = typeof this.data[item] === 'undefined';

      // Special handling for checkbox-group fields: these fields have array default values
      // but often get initialized with empty arrays [] or null instead of undefined.
      // We need to apply defaults when the data is empty, not just when it's undefined.
      const isArrayFieldWithEmptyValue =
        Array.isArray(this.settings[item].value) &&
        (!this.data[item] || (Array.isArray(this.data[item]) && this.data[item].length === 0));

      if (isUndefined || isArrayFieldWithEmptyValue) {
        this.data[item] = this.settings[item].value;
      }
    }

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    this.properties.defaultInputs = [];

    // TODO: When all inputs are removed, we should keep the inputs empty.
    // Currently, we always have 'Input' and 'Attachment' by default.
    // Setting the inputs without checking the length always adds 'Input'
    // and 'Attachment', ignoring any newly added or removed inputs.
    // Making defaultInputs deletable does not work either, as the default
    // inputs are always re-added.
    // Solution: We need to register a new property like `inputsCleared`
    // (true/false) and use it to keep the inputs empty when set to true.
    // Implementation: Use the `endpointRemoved` event to check if the inputs
    // are empty and set `inputsCleared` to true. Ensure the event passes
    // the necessary properties to verify the inputs length.

    // #region [ Inputs and outputs ] ==================
    if (this.properties.inputs.length == 0) this.properties.inputs = ['Input', 'Attachment'];

    const attachmentInputProps = this.properties.inputProps?.find((c) => c.name === 'Attachment');
    if (!attachmentInputProps) {
      this.properties.inputProps.push({ name: 'Attachment', type: 'Binary', optional: true });
    } else {
      attachmentInputProps.optional = true;
      attachmentInputProps.type = 'Binary';
    }

    this.properties.defaultOutputs = ['Reply'];
    // #endregion

    this.drawSettings.displayName = 'GenAI LLM';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription =
      'Make a GenAI request to an AI model. Works with many input file types.';
    this.drawSettings.shortDescription =
      'Make a GenAI request to an AI model. Works with many input file types.';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }

  protected async run() {
    this.addEventListener('settingsOpened', this.handleSettingsOpened.bind(this));
  }

  private async handleSettingsOpened(sidebar, component) {
    if (component !== this) return;

    const form = sidebar.querySelector('form');

    const useContextWindow = form?.querySelector('#useContextWindow') as HTMLInputElement;

    const maxContextWindowLength = form?.querySelector(
      '[data-field-name="maxContextWindowLength"]',
    ) as HTMLInputElement;

    if (useContextWindow.checked) maxContextWindowLength.classList.remove('hidden');
    else maxContextWindowLength.classList.add('hidden');

    await delay(200);
    await setupSidebarTooltips(sidebar, this);

    const useWebSearchElm = form?.querySelector('#useWebSearch') as HTMLInputElement;
    if (useWebSearchElm) {
      this.toggleWebSearchNestedFields(useWebSearchElm, form);
    }

    const useSearchElm = form?.querySelector('#useSearch') as HTMLInputElement;
    if (useSearchElm) {
      this.toggleSearchNestedFields(useSearchElm, form);
    }

    const useReasoningElm = form?.querySelector('#useReasoning') as HTMLInputElement;
    if (useReasoningElm) {
      this.toggleReasoningNestedFields(useReasoningElm, form);
    }

    //const modelElm = sidebar.querySelector('#model');
    // customModelHelper.actionsHandler(this, modelElm); // ! DEPRECATED
  }

  private async saveApiKey(serviceKey, serviceLabel, formData) {
    return await saveApiKey(
      serviceKey,
      serviceLabel,
      formData,
      this.workspace,
      this.refreshLLMModels.bind(this),
    );
  }

  private async refreshLLMModels() {
    await refreshLLMModels(
      this.workspace,
      this.prepare.bind(this),
      this.init.bind(this),
      this.refreshSettingsSidebar.bind(this),
    );
  }

  private async modelChangeHandler(target: HTMLSelectElement) {
    LLMFormController.updateFieldsInfo(target);
    LLMFormController.updateMaxTokens(target);
    LLMFormController.updateContextSize(target);
    LLMFormController.updateMaxThinkingTokens(target);
    /* We need to regenerate settings (this.settings) to sync with updated fields info
            Otherwise, old values will be saved when we update field information during switching models. */
    this.setModelParams(target.value);
    this.settings = await this.generateSettings();

    LLMFormController.toggleFields(target);
  }

  private setModelParams(model: string) {
    const provider =
      window['__LLM_MODELS__']?.[model]?.provider?.toLowerCase() ||
      window['__LLM_MODELS__']?.[model]?.llm?.toLowerCase(); // ! DEPRECATED: `llm` property will be removed in the future
    const modelParams = llmParams[provider] || llmParams['default'];

    this.modelParams = {
      allowedContextTokens: LLMRegistry.getAllowedContextTokens(model),
      allowedCompletionTokens: LLMRegistry.getAllowedCompletionTokens(model),
      allowedWebSearchContextTokens: LLMRegistry.getWebSearchContextTokens(model),
      allowedReasoningTokens: LLMRegistry.getMaxReasoningTokens(model),

      minMaxTokens: modelParams?.minMaxTokens,
      maxTemperature: modelParams?.maxTemperature,
      maxStopSequences: modelParams?.maxStopSequences,
      maxTopP: modelParams?.maxTopP,
      maxTopK: modelParams?.maxTopK,
      defaultFrequencyPenalty: modelParams?.defaultFrequencyPenalty,
      defaultPresencePenalty: modelParams?.defaultPresencePenalty,
      maxFrequencyPenalty: modelParams?.maxFrequencyPenalty,
      maxPresencePenalty: modelParams?.maxPresencePenalty,

      minTopP: modelParams?.minTopP,
      minTopK: modelParams?.minTopK,

      defaultTemperature: modelParams?.defaultTemperature,
      defaultMaxTokens: modelParams?.defaultMaxTokens,
      defaultTopP: modelParams?.defaultTopP,
      defaultTopK: modelParams?.defaultTopK,

      hint: modelParams.hint,
    };
  }

  private async generateSettings(): Promise<Record<string, any>> {
    const {
      allowedContextTokens,
      allowedCompletionTokens,
      allowedWebSearchContextTokens,
      allowedReasoningTokens,
      maxTemperature,
      maxStopSequences,
      maxTopP,
      maxTopK,
      defaultFrequencyPenalty,
      defaultPresencePenalty,
      maxFrequencyPenalty,
      maxPresencePenalty,
      minTopP,
      minTopK,
      defaultTemperature,
      minMaxTokens,
      defaultMaxTokens,
      defaultThinkingTokens,
      defaultTopP,
      defaultTopK,
      hint,
    } = this.modelParams;

    const defaultPromptValue = `Summarize {{Input}} in one paragraph.`;

    return {
      model: {
        type: 'select',
        label: 'Select a Model',
        help: 'Choose the model that will generate and interpret text. <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=model#step-1-choose-a-model" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        hintPosition: 'after_label',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        value: this.defaultModel,
        options: this.modelOptions,
        class: 'mt-1',
        dropdownHeight: 350, // In pixels
        attributes: { 'data-supported-models': 'all' },

        events: {
          change: async (event) => {
            const currentElement = event.target as HTMLSelectElement;
            await this.modelChangeHandler(currentElement);

            // #region Hide show pricing link for SmythOS models
            const formGroupElm = currentElement.closest('.form-group');
            const pricingLinkElm = formGroupElm?.querySelector(
              '.field-action-btn._model_pricing_link',
            );
            if (currentElement.value.startsWith('smythos/')) {
              pricingLinkElm?.classList?.remove('hidden');
            } else {
              pricingLinkElm?.classList?.add('hidden');
            }
            // #endregion

            // #region Toggle web search nested fields on model change
            const form = currentElement.closest('form');
            const useWebSearchElm = form?.querySelector('#useWebSearch') as HTMLInputElement;

            if (useWebSearchElm) {
              this.toggleWebSearchNestedFields(useWebSearchElm, form);
            }
            // #endregion

            // #region Toggle search nested fields on model change
            const useSearchElm = form?.querySelector('#useSearch') as HTMLInputElement;
            if (useSearchElm) {
              this.toggleSearchNestedFields(useSearchElm, form);
            }
            // #endregion

            // #region Hide provider-specific fields when switching models
            const provider = LLMRegistry.getModelProvider(currentElement.value);
            if (provider.toLowerCase() !== 'xai') {
              this.hideXAISpecificFields(form);
            }
            if (provider.toLowerCase() !== 'openai') {
              this.hideOpenAIWebSearchFields(form);
            }
            // #endregion

            // #region Toggle reasoning nested fields on model change
            const useReasoningElm = form?.querySelector('#useReasoning') as HTMLInputElement;
            if (useReasoningElm) {
              this.toggleReasoningNestedFields(useReasoningElm, form);
            }
            // #endregion

            // #region Update verbosity field visibility based on model
            this.updateVerbosityFieldVisibility(currentElement.value, form);
            // #endregion
          },
        },

        //#region // ! DEPRECATED, will be removed in the future
        // loading: true,
        // actions: [
        //   {
        //     label: 'Custom Model',
        //     icon: 'fa-regular fa-plus',
        //     id: 'customModelAddButton',
        //     classes: 'custom_model_add_btn',
        //     shouldDisplay: async () => {
        //       try {
        //         const shouldDisplay = await customModelHelper.shouldDisplayAddButton();

        //         return shouldDisplay;
        //       } finally {
        //         // * This is a quick solution to show the spinner using the 'loading' attribute and remove it here after checking if the button should be displayed or not
        //         const modelElm = document.getElementById('model');
        //         const formGroupElm = modelElm?.closest('.form-group');
        //         const spinnerElm = formGroupElm?.querySelector('.field-spinner');
        //         spinnerElm?.remove();
        //       }
        //     },
        //     afterCreation: () => {
        //       const model = document.getElementById('model');
        //       const modelWrapperElm = model?.closest('.select.smt-input-select');
        //       const dropdownIconElm = modelWrapperElm?.querySelector(
        //         '.dropdown-toggle',
        //       ) as HTMLElement;

        //       if (dropdownIconElm) {
        //         dropdownIconElm.style.right = '115px';
        //       }
        //     },
        //     events: {
        //       click: (event) => customModelHelper.addButtonClickHandler(this, event),
        //     },
        //   },
        // ],
        //#endregion

        actions: [
          {
            label: 'Configure more models',
            icons: {
              left: {
                svg: IconConfigure,
                classes: 'mr-2',
              },
              right: {
                svg: IconArrowRight,
                classes: 'absolute right-4',
              },
            },
            position: 'after-dropdown',
            id: 'configureMoreModelsBtn',
            classes: 'custom_model_add_btn',
            events: {
              click: () => {
                window.open('/vault', '_blank');
              },
            },
          },
          {
            label: '$ View Pricing',
            icon: 'dollar-sign',
            classes: 'text-gray-600 top-[-8px] right-2 hover:underline _model_pricing_link hidden',
            tooltip: 'SmythOS charges based on input and output tokens',
            events: {
              click: () => {
                window.open(
                  `${this.workspace.serverData.docUrl}/account-management/billing-management/#model-pricing`,
                  '_blank',
                );
              },
            },
          },
        ],
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        validate: `required`, // Omit maximum length, as the tokens counted in backend may be different from the frontend.
        validateMessage: `Please provide a prompt. It's required!`,
        value: defaultPromptValue,
        help: 'Write clear instructions with placeholders (e.g., {{input}}) and state the expected format. <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=prompt#step-2-write-your-prompt" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        hintPosition: 'after_label',
        attributes: {
          'data-template-vars': 'true',
          'data-template-excluded-vars': 'Attachment',
          'data-template-excluded-var-types': 'Binary',
          'data-supported-models': 'all',
          placeholder:
            'Write your AI prompt using the custom {{Input}} tags to dynamically reference the provided input and generate an LLM response. \nEx: Please convert...',
        },
        events: {
          focus: (event) => {
            const target = event.target as HTMLTextAreaElement;
            if (target.value === defaultPromptValue) {
              target.select(); // Select all text when focused if it's the default value
            }
          },
        },
      },
      maxContextTokens: {
        type: 'div',
        html: `<strong class="px-2">Context window size: <span class="tokens_num">${allowedContextTokens ? allowedContextTokens.toLocaleString() : 'Unknown'
          }</span> tokens</strong>`,
        cls: 'mb-0',
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,Perplexity,cohere',
        },
        section: 'Advanced',
        help: 'The total context window size includes both the request prompt length and output completion length.',
        class: 'px-4 mb-0 bg-gray-50',
        tooltipIconClasses: '-ml-1 -mt-1 float-none',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      webSearchContextSizeInfo: {
        type: 'div',
        html: `<strong class="px-2">Search Context Size: <span class="tokens_num">${allowedWebSearchContextTokens ? allowedWebSearchContextTokens.toLocaleString() : 'Unknown'
          }</span> tokens</strong>`,
        attributes: {
          'data-supported-models': [...this.searchModels].join(','),
        },
        section: 'Advanced',
        help: 'Web search is limited to a context window size of 128000',
        class: `px-4 bg-gray-50`,
        tooltipIconClasses: '-ml-1 -mt-1 float-none',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      temperature: {
        type: 'range',
        label: 'Temperature',
        min: 0,
        max: maxTemperature,
        value: defaultTemperature,
        step: 0.01,
        validate: `min=0 max=${maxTemperature}`,
        validateMessage: `Allowed range 0 to ${maxTemperature}`,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,Perplexity,cohere',
          'data-excluded-models': [
            ...this.anthropicThinkingModels,
            ...this.gpt5Models,
            ...this.gptO3andO4Models,
            ...this.gptSearchModels,
          ].join(','),
        },
        section: 'Advanced',
        help: hint.temperature,
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      // maxTokens: Maximum completion tokens
      maxTokens: {
        type: 'range',
        label: 'Maximum Output Tokens',
        min: minMaxTokens,
        max: allowedCompletionTokens,
        value: defaultMaxTokens,
        step: 4,
        validate: `min=${minMaxTokens} max=${allowedCompletionTokens}`,
        validateMessage: `Allowed range ${minMaxTokens} to ${allowedCompletionTokens}`,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,Perplexity,cohere',
        },
        section: 'Advanced',
        help: 'Limit reply length to manage cost and avoid cutoffs. <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=context-window-size#step-4-configure-advanced-settings" target="_blank" class="text-blue-600 hover:text-blue-800">See token limits</a>',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      stopSequences: {
        type: 'tag',
        label: 'Stop Sequence',
        maxTags: maxStopSequences,
        value: '',
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,TogetherAI,VertexAI,Bedrock,cohere',
          'data-excluded-models': [
            ...this.gpt5Models,
            ...this.gptO3andO4Models,
            ...this.gptSearchModels,
          ].join(','),
        },
        section: 'Advanced',
        help: 'End output when any of the stop strings (sequence of up to 4 strings) appear. <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=stop-sequence#step-4-configure-advanced-settings" target="_blank" class="text-blue-600 hover:text-blue-800">See stopping examples</a>',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        hint: 'Input a sequence and press Enter, Space, or Comma to add it to the list.',
        hintPosition: 'after_label',
      },
      topP: {
        type: 'range',
        label: 'Top P',
        min: minTopP,
        max: maxTopP,
        value: defaultTopP,
        step: 0.01,
        validate: `min=${minTopP} max=${maxTopP}`,
        validateMessage: `Allowed range ${minTopP} to ${maxTopP}`,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,Perplexity,cohere',
          'data-excluded-models': [
            ...this.openaiReasoningModels,
            ...this.gpt5Models,
            ...this.gptO3andO4Models,
            ...this.gptSearchModels,
            ...this.anthropicThinkingModels,
            ...this.groqReasoningModels,
          ].join(','),
        },
        section: 'Advanced',
        help: 'Control variety by sampling from the smallest set of likely words that reach probability P.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      topK: {
        type: 'range',
        label: 'Top K',
        min: minTopK,
        max: maxTopK,
        value: defaultTopK,
        step: 1,
        validate: `min=${minTopK} max=${maxTopK}`,
        validateMessage: `Allowed range ${minTopK} to ${maxTopK}`,
        attributes: {
          'data-supported-models': 'GoogleAI,VertexAI,Anthropic,TogetherAI,Perplexity,cohere',
          'data-excluded-models': this.anthropicThinkingModels.join(','),
        },
        section: 'Advanced',
        help: 'Restrict generation to the top K most likely words to reduce randomness.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      frequencyPenalty: {
        type: 'range',
        label: 'Frequency Penalty',
        min: 0,
        max: maxFrequencyPenalty,
        value: defaultFrequencyPenalty,
        step: 0.01,
        validate: `min=0 max=${maxFrequencyPenalty}`,
        validateMessage: `Allowed range 0 to ${maxFrequencyPenalty}`,
        attributes: {
          'data-supported-models': 'OpenAI,TogetherAI,Perplexity,cohere',
          'data-excluded-models': [
            ...this.gpt5Models,
            ...this.gptO3andO4Models,
            ...this.gptSearchModels,
          ].join(','),
        },
        section: 'Advanced',
        help: 'Reduce repeats by penalising words already used in the reply.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      presencePenalty: {
        type: 'range',
        label: 'Presence Penalty',
        min: 0,
        max: maxPresencePenalty,
        value: defaultPresencePenalty,
        step: 0.01,
        validate: `min=0 max=${maxPresencePenalty}`,
        validateMessage: `Allowed range 0 to ${maxPresencePenalty}`,
        attributes: {
          'data-supported-models': 'OpenAI,Perplexity,cohere',
          'data-excluded-models': [
            ...this.gpt5Models,
            ...this.gptO3andO4Models,
            ...this.gptSearchModels,
          ].join(','),
        },
        section: 'Advanced',
        help: 'Encourage new topics by penalising words seen in the input.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      verbosity: {
        type: 'select',
        label: 'Verbosity',
        value: 'medium',
        options: [
          { text: 'Low', value: 'low' },
          { text: 'Medium', value: 'medium' },
          { text: 'High', value: 'high' },
        ],
        attributes: {
          'data-supported-models': this.gpt5Models.join(','),
        },
        help: 'Control how much reasoning detail appears in the response.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        section: 'Advanced',
      },
      passthrough: {
        type: 'checkbox',
        label: 'Passthrough',
        value: false,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere,Echo',
        }, // TODO: After implementing stream request with Perplexity, we can say 'all' for the supported models
        help: 'Stream the response live to chat, or turn off for batch runs. <a href="https://smythos.com/docs/agent-studio/components/base/gen-ai-llm/?utm_source=studio&utm_medium=tooltip&utm_campaign=genai-llm&utm_content=passthrough#step-4-configure-advanced-settings" target="_blank" class="text-blue-600 hover:text-blue-800">See passthrough details</a>',
        section: 'Advanced',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },

      //Upcoming features
      useSystemPrompt: {
        type: 'checkbox',
        label: 'Use Agent System Prompt',
        value: false,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        }, // TODO: After implementing stream request with Perplexity, we can say 'all' for the supported models
        help: 'Apply the agent\'s rules and tone to this call for consistency.',
        section: 'Advanced',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      useContextWindow: {
        type: 'checkbox',
        label: 'Use Context Window',
        value: false,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        }, // TODO: After implementing stream request with Perplexity, we can say 'all' for the supported models
        help: 'Include recent chat history when responses depend on prior turns.',
        section: 'Advanced',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        events: {
          change: (event) => {
            const target = event.target as HTMLInputElement;
            const form = target.closest('form');

            const maxContextWindowLength = form?.querySelector(
              '[data-field-name="maxContextWindowLength"]',
            ) as HTMLInputElement;

            if (target.checked) maxContextWindowLength.classList.remove('hidden');
            else maxContextWindowLength.classList.add('hidden');
          },
        },
      },

      maxContextWindowLength: {
        type: 'range',
        label: 'Max Context Window Length',
        min: 0,
        max: allowedContextTokens,
        step: 1,
        value: 4096,
        attributes: {},
        help: 'The maximum length of the agent context window to share with the component',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        section: 'Advanced',
        class: 'hidden',
      },

      useReasoning: {
        type: 'checkbox',
        label: 'Use Reasoning',
        value: false,
        attributes: {
          'data-supported-models': [
            ...this.anthropicThinkingModels,
            ...this.groqReasoningModels,
          ].join(','),
        },
        help: 'Enable step-by-step reasoning for complex or multi-step tasks.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        section: 'Advanced',
        events: {
          change: (event) => {
            const target = event.target as HTMLInputElement;
            const form = target.closest('form');

            this.toggleReasoningNestedFields(target, form);
          },
        },
      },

      // With Anthropic context we've registered the field as maxThinkingTokens, but in general we prefer to use 'reasoning' terminology
      maxThinkingTokens: {
        type: 'range',
        label: 'Max Thinking Tokens',
        min: minMaxTokens,
        max: allowedReasoningTokens,
        value: defaultThinkingTokens,
        step: 4,
        attributes: {
          'data-supported-models': this.anthropicThinkingModels.join(','),
        },
        help: hint.maxThinkingTokens,
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        section: 'Advanced',
        fieldsGroup: 'Max Thinking Tokens',
      },

      reasoningEffort: {
        type: 'select',
        label: 'Reasoning Effort',
        value: this.getDefaultReasoningEffortForModel(
          this.data.model || this.defaultModel,
          this.getReasoningEffortOptions(this.data.model || this.defaultModel),
        ),
        options: this.getReasoningEffortOptions(this.data.model || this.defaultModel),
        help: 'Set how deeply the model reasons; higher is slower but more accurate.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        section: 'Advanced',
        fieldsGroup: 'Reasoning Effort',
      },

      ...(await this.getWebSearchFields()),
    };
  }

  /**
   * Update verbosity field visibility based on the selected model
   */
  private updateVerbosityFieldVisibility(modelId: string, form: HTMLFormElement) {
    if (!form) return;

    const verbosityField = form.querySelector('[data-field-name="verbosity"]') as HTMLElement;
    if (!verbosityField) return;

    if (LLMRegistry.isGpt5ReasoningModels(modelId)) {
      verbosityField.classList.remove('hidden');
    } else {
      verbosityField.classList.add('hidden');
    }
  }

  private async getWebSearchFields() {
    const countryOptions = [{ text: 'Select a Country', value: '' }, ...isoCountryCodes];
    const timezoneOptions = [{ text: 'Select a Timezone', value: '' }, ...ianaTimezones];

    // Include all search models, but exclude xAI for the generic useWebSearch field
    const webSearchSupportedModels = [...this.searchModels].join(',');
    const openAISearchModels = this.searchModels
      .filter((model) => {
        const provider = LLMRegistry.getModelProvider(model);
        return provider.toLowerCase() !== 'xai';
      })
      .join(',');
    const xAISearchModels = this.searchModels
      .filter((model) => {
        const provider = LLMRegistry.getModelProvider(model);
        return provider.toLowerCase() === 'xai';
      })
      .join(',');

    const attributes = {
      'data-supported-models': webSearchSupportedModels,
    };

    const openAIAttributes = {
      'data-supported-models': openAISearchModels,
    };

    const xAIAttributes = {
      'data-supported-models': xAISearchModels,
    };

    return {
      useWebSearch: {
        type: 'checkbox',
        label: 'Use Web Search',
        value: false,
        attributes: openAIAttributes,
        help: 'Allow the model to fetch fresh, real-time information.',
        section: 'Advanced',
        events: {
          change: (event) => {
            const target = event.target as HTMLInputElement;
            const form = target.closest('form');

            this.toggleWebSearchNestedFields(target, form);
          },
        },
      },
      webSearchContextSize: {
        type: 'select',
        label: 'Web Search Context Size',
        value: 'medium',
        attributes: openAIAttributes,
        class: 'hidden',
        options: [
          {
            text: 'High',
            value: 'high',
          },
          {
            text: 'Medium',
            value: 'medium',
          },
          {
            text: 'Low',
            value: 'low',
          },
        ],
        help: 'Controls how much context is retrieved from the web to help the tool formulate a response.',
        section: 'Advanced',
        fieldsGroup: 'Search Context Size',
      },
      locationTitle: {
        type: 'div',
        html: `<h3 class="font-bold text-md __fields_group_title">User Location</h3>`,
        value: '',
        attributes: openAIAttributes,
        class: 'mb-0 hidden',
        help: 'To refine search results based on geography, you can specify an approximate user location using country, city, region, and/or timezone.',
        section: 'Advanced',
        fieldsGroup: 'Location',
      },
      webSearchCity: {
        type: 'text',
        label: 'City',
        value: '',
        attributes: openAIAttributes,
        class: 'hidden',
        help: "The city: free text strings, like 'Minneapolis'.",
        validate: 'maxlength=100',
        validateMessage: 'City name cannot exceed 100 characters',
        section: 'Advanced',
        fieldsGroup: 'Location',
      },
      webSearchCountry: {
        type: 'select',
        label: 'Country',
        value: '',
        attributes: openAIAttributes,
        class: 'hidden',
        options: countryOptions,
        help: "Country: a two-letter ISO country code, like 'US'.",
        section: 'Advanced',
        fieldsGroup: 'Location',
      },
      webSearchRegion: {
        type: 'text',
        label: 'Region',
        value: '',
        attributes: openAIAttributes,
        class: 'hidden',
        help: "Region: free text strings, like 'Minnesota'.",
        validate: 'maxlength=100',
        validateMessage: 'Region name cannot exceed 100 characters',
        section: 'Advanced',
        fieldsGroup: 'Location',
      },
      webSearchTimezone: {
        type: 'select',
        label: 'Timezone',
        value: '',
        attributes: openAIAttributes,
        class: 'hidden',
        options: timezoneOptions,
        help: 'Timezone: an IANA timezone like America/Chicago.',
        section: 'Advanced',
        fieldsGroup: 'Location',
      },

      // xAI Live Search specific fields
      useSearch: {
        type: 'checkbox',
        label: 'Use Search',
        value: false,
        attributes: xAIAttributes,
        help: 'Enable live search capabilities that allow the model to access real-time information from multiple data sources, including Web, X, News, and RSS feeds.',
        section: 'Advanced',
        events: {
          change: (event) => {
            const target = event.target as HTMLInputElement;
            const form = target.closest('form');

            this.toggleSearchNestedFields(target, form);
          },
        },
      },
      returnCitations: {
        type: 'checkbox',
        label: 'Return Citations',
        value: false,
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Include citations and sources in the response for transparency and verification.',
        section: 'Advanced',
        fieldsGroup: 'Search Control',
      },
      searchMode: {
        type: 'select',
        label: 'Search Mode',
        value: 'auto',
        attributes: xAIAttributes,
        class: 'hidden',
        options: [
          {
            text: 'Auto',
            value: 'auto',
          },
          {
            text: 'On',
            value: 'on',
          },
          {
            text: 'Off',
            value: 'off',
          },
        ],
        help: 'Controls when the model should perform web search. &quot;Auto&quot; lets the model decide, &quot;On&quot; forces search, &quot;Off&quot; disables search.',
        section: 'Advanced',
        fieldsGroup: 'Search Control',
      },
      fromDate: {
        type: 'date',
        label: 'From Date',
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Filter search results starting from this date. When only &quot;From Date&quot; is specified, data will be searched from the &quot;From Date&quot; to today.',
        section: 'Advanced',
        fieldsGroup: 'Date Filtering',
      },
      toDate: {
        type: 'date',
        label: 'To Date',
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Filter search results ending at this date. When only &quot;To Date&quot; is specified, all data up to the &quot;To Date&quot; will be searched.',
        section: 'Advanced',
        fieldsGroup: 'Date Filtering',
      },
      maxSearchResults: {
        type: 'range',
        label: 'Max Search Results',
        min: 1,
        max: 100,
        value: 10,
        step: 1,
        validate: 'min=1 max=50',
        validateMessage: 'Allowed range 1 to 50',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Maximum number of search results to retrieve from the web.',
        section: 'Advanced',
        fieldsGroup: 'Search Results',
      },
      searchDataSources: {
        type: 'checkbox-group',
        label: 'Data Sources',
        value: ['web', 'x'],
        attributes: xAIAttributes,
        class: 'hidden',
        options: [
          {
            text: 'Web',
            value: 'web',
          },
          {
            text: 'X Platform',
            value: 'x',
          },
          {
            text: 'News',
            value: 'news',
          },
          {
            text: 'RSS Feeds',
            value: 'rss',
          },
        ],
        help: 'Select which data sources to search. Leave empty to search all available sources.',
        section: 'Advanced',
        fieldsGroup: 'Data Sources',
        events: {
          change: (event) => {
            const form = event.target.closest('form');
            this.toggleCountryFieldBasedOnDataSources(form);
            this.toggleWebsiteFieldsBasedOnDataSources(form);
            this.toggleXHandlesFieldBasedOnDataSources(form);
            this.toggleEngagementFieldsBasedOnDataSources(form);
            this.toggleRSSFieldsBasedOnDataSources(form);
            this.toggleSafeSearchFieldBasedOnDataSources(form);
          },
        },
      },
      safeSearch: {
        type: 'checkbox',
        label: 'Safe Search',
        value: false,
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Enable safe search filtering to exclude explicit and potentially inappropriate content from web and news results.',
        section: 'Advanced',
        fieldsGroup: 'Data Sources',
      },
      searchCountry: {
        type: 'select',
        label: 'Country',
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        options: countryOptions,
        help: 'Select a country to limit search results to.',
        section: 'Advanced',
        fieldsGroup: 'Data Sources',
      },
      excludedWebsites: {
        type: 'tag',
        label: 'Excluded Websites',
        maxTags: 5,
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Specify up to 5 websites to exclude from search results (e.g., example.com, badsite.org). This cannot be used with &quot;Allowed Websites&quot;.',
        section: 'Advanced',
        fieldsGroup: 'Data Sources',
        hint: 'Enter a website domain and press Enter, Space, or Comma to add it to the list.',
        hintPosition: 'after_label',
        events: {
          change: (event) => {
            const form = event.target.closest('form');
            this.toggleWebsiteFieldsMutualExclusivity(form, 'excludedWebsites');
          },
        },
      },
      allowedWebsites: {
        type: 'tag',
        label: 'Allowed Websites',
        maxTags: 5,
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Specify up to 5 websites to limit search results to (e.g., wikipedia.org, github.com). This cannot be used with &quot;Excluded Websites&quot;.',
        section: 'Advanced',
        fieldsGroup: 'Data Sources',
        hint: 'Enter a website domain and press Enter, Space, or Comma to add it to the list.',
        hintPosition: 'after_label',
        events: {
          change: (event) => {
            const form = event.target.closest('form');
            this.toggleWebsiteFieldsMutualExclusivity(form, 'allowedWebsites');
          },
        },
      },
      includedXHandles: {
        type: 'tag',
        label: 'Included X Handles',
        maxTags: 10,
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Specify up to 10 X handles to include in search results (e.g., elonmusk, xai). This parameter cannot be set together with &quot;Excluded X Handles&quot; parameter.',
        section: 'Advanced',
        fieldsGroup: 'Data Sources',
        hint: 'Enter X handle without @ symbol and press Enter, Space, or Comma to add it to the list. ',
        hintPosition: 'after_label',
        events: {
          change: (event) => {
            const form = event.target.closest('form');
            this.toggleXHandlesMutualExclusivity(form, 'includedXHandles');
          },
        },
      },
      excludedXHandles: {
        type: 'tag',
        label: 'Excluded X Handles',
        maxTags: 10,
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Specify up to 10 X handles to exclude from search results (e.g., spamaccount, botuser). This parameter cannot be set together with &quot;Included X Handles&quot; parameter.',
        section: 'Advanced',
        fieldsGroup: 'Data Sources',
        hint: 'Enter X handle without @ symbol and press Enter, Space, or Comma to add it to the list.',
        hintPosition: 'after_label',
        events: {
          change: (event) => {
            const form = event.target.closest('form');
            this.toggleXHandlesMutualExclusivity(form, 'excludedXHandles');
          },
        },
      },
      postFavoriteCount: {
        type: 'number',
        label: 'Min Post Favorites',
        min: 0,
        max: 1000000000,
        value: 0,
        step: 1,
        validate: 'min=0 max=1000000000',
        validateMessage: 'Must be between 0 and 1,000,000,000',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Minimum number of favorites/likes a post must have to be included in search results.',
        section: 'Advanced',
        fieldsGroup: 'Engagement Filtering',
      },
      postViewCount: {
        type: 'number',
        label: 'Min Post Views',
        min: 0,
        max: 1000000000,
        value: 0,
        step: 1,
        validate: 'min=0 max=1000000000',
        validateMessage: 'Must be between 0 and 1,000,000,000',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Minimum number of views a post must have to be included in search results.',
        section: 'Advanced',
        fieldsGroup: 'Engagement Filtering',
      },
      rssLinks: {
        type: 'tag',
        label: 'RSS Links',
        maxTags: 10,
        value: '',
        attributes: xAIAttributes,
        class: 'hidden',
        help: 'Specify a specific RSS feed URL to search within. Leave empty to search all available RSS feeds.',
        section: 'Advanced',
        fieldsGroup: 'RSS Filtering',
        placeholder: 'https://example.com/rss.xml',
        hint: 'Enter a RSS feed URL and press Enter, Space, or Comma to add it to the list.',
        hintPosition: 'after_label',
      },
    };
  }

  /**
   * Generic function to toggle nested fields based on provider and parent field state
   * @param parentField - The parent checkbox field (e.g., useWebSearch)
   * @param form - The form element containing the fields
   * @param fieldsToShow - Array of field names to show/hide
   */
  private toggleNestedFields(
    parentField: HTMLInputElement,
    form: HTMLFormElement,
    fieldsToShow: string[],
  ) {
    fieldsToShow.forEach((field) => {
      const nestedFieldElm = form?.querySelector(`[data-field-name="${field}"]`);
      const formGroupElm = parentField.closest('.form-group');

      if (!nestedFieldElm || !formGroupElm) return;

      if (formGroupElm.classList.contains('hidden')) {
        // If parent group is hidden, hide all nested fields
        nestedFieldElm.classList.add('hidden');
      } else {
        // If parent group is visible, toggle visibility of nested fields based on checkbox state
        nestedFieldElm.classList.toggle('hidden', !parentField.checked);
      }
    });
  }

  /**
   * Get the provider-specific fields based on the current model
   * @param provider - The LLM provider (e.g., 'openai', 'xai')
   * @returns Array of field names to show for the provider
   */
  private getProviderWebSearchFields(provider: string): string[] {
    const providerFieldMap = {
      openai: [
        'webSearchContextSize',
        'locationTitle',
        'webSearchCity',
        'webSearchCountry',
        'webSearchRegion',
        'webSearchTimezone',
      ],
      xai: [
        'searchMode',
        'returnCitations',
        'maxSearchResults',
        'searchDataSources',
        'searchCountry',
        'excludedWebsites',
        'allowedWebsites',
        'includedXHandles',
        'excludedXHandles',
        'postFavoriteCount',
        'postViewCount',
        'rssLinks',
        'safeSearch',
        'fromDate',
        'toDate',
      ],
      // Add other providers as needed
    };

    return providerFieldMap[provider.toLowerCase()] || [];
  }

  /**
   * Toggle web search nested fields based on the current model's provider
   * @param parentField - The useWebSearch checkbox
   * @param form - The form element
   */
  private toggleWebSearchNestedFields(parentField: HTMLInputElement, form: HTMLFormElement) {
    // Get the current model from the form
    const modelSelect = form?.querySelector('#model') as HTMLSelectElement;
    const currentModel = modelSelect?.value;

    // Determine the provider based on the model using LLMRegistry
    const provider = LLMRegistry.getModelProvider(currentModel);

    // Get provider-specific fields
    const fieldsToShow = this.getProviderWebSearchFields(provider.toLowerCase());

    // Toggle the appropriate fields
    this.toggleNestedFields(parentField, form, fieldsToShow);
  }

  private toggleSearchNestedFields(parentField: HTMLInputElement, form: HTMLFormElement) {
    const fieldsToShow = [
      'searchMode',
      'returnCitations',
      'maxSearchResults',
      'searchDataSources',
      'searchCountry',
      'excludedWebsites',
      'allowedWebsites',
      'includedXHandles',
      'excludedXHandles',
      'postFavoriteCount',
      'postViewCount',
      'rssLinks',
      'safeSearch',
      'fromDate',
      'toDate',
    ];
    this.toggleNestedFields(parentField, form, fieldsToShow);

    // Also toggle the country field, website fields, X handles, engagement fields, RSS fields, and safe search based on selected data sources
    if (parentField.checked) {
      this.toggleCountryFieldBasedOnDataSources(form);
      this.toggleWebsiteFieldsBasedOnDataSources(form);
      this.toggleXHandlesFieldBasedOnDataSources(form);
      this.toggleEngagementFieldsBasedOnDataSources(form);
      this.toggleRSSFieldsBasedOnDataSources(form);
      this.toggleSafeSearchFieldBasedOnDataSources(form);
    }
  }

  private toggleReasoningNestedFields(parentField: HTMLInputElement, form: HTMLFormElement) {
    const modelSelect = form?.querySelector('#model') as HTMLSelectElement;
    const currentModel = modelSelect?.value || this.data.model;

    const fieldsToShow: string[] = [];

    // Only show maxThinkingTokens for Anthropic models
    if (this.anthropicThinkingModels.includes(currentModel)) {
      fieldsToShow.push('maxThinkingTokens');
    }

    // Handle reasoning effort field visibility
    const reasoningEffortField = form?.querySelector(
      '[data-field-name="reasoningEffort"]',
    ) as HTMLElement;
    const reasoningOptions = this.getReasoningEffortOptions(currentModel);

    // Handle reasoning effort field visibility for both GPT-5 and Groq models
    if (reasoningOptions.length > 0) {
      if (this.gpt5ReasoningModels.includes(currentModel)) {
        // For GPT-5 models: Always show reasoningEffort regardless of useReasoning state
        if (reasoningEffortField) {
          reasoningEffortField.classList.remove('hidden');
        }
        // Update reasoning effort options
        this.updateReasoningEffortOptions(currentModel);
      } else if (this.groqReasoningModels.includes(currentModel)) {
        // For Groq reasoning models: Only show when useReasoning is checked
        if (reasoningEffortField) {
          if (parentField.checked) {
            reasoningEffortField.classList.remove('hidden');
            // Update reasoning effort options when shown
            this.updateReasoningEffortOptions(currentModel);
          } else {
            reasoningEffortField.classList.add('hidden');
          }
        }
      } else {
        // Hide for all other models (GPT-4, etc.)
        if (reasoningEffortField) {
          reasoningEffortField.classList.add('hidden');
        }
      }
    } else {
      // If no reasoning options available, hide the field
      if (reasoningEffortField) {
        reasoningEffortField.classList.add('hidden');
      }
    }

    // Handle other nested fields (maxThinkingTokens) with the standard toggle logic
    this.toggleNestedFields(parentField, form, fieldsToShow);
  }

  /**
   * Get reasoning effort options based on the current model
   * Returns empty array for unsupported models to hide the field
   */
  private getReasoningEffortOptions(model: string): { text: string; value: string }[] {
    if (!model) return [];

    const modelLower = model.toLowerCase();

    // Find matching model configuration
    const modelConfig = REASONING_EFFORTS.find((config) => config.pattern.test(modelLower));

    return modelConfig?.options || [];
  }

  /**
   * Update reasoning effort field options based on the selected model
   * Only updates options, visibility is handled by toggleReasoningNestedFields
   */
  private updateReasoningEffortOptions(model: string): void {
    const field = document.getElementById('reasoningEffort') as HTMLSelectElement;
    if (!field) return;

    const selectElem = Metro.getPlugin(field, 'select');
    if (!selectElem) return;

    const options = this.getReasoningEffortOptions(model);

    // Don't update if no options available - field should be hidden by toggleReasoningNestedFields
    if (options.length === 0) return;

    const currentValue = field.value || 'medium';

    // Remove all existing options
    if (selectElem.elem?.options) {
      selectElem.removeOptions([...selectElem.elem.options].map((o: HTMLOptionElement) => o.value));
    }

    // Add new options
    options.forEach((option) => {
      selectElem.addOption(option.value, option.text, false); // Don't auto-select during addition
    });

    // Determine the best default value for the model type
    const defaultValue = this.getDefaultReasoningEffortForModel(model, options);
    const availableValues = options.map((opt) => opt.value);

    // Set the appropriate value: current if valid, otherwise default
    const valueToSet = availableValues.includes(currentValue) ? currentValue : defaultValue;
    selectElem.val(valueToSet);
  }

  /**
   * Get the appropriate default reasoning effort value for a given model
   */
  private getDefaultReasoningEffortForModel(
    model: string,
    options: { text: string; value: string }[],
  ): string {
    if (options.length === 0) return '';

    const modelLower = model.toLowerCase();

    // Default values for different model types
    if (
      modelLower.includes('gpt') ||
      modelLower.includes('openai') ||
      modelLower.includes('smythos/gpt')
    ) {
      // For GPT models, prefer 'medium' as a balanced default
      return options.find((opt) => opt.value === 'medium')?.value || options[0].value;
    } else if (modelLower.includes('qwen')) {
      // For Qwen models, prefer 'default' over 'none'
      return options.find((opt) => opt.value === 'default')?.value || options[0].value;
    }

    // For any other models, use the first available option
    return options[0].value;
  }

  private toggleCountryFieldBasedOnDataSources(form: HTMLFormElement) {
    const dataSourcesCheckboxes = form?.querySelectorAll(
      '[data-field-name="searchDataSources"] input[type="checkbox"]',
    );
    const countryField = form?.querySelector('[data-field-name="searchCountry"]');

    if (!dataSourcesCheckboxes || !countryField) return;

    let shouldShowCountry = false;

    // Check if 'web' or 'news' is selected
    dataSourcesCheckboxes.forEach((checkbox: HTMLInputElement) => {
      if (checkbox.checked && (checkbox.value === 'web' || checkbox.value === 'news')) {
        shouldShowCountry = true;
      }
    });

    // Toggle the country field visibility
    countryField.classList.toggle('hidden', !shouldShowCountry);
  }

  private toggleWebsiteFieldsBasedOnDataSources(form: HTMLFormElement) {
    const dataSourcesCheckboxes = form?.querySelectorAll(
      '[data-field-name="searchDataSources"] input[type="checkbox"]',
    );
    const excludedWebsitesField = form?.querySelector('[data-field-name="excludedWebsites"]');
    const allowedWebsitesField = form?.querySelector('[data-field-name="allowedWebsites"]');

    if (!dataSourcesCheckboxes || !excludedWebsitesField || !allowedWebsitesField) return;

    let shouldShowWebsiteFields = false;

    // Check if 'web' or 'news' is selected
    dataSourcesCheckboxes.forEach((checkbox: HTMLInputElement) => {
      if (checkbox.checked && (checkbox.value === 'web' || checkbox.value === 'news')) {
        shouldShowWebsiteFields = true;
      }
    });

    // Toggle website fields visibility
    excludedWebsitesField.classList.toggle('hidden', !shouldShowWebsiteFields);
    allowedWebsitesField.classList.toggle('hidden', !shouldShowWebsiteFields);

    // If hiding fields, clear their values
    if (!shouldShowWebsiteFields) {
      const excludedInput = excludedWebsitesField.querySelector('input');
      const allowedInput = allowedWebsitesField.querySelector('input');
      if (excludedInput) excludedInput.value = '';
      if (allowedInput) allowedInput.value = '';
    }
  }

  private toggleWebsiteFieldsMutualExclusivity(form: HTMLFormElement, activeField: string) {
    const excludedWebsitesField = form?.querySelector('[data-field-name="excludedWebsites"]');
    const allowedWebsitesField = form?.querySelector('[data-field-name="allowedWebsites"]');

    if (!excludedWebsitesField || !allowedWebsitesField) {
      return;
    }

    const excludedInput = excludedWebsitesField.querySelector('input') as HTMLInputElement;
    const allowedInput = allowedWebsitesField.querySelector('input') as HTMLInputElement;

    if (!excludedInput || !allowedInput) {
      return;
    }

    // Helper function to get tag input values using MetroUI API
    const getTagInputValue = (input: HTMLInputElement): string[] => {
      try {
        // Try to get MetroUI tag input component
        const metroComponent = Metro.getPlugin(input, 'taginput');
        if (metroComponent && metroComponent.val) {
          const values = metroComponent.val();
          return Array.isArray(values) ? values : values ? [values] : [];
        }
        // Fallback to input value if MetroUI component not available
        return input.value
          ? input.value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
          : [];
      } catch (error) {
        console.warn('Error getting tag input value:', error);
        // Final fallback to input value
        return input.value
          ? input.value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
          : [];
      }
    };

    // Helper function to clear tag input values using MetroUI API
    const clearTagInput = (input: HTMLInputElement) => {
      try {
        const metroComponent = Metro.getPlugin(input, 'taginput');
        if (metroComponent && metroComponent.clear) {
          metroComponent.clear();
        } else {
          input.value = '';
        }
      } catch (error) {
        console.warn('Error clearing tag input:', error);
        input.value = '';
      }
    };

    if (activeField === 'excludedWebsites') {
      const excludedTags = getTagInputValue(excludedInput);

      // If excluded websites has tags, disable allowed websites and show exclusion hint
      if (excludedTags.length > 0) {
        allowedInput.setAttribute('disabled', 'disabled');
        clearTagInput(allowedInput);

        // Add mutual exclusion hint
        let exclusionHint = allowedWebsitesField.querySelector('.mutual-exclusion-hint');
        if (!exclusionHint) {
          exclusionHint = document.createElement('div');
          exclusionHint.className = 'mutual-exclusion-hint field-hint text-orange-600 text-sm mt-1';
          exclusionHint.innerHTML =
            '⚠️ Disabled because "Excluded Websites" is in use. Clear excluded websites to enable this field.';
          allowedWebsitesField.appendChild(exclusionHint);
        }
      } else {
        // If excluded websites is empty, enable allowed websites and remove hint
        allowedInput.removeAttribute('disabled');

        // Remove mutual exclusion hint
        const exclusionHint = allowedWebsitesField.querySelector('.mutual-exclusion-hint');
        if (exclusionHint) {
          exclusionHint.remove();
        }
      }
    } else if (activeField === 'allowedWebsites') {
      const allowedTags = getTagInputValue(allowedInput);

      // If allowed websites has tags, disable excluded websites and show exclusion hint
      if (allowedTags.length > 0) {
        excludedInput.setAttribute('disabled', 'disabled');
        clearTagInput(excludedInput);

        // Add mutual exclusion hint
        let exclusionHint = excludedWebsitesField.querySelector('.mutual-exclusion-hint');
        if (!exclusionHint) {
          exclusionHint = document.createElement('div');
          exclusionHint.className = 'mutual-exclusion-hint field-hint text-orange-600 text-sm mt-1';
          exclusionHint.innerHTML =
            '⚠️ Disabled because "Allowed Websites" is in use. Clear allowed websites to enable this field.';
          excludedWebsitesField.appendChild(exclusionHint);
        }
      } else {
        // If allowed websites is empty, enable excluded websites and remove hint
        excludedInput.removeAttribute('disabled');

        // Remove mutual exclusion hint
        const exclusionHint = excludedWebsitesField.querySelector('.mutual-exclusion-hint');
        if (exclusionHint) {
          exclusionHint.remove();
        }
      }
    }
  }

  private toggleXHandlesFieldBasedOnDataSources(form: HTMLFormElement) {
    const dataSourcesCheckboxes = form?.querySelectorAll(
      '[data-field-name="searchDataSources"] input[type="checkbox"]',
    );
    const includedXHandlesField = form?.querySelector('[data-field-name="includedXHandles"]');
    const excludedXHandlesField = form?.querySelector('[data-field-name="excludedXHandles"]');

    if (!dataSourcesCheckboxes || !includedXHandlesField || !excludedXHandlesField) return;

    let shouldShowXHandles = false;

    // Check if 'x' is selected
    dataSourcesCheckboxes.forEach((checkbox: HTMLInputElement) => {
      if (checkbox.checked && checkbox.value === 'x') {
        shouldShowXHandles = true;
      }
    });

    // Toggle X handles fields visibility
    includedXHandlesField.classList.toggle('hidden', !shouldShowXHandles);
    excludedXHandlesField.classList.toggle('hidden', !shouldShowXHandles);

    // If hiding fields, clear their values
    if (!shouldShowXHandles) {
      const includedInput = includedXHandlesField.querySelector('input');
      const excludedInput = excludedXHandlesField.querySelector('input');
      if (includedInput) includedInput.value = '';
      if (excludedInput) excludedInput.value = '';
    }
  }

  private toggleEngagementFieldsBasedOnDataSources(form: HTMLFormElement) {
    const dataSourcesCheckboxes = form?.querySelectorAll(
      '[data-field-name="searchDataSources"] input[type="checkbox"]',
    );
    const postFavoriteCountField = form?.querySelector('[data-field-name="postFavoriteCount"]');
    const postViewCountField = form?.querySelector('[data-field-name="postViewCount"]');

    if (!dataSourcesCheckboxes || !postFavoriteCountField || !postViewCountField) return;

    let shouldShowEngagementFields = false;

    // Check if 'x' is selected
    dataSourcesCheckboxes.forEach((checkbox: HTMLInputElement) => {
      if (checkbox.checked && checkbox.value === 'x') {
        shouldShowEngagementFields = true;
      }
    });

    // Toggle engagement fields visibility
    postFavoriteCountField.classList.toggle('hidden', !shouldShowEngagementFields);
    postViewCountField.classList.toggle('hidden', !shouldShowEngagementFields);

    // If hiding fields, reset their values to defaults
    if (!shouldShowEngagementFields) {
      const postFavoriteCountInput = postFavoriteCountField.querySelector('input');
      const postViewCountInput = postViewCountField.querySelector('input');
      if (postFavoriteCountInput) postFavoriteCountInput.value = '0';
      if (postViewCountInput) postViewCountInput.value = '0';
    }
  }

  private toggleRSSFieldsBasedOnDataSources(form: HTMLFormElement) {
    const dataSourcesCheckboxes = form?.querySelectorAll(
      '[data-field-name="searchDataSources"] input[type="checkbox"]',
    );
    const rssLinksField = form?.querySelector('[data-field-name="rssLinks"]');

    if (!dataSourcesCheckboxes || !rssLinksField) return;

    let shouldShowRSSFields = false;

    // Check if 'rss' is selected
    dataSourcesCheckboxes.forEach((checkbox: HTMLInputElement) => {
      if (checkbox.checked && checkbox.value === 'rss') {
        shouldShowRSSFields = true;
      }
    });

    // Toggle RSS fields visibility
    rssLinksField.classList.toggle('hidden', !shouldShowRSSFields);

    // If hiding fields, clear their values
    if (!shouldShowRSSFields) {
      const rssLinksInput = rssLinksField.querySelector('textarea');
      if (rssLinksInput) rssLinksInput.value = '';
    }
  }

  private toggleSafeSearchFieldBasedOnDataSources(form: HTMLFormElement) {
    const dataSourcesCheckboxes = form?.querySelectorAll(
      '[data-field-name="searchDataSources"] input[type="checkbox"]',
    );
    const safeSearchField = form?.querySelector('[data-field-name="safeSearch"]');

    if (!dataSourcesCheckboxes || !safeSearchField) return;

    let shouldShowSafeSearchField = false;

    // Check if 'web' or 'news' is selected
    dataSourcesCheckboxes.forEach((checkbox: HTMLInputElement) => {
      if (checkbox.checked && (checkbox.value === 'web' || checkbox.value === 'news')) {
        shouldShowSafeSearchField = true;
      }
    });

    // Toggle safe search field visibility
    safeSearchField.classList.toggle('hidden', !shouldShowSafeSearchField);

    // If hiding field, reset to default value
    if (!shouldShowSafeSearchField) {
      const safeSearchCheckbox = safeSearchField.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;
      if (safeSearchCheckbox) safeSearchCheckbox.checked = false;
    }
  }

  private toggleXHandlesMutualExclusivity(form: HTMLFormElement, activeField: string) {
    const includedXHandlesField = form?.querySelector('[data-field-name="includedXHandles"]');
    const excludedXHandlesField = form?.querySelector('[data-field-name="excludedXHandles"]');

    if (!includedXHandlesField || !excludedXHandlesField) return;

    const includedInput = includedXHandlesField.querySelector('input') as HTMLInputElement;
    const excludedInput = excludedXHandlesField.querySelector('input') as HTMLInputElement;

    if (!includedInput || !excludedInput) return;

    // Helper function to get tag input values using MetroUI API
    const getTagInputValue = (input: HTMLInputElement): string[] => {
      try {
        // Try to get MetroUI tag input component
        const metroComponent = Metro.getPlugin(input, 'taginput');
        if (metroComponent && metroComponent.val) {
          const values = metroComponent.val();
          return Array.isArray(values) ? values : values ? [values] : [];
        }
        // Fallback to input value if MetroUI component not available
        return input.value
          ? input.value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
          : [];
      } catch (error) {
        console.warn('Error getting tag input value:', error);
        // Final fallback to input value
        return input.value
          ? input.value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
          : [];
      }
    };

    // Helper function to clear tag input values using MetroUI API
    const clearTagInput = (input: HTMLInputElement) => {
      try {
        const metroComponent = Metro.getPlugin(input, 'taginput');
        if (metroComponent && metroComponent.clear) {
          metroComponent.clear();
        } else {
          input.value = '';
        }
      } catch (error) {
        console.warn('Error clearing tag input:', error);
        input.value = '';
      }
    };

    if (activeField === 'includedXHandles') {
      const includedTags = getTagInputValue(includedInput);

      // If included X handles has tags, disable excluded X handles and show exclusion hint
      if (includedTags.length > 0) {
        excludedInput.setAttribute('disabled', 'disabled');
        clearTagInput(excludedInput);

        // Add mutual exclusion hint
        let exclusionHint = excludedXHandlesField.querySelector('.mutual-exclusion-hint');
        if (!exclusionHint) {
          exclusionHint = document.createElement('div');
          exclusionHint.className = 'mutual-exclusion-hint field-hint text-orange-600 text-sm mt-1';
          exclusionHint.innerHTML =
            '⚠️ Disabled because "Included X Handles" is in use. Clear included handles to enable this field.';
          excludedXHandlesField.appendChild(exclusionHint);
        }
      } else {
        // If included X handles is empty, enable excluded X handles and remove hint
        excludedInput.removeAttribute('disabled');

        // Remove mutual exclusion hint
        const exclusionHint = excludedXHandlesField.querySelector('.mutual-exclusion-hint');
        if (exclusionHint) {
          exclusionHint.remove();
        }
      }
    } else if (activeField === 'excludedXHandles') {
      const excludedTags = getTagInputValue(excludedInput);

      // If excluded X handles has tags, disable included X handles and show exclusion hint
      if (excludedTags.length > 0) {
        includedInput.setAttribute('disabled', 'disabled');
        clearTagInput(includedInput);

        // Add mutual exclusion hint
        let exclusionHint = includedXHandlesField.querySelector('.mutual-exclusion-hint');
        if (!exclusionHint) {
          exclusionHint = document.createElement('div');
          exclusionHint.className = 'mutual-exclusion-hint field-hint text-orange-600 text-sm mt-1';
          exclusionHint.innerHTML =
            '⚠️ Disabled because "Excluded X Handles" is in use. Clear excluded handles to enable this field.';
          includedXHandlesField.appendChild(exclusionHint);
        }
      } else {
        // If excluded X handles is empty, enable included X handles and remove hint
        includedInput.removeAttribute('disabled');

        // Remove mutual exclusion hint
        const exclusionHint = includedXHandlesField.querySelector('.mutual-exclusion-hint');
        if (exclusionHint) {
          exclusionHint.remove();
        }
      }
    }
  }

  /**
   * Hide all xAI-specific fields when switching to non-xAI models
   * @param form - The form element containing the fields
   */
  private hideXAISpecificFields(form: HTMLFormElement) {
    const xaiFields = [
      'searchMode',
      'returnCitations',
      'maxSearchResults',
      'searchDataSources',
      'searchCountry',
      'excludedWebsites',
      'allowedWebsites',
      'includedXHandles',
      'excludedXHandles',
      'postFavoriteCount',
      'postViewCount',
      'rssLinks',
      'safeSearch',
      'fromDate',
      'toDate',
    ];

    xaiFields.forEach((fieldName) => {
      const field = form?.querySelector(`[data-field-name="${fieldName}"]`);
      if (field) {
        field.classList.add('hidden');
      }
    });
  }

  /**
   * Hide all OpenAI-specific web search fields when switching to non-OpenAI models
   * @param form - The form element containing the fields
   */
  private hideOpenAIWebSearchFields(form: HTMLFormElement) {
    const openAIFields = [
      'webSearchContextSize',
      'locationTitle',
      'webSearchCity',
      'webSearchCountry',
      'webSearchRegion',
      'webSearchTimezone',
    ];

    openAIFields.forEach((fieldName) => {
      const field = form?.querySelector(`[data-field-name="${fieldName}"]`);
      if (field) {
        field.classList.add('hidden');
      }
    });
  }
}
