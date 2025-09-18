import { LLMFormController } from '../helpers/LLMFormController.helper';
import llmParams from '../params/LLM.params.json';
import { createBadge } from '../ui/badges';
import { IconArrowRight, IconConfigure } from '../ui/icons';
import {
  getAllowedCompletionTokens,
  getAllowedContextTokens,
  handleElementClick,
  PromptGeneratorUtils,
  refreshLLMModels,
  saveApiKey,
  setupSidebarTooltips,
} from '../utils';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

declare var Metro;

/*
 * Here field name like model, apiKey, temperature is very important
 * Because we have ID like #model, #apiKey, #temperature in the HTML
 * And we use those IDs to find the fields and update info in `../utils/component.utils/PromptGenerator.utils.ts`
 *
 */

export class PromptGenerator extends Component {
  private modelOptions: string[];
  private modelParams: Record<string, any>;
  private defaultModel: string;

  protected async prepare() {
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures(['text']);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

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
    this.settings = this.generateSettings();

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
    if (this.properties.inputs.length == 0) this.properties.inputs = ['Input'];
    this.properties.defaultOutputs = ['Reply'];

    this.drawSettings.displayName = 'LLM Prompt';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription =
      'Use LLM to generate output based on prompt and input variables';
    this.drawSettings.shortDescription =
      'LLM - Generates output based on prompt and input variables';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }

  protected async run() {
    this.addEventListener('settingsOpened', this.handleSettingsOpened.bind(this));

    // TODO: adjust it later
    /* Ensure the max tokens field is dynamically updated
           when the user adds or removes API keys from the vault page
           and returns to the builder page (assuming the sidebar is closed). */
    /* this.addEventListener('settingsOpened', (sidebar) => {
            const formElm = sidebar?.querySelector('.form');
            PromptGeneratorUtils.updateMaxTokens(formElm);
        }); */
  }

  private async handleSettingsOpened(sidebar, component) {
    if (component !== this) return;
    await delay(200);
    await setupSidebarTooltips(sidebar, this);

    const modelElm = sidebar.querySelector('#model');
    // customModelHelper.actionsHandler(this, modelElm); // ! DEPRECATED
  }

