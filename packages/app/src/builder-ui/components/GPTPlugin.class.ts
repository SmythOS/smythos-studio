import { LLMFormController } from '../helpers/LLMFormController.helper';
import { createBadge } from '../ui/badges';
import { setLogoForDynamicComp } from '../utils';
import { Component } from './Component.class';

declare var Metro;

export class GPTPlugin extends Component {
  private name: string;
  private desc: string;
  private descForModel: string;
  private specUrl: string;
  private logoUrl: string;
  private modelOptions: string[];
  private defaultModel: string;

  protected async prepare() {
    /* We retrieve data from the sender component because the this.data isn't available when redraw is called. */
    this.name =
      this.data?.name || this.properties.sender?.querySelector('.name')?.textContent || '';
    this.desc = this.data?.desc || this.properties.sender?.getAttribute('smt-desc') || '';
    this.descForModel =
      this.data?.descForModel || this.properties.sender?.getAttribute('smt-desc-for-model') || '';
    this.specUrl = this.data?.specUrl || this.properties.sender?.getAttribute('smt-spec-url') || '';
    this.logoUrl = this.data?.logoUrl || this.properties.sender?.querySelector('img')?.src || '';

    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures(['tools']);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

    const model = this.data?.model || this.data?.openAiModel || this.defaultModel;

    //prevent losing the previously set model
    if (model && ![...modelOptions.map((item) => item?.value || item)].includes(model)) {
      let badge = createBadge('Removed', 'text-smyth-red-500 border-smyth-red-500');

      // add alias badge for gpt-4-0613 as it's removed
      if (model === 'gpt-4-0613') {
        badge += createBadge('alias of gpt-4', 'text-gray-500 border-gray-500');
      }

      modelOptions.push({
        text: model + '&nbsp;&nbsp', // Add non-breaking space entities to create visual spacing between model name and badge
        value: model,
        badge,
      });
    }

    //remove undefined models
    this.modelOptions = modelOptions.filter((e) => e);

    return true;
  }

  protected async init() {
    this.settings = {
      model: {
        type: 'select',
        label: 'Model',
        value: this.defaultModel,
        options: this.modelOptions,
      },
      specUrl: {
        type: 'hidden',
        value: this.specUrl,
      },
      descForModel: {
        type: 'textarea',
        label: 'Description for Model',
        value: this.descForModel,
        validate: `maxlength=5000`,
        validateMessage: 'Your text exceeds the 5,000 character limit.',
      },
    };

    const dataEntries = ['model', 'specUrl', 'descForModel'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultInputs = ['Query'];
    this.properties.defaultOutputs = ['Output'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = '+ out';
    this.drawSettings.addInputButton = '+ in';

    this.drawSettings.displayName = this.name || this.constructor.name;
    this.drawSettings.shortDescription = this.desc || '';

    this._ready = true;
  }

  protected async run(): Promise<any> {
    // here this.properties.data is stable than this.data
    const logoUrl = this.properties.data?.logoUrl;

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, logoUrl);
  }

  public redraw(triggerSettings = true): HTMLDivElement {
    const div = super.redraw(triggerSettings);

    const internalNameDiv = div.querySelector('.internal-name');
    internalNameDiv.innerHTML = `<span class="internal-name-prefix gptplugin">OpenAPI</span>${this.drawSettings.displayName}`;

    this.data = {
      ...this.data,
      name: this.name,
      desc: this.desc,
      descForModel: this.descForModel,
      logoUrl: this.logoUrl,
      specUrl: this.specUrl,
    };

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, this.logoUrl);

    return div;
  }
}
