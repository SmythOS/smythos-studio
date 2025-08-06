import { LLMFormController } from '../helpers/LLMFormController.helper';
import { createBadge } from '../ui/badges';
import { setLogoForDynamicComp } from '../utils';
import { Component } from './Component.class';

declare var Metro;

export class MCPClient extends Component {
  private name: string;
  private desc: string;
  private descForModel: string;
  private mcpUrl: string;
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
    this.mcpUrl = this.data?.mcpUrl || this.properties.sender?.getAttribute('smt-mcp-url') || '';
    this.logoUrl = this.data?.logoUrl || this.properties.sender?.querySelector('img')?.src || '';

    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures(['tools']);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

    const model = this.data?.model || this.data?.openAiModel || this.defaultModel;

    if (model && ![...modelOptions.map((item) => item?.value || item)].includes(model)) {
      modelOptions.push({
        text: model + '&nbsp;&nbsp', // Add non-breaking space entities to create visual spacing between model name and badge
        value: model,
        badge: createBadge('Removed', 'text-smyth-red-500 border-smyth-red-500'),
      });
    }

    //remove undefined models
    this.modelOptions = modelOptions.filter((e) => e);

    return true;
  }

  protected async init() {
    this.settings = {
      mcpUrl: {
        type: 'textarea',
        value: '',
        validate: `required`,
        label: 'MCP URL',
        validateMessage: 'MCP URL is required',
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        value: '{{Prompt}}',
        validate: `required`,
        validateMessage: 'Prompt is required',
        attributes: {
          'data-template-vars': 'true',
          'data-template-excluded-vars': 'Attachment',
          'data-template-excluded-var-types': 'Binary',
          'data-supported-models': 'all',
        },
      },
      model: {
        type: 'select',
        label: 'Model',
        value: this.defaultModel,
        options: this.modelOptions,
      },
      descForModel: {
        type: 'textarea',
        label: 'System Prompt',
        hint: 'The system prompt can be used to customize the behavior of your MCP',
        section: 'Advanced',
        value: this.descForModel,
        validate: `maxlength=5000`,
        validateMessage: 'Your text exceeds the 5,000 character limit.',
      },
    };

    const dataEntries = ['model', 'mcpUrl', 'descForModel', 'prompt'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    if (this.properties.inputs.length == 0)
      this.properties.inputs = ['Prompt'];
    this.properties.defaultOutputs = ['Output'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = 'Outputs';
    this.drawSettings.addInputButton = 'Inputs';

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

    this.data = {
      ...this.data,
      name: this.name,
      desc: this.desc,
      descForModel: this.descForModel,
      logoUrl: this.logoUrl,
      mcpUrl: this.mcpUrl,
    };

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, this.logoUrl);

    return div;
  }
}
