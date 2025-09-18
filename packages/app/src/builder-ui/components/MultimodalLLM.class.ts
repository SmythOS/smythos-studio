import llmParams from '../params/LLM.params.json';
import { createBadge } from '../ui/badges';
import {
  getAllowedCompletionTokens,
  getAllowedContextTokens,
  handleElementClick,
  refreshLLMModels,
  saveApiKey,
  setupSidebarTooltips,
  VisionLLMUtils,
} from '../utils';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

import { LLMFormController } from '../helpers/LLMFormController.helper';

export class MultimodalLLM extends Component {
  private modelOptions: string[];
  private modelParams: Record<string, any>;
  private defaultModel: string;

  protected async prepare() {
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures([
      'image',
      'audio',
      'video',
      'document',
    ]);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

    const model = this.data?.model || this.defaultModel;

    //prevent losing the previously set model
    if (model && ![...modelOptions.map((item) => item?.value || item)].includes(model)) {
      modelOptions.push({
        text: model + '&nbsp;&nbsp', // Add non-breaking space entities to create visual spacing between model name and badge
        value: model,
        badge: createBadge('Removed', 'text-smyth-red-500 border-smyth-red-500'),
      });
    }

    //remove undefined models
    this.modelOptions = modelOptions.filter((e) => e);

    this.setModelParams(model);

    return true;
  }
  protected async init() {
    this.settings = this.generateSettings();

    const dataEntries = ['model', 'prompt', 'maxTokens'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultInputs = ['Input'];
    this.properties.defaultOutputs = ['Reply'];

    this.drawSettings.displayName = 'Multimodal LLM';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription =
      'The Multimodal component processes information from different modalities, including images, videos, and text, using LLMs to generate context-aware outputs based on prompts and input variables.';
    this.drawSettings.shortDescription =
      'Processes multimodal inputs (images, videos, text) to generate context-aware outputs.';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }

  private modelChangeHandler(event) {
    const target = event.target as HTMLSelectElement;

    const wrapper = target.closest('.select.smt-input-select');

    /* The 'change' event will trigger when the sidebar open.
        The following trick will ensure that the value is changed due to user interaction,
        allowing us to set default value for different types of model */
    if (wrapper.classList.contains('focused')) {
      VisionLLMUtils.updateMaxTokens(event);

      /* We need to regenerate settings (this.settings) to sync with updated fields info
            Otherwise, old values will be saved when we update field information during switching models. */
      this.setModelParams(target.value || this.defaultModel);
      this.settings = this.generateSettings();
    }

    VisionLLMUtils.toggleFields(event);
  }

  private setModelParams(model) {
    // Use window models directly to ensure we always have the latest values
    const llm =
      window['__LLM_MODELS__']?.[model]?.provider?.toLowerCase() ||
      window['__LLM_MODELS__']?.[model]?.llm?.toLowerCase(); // ! DEPRECATED: `llm` property will be removed in the future
    const modelParams = llmParams[llm] || llmParams['default'];

    this.modelParams = {
      allowedContextTokens: getAllowedContextTokens(model),
      allowedCompletionTokens: getAllowedCompletionTokens(model),
      hint: modelParams?.hint,
    };
  }

  private generateSettings() {
    const { allowedContextTokens, allowedCompletionTokens, hint } = this.modelParams;

    return {
      model: {
        type: 'select',
        label: 'Model',
        help: 'Select a multimodal model for text plus images, audio, or video. <a href="https://smythos.com/docs/agent-studio/components/legacy/multimodal-llm/?utm_source=app&utm_medium=tooltip&utm_campaign=docs&utm_content=multimodal-llm" target="_blank" class="text-blue-600 hover:text-blue-800">See Model details</a>',
        value: this.defaultModel,
        options: this.modelOptions,
        events: {
          // modelChangeHandler required 'this' for right context
          change: this.modelChangeHandler.bind(this),
        },
        attributes: { 'data-supported-models': 'all' },
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        class: 'mb-6',
        validate: `required`, // Omit maximum length, as the tokens counted in backend may be different from the frontend.
        validateMessage: `Please provide a prompt. It's required!`,
        value: 'What is the video about?',
        help: 'Describe the task and how the attached media is used (e.g., extract, compare, caption).',
        attributes: { 'data-template-vars': 'true' },
      },
      maxContextTokens: {
        type: 'div',
        html: `<strong class="px-2">Context window size: <span class="tokens_num">${allowedContextTokens ? allowedContextTokens.toLocaleString() : 'Unknown'
          }</span> tokens</strong><br/>`,
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,cohere',
        },
        section: 'Advanced',
        hint: 'The total context window size includes both the request prompt length and output completion length.',
        hintPosition: 'left',
        class: 'p-4',
      },
      maxTokens: {
        type: 'range',
        label: 'Maximum Output Tokens',
        min: 1,
        max: allowedCompletionTokens,
        value: 300,
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
      passthrough: {
        type: 'checkbox',
        label: 'Passthrough',
        value: false,
        attributes: { 'data-supported-models': 'all' },
        section: 'Advanced',
      },
    };
  }

  protected async run() {
    this.addEventListener('settingsOpened', this.handleSettingsOpened.bind(this));
  }

  private async handleSettingsOpened(sidebar, component) {
    if (component !== this) return;
    await delay(200);
    await setupSidebarTooltips(sidebar, this);
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

  // protected async run() {
  //     // TODO: adjust it later
  //     /* Ensure the max tokens field is dynamically updated
  //        when the user adds or removes API keys from the vault page
  //        and returns to the builder page (assuming the sidebar is closed). */
  //     this.addEventListener('settingsOpened', (sidebar) => {
  //         const formElm = sidebar?.querySelector('.form');
  //         updateMaxTokens(formElm);
  //     });
  // }
}

// TODO: adjust it later
/* Ensure the max tokens field is dynamically updated
   when the user adds or removes API keys from the vault page
   and returns to the builder page (assuming the sidebar is open). */
/* const focusHandler = async () => {
    // ensure to only run for VisionLLM component
    if (document.querySelector('.component.VisionLLM')?.classList?.contains('active')) {
        if (!focusHandler['processing']) {
            focusHandler['processing'] = true;

            await updateMaxTokens();

            focusHandler['processing'] = false;
        }
    }
};
window.addEventListener('focus', focusHandler); */
