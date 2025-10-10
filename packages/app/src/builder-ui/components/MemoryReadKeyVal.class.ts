import { Component } from './Component.class';

export class MemoryReadKeyVal extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      memoryName: {
        type: 'input',
        label: 'name',
        value: '',
        validate: `required maxlength=100`,
        validateMessage: 'Enter a non-empty name, not more than 100 characters.',
        attributes: { 'data-template-vars': 'true' },
        help: 'Tells the component which namespace to search so it finds the value you wrote.',
      },
      key: {
        type: 'input',
        label: 'Key',
        value: '{{Key}}',
        validate: `maxlength=50`,
        attributes: { 'data-template-vars': 'true' },
        help: 'Targets the exact item to retrieve using its saved identifier.',
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
      // help: 'Choose session, user, or project for the lookup. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
      // },
    };

    const dataEntries = ['memoryName', 'key'];
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
    this.drawSettings.displayName = 'Memory Read';
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
