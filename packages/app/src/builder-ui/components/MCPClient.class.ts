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
        type: 'input',
        value: '',
        validate: `required`,
        label: 'MCP URL',
        help: 'Enter the MCP server URL so the client can list the tools it offers.',
        validateMessage: 'MCP URL is required',
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        value: '{{Prompt}}',
        validate: `required`,
        validateMessage: 'Prompt is required',
        help: 'Tell the tool what to do and what to return; name the tool and key parameters. <a href="https://smythos.com/docs/agent-studio/components/tools/mcp-client/?utm_source=studio&utm_medium=tooltip&utm_campaign=mcp-client&utm_content=prompt#step-3-provide-inputs" target="_blank" class="text-blue-600 hover:text-blue-800">See prompt patterns</a>',
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
        help: 'Choose the model that will plan and call tools; larger models help with long or multi step tasks.',
        value: this.defaultModel,
        options: this.modelOptions,
      },
      descForModel: {
        type: 'textarea',
        label: 'System Prompt',
        help: 'Set rules for all calls, like allowed tools, tone, and required output format.',
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
