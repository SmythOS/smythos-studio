import { Component } from './Component.class';
declare var Metro;
export class JSONFilter extends Component {
  // Component description for settings sidebar
  public componentDescription = 'Use JSON Filter to keep only the parts of a JSON object you need and drop the rest. This trims noisy API responses, speeds later steps, and saves tokens when sending data to an LLM. For path syntax, nested keys, and arrays, see examples.';
  public componentDocsLink = 'https://smythos.com/docs/agent-studio/components/advanced/json-filter/?utm_source=studio&utm_medium=tooltip&utm_campaign=json-filter&utm_content=fields#step-1-define-filter-parameters';

  protected async init() {
    this.settings = {
      fields: {
        type: 'textarea',
        label: 'Fields',
        value: '',
        validate: `maxlength=1000`,
        validateMessage: `Maximun 1000 characters`,
        help: 'List the paths to keep, like user.email, id, or items[0].name; anything not listed is removed. <a href="https://smythos.com/docs/agent-studio/components/advanced/json-filter/?utm_source=studio&utm_medium=tooltip&utm_campaign=json-filter&utm_content=fields#step-1-define-filter-parameters" target="_blank" class="text-blue-600 hover:text-blue-800">See path rules and nested keys</a>',
        attributes: { 'data-template-vars': '' },
      },
    };

    const dataEntries = ['fields'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    this.properties.defaultInputs = ['Input'];
    this.properties.defaultOutputs = ['Output'];

    this.drawSettings.displayName = 'JSON Filter';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Filters a JSON object based on the fields provided';
    this.drawSettings.shortDescription = 'Filters a JSON object based on the fields provided';
    this.drawSettings.color = '#65a698';
    this.drawSettings.addInputButton = null; // Disable the input button
    this.drawSettings.addInputButtonLabel = 'Inputs';

    this._ready = true;
  }
}
