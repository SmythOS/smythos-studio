import { Component } from './Component.class';

export class MemoryReadKeyVal extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      name: {
        type: 'input',
        label: 'name',
        value: '',
        hint: 'Enter memory name',
        validate: `maxlength=50`,
        validateMessage: 'Enter a non-empty name, not more than 50 characters.',
      },
      scope: {
        type: 'select',
        label: 'Scope',
        hint: 'Memory Scope',
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
    this.properties.defaultOutputs = ['Value'];
    this.properties.defaultInputs = ['Key'];
    // #endregion

    // #region [ Draw config ] ==================
    //this.drawSettings.showSettings = false;
    this.drawSettings.iconCSSClass = 'svg-icon Memory ' + this.constructor.name;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButton = null;
    this.drawSettings.addInputButtonLabel = ' ';
    // this.drawSettings.addInputButton = ' + Entry';
    //this.drawSettings.addInputButton = ' + Mem Entry';
    //this.drawSettings.addOutputButton = ' + Mem Output';
    // #endregion
  }
}
