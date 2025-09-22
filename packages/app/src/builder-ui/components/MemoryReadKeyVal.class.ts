import { Component } from './Component.class';

export class MemoryReadKeyVal extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      memoryName: {
        type: 'input',
        label: 'name',
        value: 'default',
        validate: `required maxlength=100`,
        validateMessage: 'Enter a non-empty name, not more than 100 characters.',
        attributes: { 'data-template-vars': 'true' },
      },
      key: {
        type: 'input',
        label: 'Key',
        value: '{{Key}}',
        hint: 'Key to read from memory',
        validate: `maxlength=50`,
        attributes: { 'data-template-vars': 'true' },
      },
      // scope: {
      //   type: 'select',
      //   label: 'Scope',
      //   hint: 'Memory Scope',
      //   value: 'Session',
      //   options: [
      //     { value: 'session', text: 'Session' },
      //     { value: 'workflow', text: 'Workflow' },
      //     { value: 'ttl', text: 'TTL' },
      //   ],
      // },
    };

    const dataEntries = ['key'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    //this.data = {};
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Value'];
    this.properties.defaultInputs = [];
    if (this.properties.inputs.length == 0) this.properties.inputs = ['Key'];
    // #endregion

    // #region [ Draw config ] ==================
    //this.drawSettings.showSettings = false;
    this.drawSettings.iconCSSClass = 'svg-icon Memory ' + this.constructor.name;
    this.drawSettings.addOutputButton = ' ';
    this.drawSettings.addInputButton = ' ';
    this.drawSettings.addInputButtonLabel = ' ';
    // this.drawSettings.addInputButton = ' + Entry';
    //this.drawSettings.addInputButton = ' + Mem Entry';
    //this.drawSettings.addOutputButton = ' + Mem Output';
    // #endregion
  }
}
