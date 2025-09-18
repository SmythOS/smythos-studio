import { LLMFormController } from '../helpers/LLMFormController.helper';
import { createBadge } from '../ui/badges';
import { IconArrowRight, IconConfigure } from '../ui/icons';
import { handleElementClick, refreshLLMModels, saveApiKey, setupSidebarTooltips } from '../utils';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

declare var Metro;

export class Classifier extends Component {
  private modelOptions: string[];
  private defaultModel: string;

  protected async prepare() {
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures(['text']);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

    const model = this.data?.model;

    //prevent losing the previously set model
    if (model && ![...modelOptions.map((item) => item?.value || item)].includes(model)) {
      modelOptions.push({
        text: model + '&nbsp;&nbsp', // Add non-breaking space entities to create visual spacing between model name and badge
        value: model,
        badge: createBadge('Removed', 'text-smyth-red-500 border-smyth-red-500'),
      });
    }
    //TODO: set warning if the model is not available

    //remove undefined models
    this.modelOptions = modelOptions.filter((e) => e);

    return true;
  }
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      model: {
        type: 'select',
        label: 'Select a model',
        help: 'Choose a model that applies labels and fits your context size.',
        tooltipClasses: 'w-56',
        arrowClasses: '-ml-11',
        value: this.defaultModel,
        options: this.modelOptions,

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
        validate: `required maxlength=30000`,
        validateMessage: `The prompt should be a non empty text of less than 30,000 characters`,
        value:
          'Classify the input content to one of the categories.\nSet the selected category to true and the others to empty value',
        attributes: { 'data-template-vars': 'true' },
        help: 'Explain how text should be classified and what labels to return. <a href="https://smythos.com/docs/agent-studio/components/base/classifier/?utm_source=studio&utm_medium=tooltip&utm_campaign=classifier&utm_content=prompt#step-2---write-or-update-the-prompt" target="_blank" class="text-blue-600 hover:text-blue-800">See prompt tips</a>',
      },
    };

    const dataEntries = ['prompt', 'model'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = [];
    this.properties.defaultInputs = ['Input'];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = 'Categories';
    this.drawSettings.addInputButton = 'Inputs';
    this.drawSettings.componentDescription =
      'Classify the input content to one of the categories.\nCan use a prompt to customize the output format, classification behavior, categories extraction and more';

    this.drawSettings.shortDescription = 'Classifies content to one of the categories';
    this.drawSettings.color = '#ff00f2';
    // #endregion
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
}
