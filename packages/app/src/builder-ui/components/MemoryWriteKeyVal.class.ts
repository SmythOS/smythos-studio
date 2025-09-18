import { Component } from './Component.class';

export class MemoryWriteKeyVal extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      memoryName: {
        type: 'input',
        label: 'Memory Name',
        value: '',
        help: 'Select the key-value store to write into (e.g., \'crm_cache\'). <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        validate: `maxlength=50`,
        validateMessage: 'Enter a non-empty name, not more than 50 characters.',
      },
      key: {
        type: 'textarea',
        label: 'Key',
        value: '{{key}}',
        help: 'Key for the value; supports dynamic inputs like {{user.id}}. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        validate: `maxlength=50`,
        attributes: { 'data-template-vars': 'true' },
      },
      value: {
        type: 'textarea',
        label: 'Value',
        value: '{{value}}',
        help: 'Data to save: string, number, or JSON. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        attributes: { 'data-template-vars': 'true' },
      },
      scope: {
        type: 'select',
        label: 'Scope',
        help: 'Pick persistence: session, user, or project. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        value: 'Session',
        options: ['Session'],
      },
    };

    const dataEntries = ['key', 'value'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.data = {};
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Key', 'Value'];
    this.properties.defaultInputs = [];
    if (this.properties.inputs.length == 0) this.properties.inputs = ['Key', 'Value'];
    // #endregion

    // #region [ Draw config ] ==================
    //this.drawSettings.showSettings = false;
    this.drawSettings.iconCSSClass = 'svg-icon Memory ' + this.constructor.name;
    this.drawSettings.addOutputButton = ' ';
    // this.drawSettings.addInputButton = ' + Entry';
    this.drawSettings.addInputButton = 'Mem Entry';
    this.drawSettings.addOutputButtonLabel = ' ';
    // #endregion
  }
}
