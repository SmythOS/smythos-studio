import { Component } from './Component.class';

export class MemoryDeleteKey extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      memoryName: {
        type: 'input',
        label: 'name',
        value: '',
        hint: 'Enter memory name',
        validate: `required maxlength=100`,
        validateMessage: 'Enter a non-empty name, not more than 100 characters.',
      },
    };

    // const dataEntries = ['ttl'];
    // for (let item of dataEntries) {
    //     if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    // }

    //this.data = {};
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Key'];
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
