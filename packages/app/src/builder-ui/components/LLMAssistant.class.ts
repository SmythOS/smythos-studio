import { LLMRegistry } from '../../shared/services/LLMRegistry.service';
import { LLMFormController } from '../helpers/LLMFormController.helper';
import { createBadge } from '../ui/badges';
import { IconArrowRight, IconConfigure } from '../ui/icons';
import { handleElementClick, refreshLLMModels, saveApiKey, setupSidebarTooltips } from '../utils';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

declare var Metro;

export class LLMAssistant extends Component {
  private modelOptions: string[];
  private defaultModel: string;

  protected async prepare() {
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures(['text']);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

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
    this.modelOptions = modelOptions.filter((item) => {
      if (!item) return false;

      // Keep the currently selected model even if it's hidden
      if (item?.value === model) return true;

      // Otherwise, filter out hidden models
      return !item?.hidden;
    });

    return true;
  }

  protected async init() {
    const allowedContextTokens = LLMRegistry.getAllowedContextTokens(this.defaultModel);

    this.settings = {
      model: {
        type: 'select',
        label: 'Select a Model',
        help: `Choose the chat model for this assistant; balance speed, cost, and context.`,
        hintPosition: 'bottom',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        value: this.defaultModel,
        options: this.modelOptions,
        dropdownHeight: 350, // In pixels

        events: {
          change: async (event) => {
            const currentElement = event.target as HTMLSelectElement;
            LLMFormController.updateContextSize(currentElement);
          },
        },
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

      behavior: {
        type: 'textarea',
        expandable: true,
        label: 'Behavior',
        class: '',
        validate: `required maxlength=30000`,
        validateMessage: `The behavior prompt should be a non empty text of less than 30,000 characters`,
        value: 'You are a helpful assistant that helps people with their questions',
        attributes: { 'data-template-vars': 'true' },
        help: 'Set the assistant’s tone, rules, and actions so replies fit the intended use case. <a href="https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=studio&utm_medium=tooltip&utm_campaign=llm-assistant&utm_content=behavior#step-2-define-the-behavior" target="_blank" class="text-blue-600 hover:text-blue-800">See behaviour examples</a>',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },

      maxContextTokens: {
        type: 'div',
        html: `<strong class="px-2">Context window size: <span class="tokens_num">${
          allowedContextTokens ? allowedContextTokens.toLocaleString() : 'Unknown'
        }</span> tokens</strong>`,
        cls: 'mb-0',
        attributes: {
          'data-supported-models':
            'OpenAI,Anthropic,GoogleAI,Groq,xAI,TogetherAI,VertexAI,Bedrock,Perplexity,cohere,Ollama',
        },
        section: 'Advanced',
        help: 'The total context window size includes both the request prompt length and output completion length.',
        class: 'px-4 mb-0 bg-gray-50',
        tooltipIconClasses: '-ml-1 -mt-1 float-none',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },
      passthrough: {
        type: 'checkbox',
        label: 'Passthrough',
        value: false,
        attributes: { 'data-supported-models': 'all' },
        section: 'Advanced',
        help: `Send raw replies into the workflow for filtering or transformation before display. <a href="https://smythos.com/docs/agent-studio/components/advanced/llm-assistant/?utm_source=studio&utm_medium=tooltip&utm_campaign=llm-assistant&utm_content=passthrough#step-4-configure-advanced-settings" target="_blank" class="text-blue-600 hover:text-blue-800">See passthrough controls</a>`,
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
      },

      // prompt_select:{
      //     type:'input-selector',
      //     options:['Input'],
      //     rel:'prompt'
      // }
    };

    const dataEntries = ['model', 'behavior'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    this.properties.defaultInputs = ['UserId', 'ConversationId', 'UserInput'];
    if (this.properties.inputs.length == 0)
      this.properties.inputs = ['UserId', 'ConversationId', 'UserInput'];
    if (!this.properties.inputProps) this.properties.inputProps = [];
    const convInputProps = this.properties.inputProps?.find((c) => c.name === 'ConversationId');
    if (!convInputProps)
      this.properties.inputProps.push({ name: 'ConversationId', optional: true });
    else convInputProps.optional = true;

    const userIdInputProps = this.properties.inputProps?.find((c) => c.name === 'UserId');
    if (!userIdInputProps) this.properties.inputProps.push({ name: 'UserId', optional: true });
    else userIdInputProps.optional = true;

    this.properties.defaultOutputs = ['Response'];

    this.drawSettings.displayName = 'LLM Assistant';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Use LLM to handle a chat conversation';
    this.drawSettings.shortDescription = 'LLM Assistant - Handles a chat conversation';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }

  protected async run() {
    this.addEventListener('settingsOpened', this.handleSettingsOpened.bind(this));
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
}
