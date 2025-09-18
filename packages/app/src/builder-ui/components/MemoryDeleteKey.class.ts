import { Component } from './Component.class';

export class MemoryDeleteKey extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      name: {
        type: 'input',
        label: 'name',
        value: '',
        help: 'Select the key-value store containing the key to delete. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        validate: `maxlength=50`,
        validateMessage: 'Enter a non-empty name, not more than 50 characters.',
      },
      scope: {
        type: 'select',
        label: 'Scope',
        help: 'Choose the scope where the key should be removed. <a href="#" target="_blank" class="text-blue-600 hover:text-blue-800">Go to Docs</a>',
        value: 'Session',
        options: ['Session'],
      },
    };

    // const dataEntries = ['ttl'];
    // for (let item of dataEntries) {
    //     if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    // }

    this.data = {};
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = [];
    this.properties.defaultInputs = ['Key'];
    // #endregion

    // #region [ Draw config ] ==================
    //this.drawSettings.showSettings = false;
    this.drawSettings.iconCSSClass = 'svg-icon Memory ' + this.constructor.name;
    this.drawSettings.addOutputButton = null;
    // this.drawSettings.addInputButton = ' + Entry';
    this.drawSettings.addInputButton = 'Mem Entry';
    this.drawSettings.addOutputButtonLabel = ' ';
    // #endregion
  }
}