  private async handleElementClick(event) {
    await handleElementClick(event, this);
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

  private modelChangeHandler(target: HTMLSelectElement) {
    const wrapper = target.closest('.select.smt-input-select');

    PromptGeneratorUtils.updateFieldsInfo(target);
    PromptGeneratorUtils.updateMaxTokens(target);

    /* We need to regenerate settings (this.settings) to sync with updated fields info
            Otherwise, old values will be saved when we update field information during switching models. */
    this.setModelParams(target.value || this.defaultModel);
    this.settings = this.generateSettings();

    PromptGeneratorUtils.toggleFields(target);
  }

  private setModelParams(model: string) {
    const llm =
      window['__LLM_MODELS__']?.[model]?.provider?.toLowerCase() ||
      window['__LLM_MODELS__']?.[model]?.llm?.toLowerCase(); // ! DEPRECATED: `llm` property will be removed in the future
    const modelParams = llmParams[llm] || llmParams['default'];

    this.modelParams = {
      allowedContextTokens: getAllowedContextTokens(model),
      allowedCompletionTokens: getAllowedCompletionTokens(model),

      maxTemperature: modelParams?.maxTemperature,
      maxStopSequences: modelParams?.maxStopSequences,
      maxTopP: modelParams?.maxTopP,
      maxTopK: modelParams?.maxTopK,
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

  private generateSettings(): Record<string, any> {
    const {
      allowedContextTokens,
      allowedCompletionTokens,
      maxTemperature,
      maxStopSequences,
      maxTopP,
      maxTopK,
      maxFrequencyPenalty,
      maxPresencePenalty,
      minTopP,
      minTopK,
      defaultTemperature,
      defaultMaxTokens,
      defaultTopP,
      defaultTopK,
      hint,
    } = this.modelParams;

    return {
      model: {
        type: 'select',
        label: 'Model',
        help: 'Select the language model that generates the response; larger models handle longer or harder tasks.',
        value: this.defaultModel,
        options: this.modelOptions,
        dropdownHeight: 350, // In pixels
        attributes: { 'data-supported-models': 'all' },

        events: {
          change: (event) => this.modelChangeHandler(event.target as HTMLSelectElement),
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
        ],
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        validate: `required`, // Omit maximum length, as the tokens counted in backend may be different from the frontend.
        class: 'mt-1',
        validateMessage: `Please provide a prompt. It's required!`,
        value: 'Summarize the input text\nInput : {{Input}}',
        help: 'Write clear instructions with placeholders (e.g., {{input}}) and state the expected format. <a href="https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=app&utm_medium=component&utm_campaign=docs&utm_content=llm-prompt-legacy#step-2-define-the-behavior" target="_blank" class="text-blue-600 hover:text-blue-800">See prompt templates</a>',
        attributes: { 'data-template-vars': 'true', 'data-supported-models': 'all' },
      },
      maxContextTokens: {
        type: 'div',
        html: `<strong class="px-2">Context window size: <span class="tokens_num">${allowedContextTokens ? allowedContextTokens.toLocaleString() : 'Unknown'
          }</span> tokens</strong><br/>`,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        },
        section: 'Advanced',
        hint: 'The total context window size includes both the request prompt length and output completion length.',
        hintPosition: 'left',
        class: 'p-4',
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
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        },
        section: 'Advanced',
        hint: hint.temperature,
        hintPosition: 'left',
      },
      maxTokens: {
        type: 'range',
        label: 'Maximum Output Tokens',
        min: 1,
        max: allowedCompletionTokens,
        value: defaultMaxTokens,
        step: 1,
        validate: `min=1 max=${allowedCompletionTokens}`,
        validateMessage: `Allowed range 1 to ${allowedCompletionTokens}`,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        },
        section: 'Advanced',
        hint: hint.maxTokens,
        hintPosition: 'left',
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
        hint: hint.stopSequences,
        hintPosition: 'left',
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
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        },
        section: 'Advanced',
        hint: hint.topP,
        hintPosition: 'left',
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
        attributes: { 'data-supported-models': 'GoogleAI,VertexAI,Anthropic,TogetherAI,cohere' },
        section: 'Advanced',
        hint: hint.topK,
        hintPosition: 'left',
      },
      frequencyPenalty: {
        type: 'range',
        label: 'Frequency Penalty',
        min: 0,
        max: maxFrequencyPenalty,
        value: 0,
        step: 0.01,
        validate: `min=0 max=${maxFrequencyPenalty}`,
        validateMessage: `Allowed range 0 to ${maxFrequencyPenalty}`,
        attributes: { 'data-supported-models': 'OpenAI,TogetherAI,cohere' },
        section: 'Advanced',
        hint: hint.frequencyPenalty,
        hintPosition: 'left',
      },
      presencePenalty: {
        type: 'range',
        label: 'Presence Penalty',
        min: 0,
        max: maxPresencePenalty,
        value: 0,
        step: 0.01,
        validate: `min=0 max=${maxPresencePenalty}`,
        validateMessage: `Allowed range 0 to ${maxPresencePenalty}`,
        attributes: { 'data-supported-models': 'OpenAI,cohere' },
        section: 'Advanced',
        hint: hint.presencePenalty,
        hintPosition: 'left',
      },
      passthrough: {
        type: 'checkbox',
        label: 'Passthrough',
        value: false,
        attributes: { 'data-supported-models': 'all' },
        section: 'Advanced',
      },
    };
  }
}

// TODO: adjust it later
/* Ensure the max tokens field is dynamically updated
   when the user adds or removes API keys from the vault page
   and returns to the builder page (assuming the sidebar is open). */
/* const focusHandler = () => {
    // ensure to only run for PromptGenerator component
    if (document.querySelector('.component.PromptGenerator')?.classList?.contains('active')) {
        if (!focusHandler['processing']) {
            focusHandler['processing'] = true;

            PromptGeneratorUtils.updateMaxTokens();

            focusHandler['processing'] = false;
        }
    }
};
window.addEventListener('focus', focusHandler); */
