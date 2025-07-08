import { LLMRegistry } from '../../shared/services/LLMRegistry.service';
import { LLMFormController } from '../helpers/LLMFormController.helper';
import llmParams from '../params/LLM.params.json';
import { createBadge } from '../ui/badges';
import { IconArrowRight, IconConfigure } from '../ui/icons';
import { refreshLLMModels, saveApiKey, setupSidebarTooltips } from '../utils';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// Since getWebSearchFields is called multiple times, using a static import is more efficient than a lazy import.
import { SMYTHOS_DOCS_URL } from '../../shared/constants/general';
import ianaTimezones from '../data/IANA-time-zones.json';
import isoCountryCodes from '../data/ISO-country-code.json';

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
  private searchModels: string[];

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
    this.searchModels = LLMRegistry.getModelsByFeatures('search').map((m) => m.entryId);

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

      'useWebSearch',
      'webSearchContextSize',
      'webSearchCity',
      'webSearchCountry',
      'webSearchRegion',
      'webSearchTimezone',

      'useReasoning',
      'maxThinkingTokens',
    ];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
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
        help: 'Choose an AI model to process the prompt.',
        hintPosition: 'bottom',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        value: this.defaultModel,
        options: this.modelOptions,
        class: 'mt-1 mb-6',
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

            this.toggleWebSearchNestedFields(useWebSearchElm, form);
            // #endregion

            // #region Toggle reasoning nested fields on model change
            const useReasoningElm = form?.querySelector('#useReasoning') as HTMLInputElement;
            if (useReasoningElm) {
              this.toggleReasoningNestedFields(useReasoningElm, form);
            }
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
                  `${this.workspace.serverData.docUrl}/account-management/model-rates/#model-pricing`,
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
        hint: `Your prompt is aware of any files you add to the Attachment or Binary type input.\nSee <a href="${SMYTHOS_DOCS_URL}/agent-studio/components/base/gen-ai-llm" class="underline" target="_blank">documentation</a>.`,
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
        html: `<strong class="px-2">Context window size: <span class="tokens_num">${
          allowedContextTokens ? allowedContextTokens.toLocaleString() : 'Unknown'
        }</span> tokens</strong>`,
        cls: 'mb-0',
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,Perplexity,cohere',
        },
        section: 'Advanced',
        help: 'The total context window size includes both the request prompt length and output completion length.',
        // hintPosition: 'left',
        class: 'px-4 mb-0 bg-gray-50',
        tooltipIconClasses: '-ml-2 float-none',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      webSearchContextSizeInfo: {
        type: 'div',
        html: `<strong class="px-2">Search Context Size: <span class="tokens_num">${
          allowedWebSearchContextTokens ? allowedWebSearchContextTokens.toLocaleString() : 'Unknown'
        }</span> tokens</strong>`,
        attributes: {
          'data-supported-models': this.searchModels.join(','),
        },
        section: 'Advanced',
        help: 'Web search is limited to a context window size of 128000',
        class: `px-4 bg-gray-50`,
        tooltipIconClasses: '-ml-2 float-none',
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
          'data-excluded-models': this.anthropicThinkingModels.join(','),
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
        help: hint.maxTokens,
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
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        },
        section: 'Advanced',
        help: hint.stopSequences,
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        additionalHint: 'Input a sequence and press Enter, Space, or Comma to add it to the list.',
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
            ...this.anthropicThinkingModels,
            ...this.openaiReasoningModels,
          ].join(','),
        },
        section: 'Advanced',
        help: hint.topP,
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
        help: hint.topK,
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
        attributes: { 'data-supported-models': 'OpenAI,TogetherAI,Perplexity,cohere' },
        section: 'Advanced',
        help: hint.frequencyPenalty,
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
        attributes: { 'data-supported-models': 'OpenAI,Perplexity,cohere' },
        section: 'Advanced',
        help: hint.presencePenalty,
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      passthrough: {
        type: 'checkbox',
        label: 'Passthrough',
        value: false,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere,Echo',
        }, // TODO: After implementing stream request with Perplexity, we can say 'all' for the supported models
        help: 'If the component is running under a chatbot or agentLLM, The generated output will be directly streamed to the chat output',
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
        help: 'The running Agent system prompt will be passed as a system prompt to this component',
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
        help: 'The running Agent context window will be passed as a context window to this component',
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
          'data-supported-models': this.anthropicThinkingModels.join(','),
        },
        help: 'Enable thinking capabilities to allow the model to break down complex problems into steps and think through solutions methodically',
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
        // attributes: {
        //   'data-supported-models': this.anthropicThinkingModels.join(','),
        // },
        help: hint.maxThinkingTokens,
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        section: 'Advanced',
        fieldsGroup: 'Max Thinking Tokens',
      },

      ...(await this.getWebSearchFields()),
    };
  }

  private async getWebSearchFields() {
    const countryOptions = [{ text: 'Select a Country', value: '' }, ...isoCountryCodes];
    const timezoneOptions = [{ text: 'Select a Timezone', value: '' }, ...ianaTimezones];

    const attributes = {
      'data-supported-models': this.searchModels.join(','),
    };

    return {
      useWebSearch: {
        type: 'checkbox',
        label: 'Use Web Search',
        value: false,
        attributes,
        help: 'Allow models to search the web for the latest information before generating a response.',
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
        attributes,
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
        attributes,
        class: 'mb-0 hidden',
        help: 'To refine search results based on geography, you can specify an approximate user location using country, city, region, and/or timezone.',
        section: 'Advanced',
        fieldsGroup: 'Location',
      },
      webSearchCity: {
        type: 'text',
        label: 'City',
        value: '',
        attributes,
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
        attributes,
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
        attributes,
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
        attributes,
        class: 'hidden',
        options: timezoneOptions,
        help: 'Timezone: an IANA timezone like America/Chicago.',
        section: 'Advanced',
        fieldsGroup: 'Location',
      },
    };
  }

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

  private toggleWebSearchNestedFields(parentField: HTMLInputElement, form: HTMLFormElement) {
    const fieldsToShow = [
      'webSearchContextSize',
      'locationTitle',
      'webSearchCity',
      'webSearchCountry',
      'webSearchRegion',
      'webSearchTimezone',
    ];

    this.toggleNestedFields(parentField, form, fieldsToShow);
  }

  private toggleReasoningNestedFields(parentField: HTMLInputElement, form: HTMLFormElement) {
    const fieldsToShow = ['maxThinkingTokens'];

    this.toggleNestedFields(parentField, form, fieldsToShow);
  }
}
