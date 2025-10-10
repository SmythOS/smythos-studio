import { Component } from './Component.class';
declare var Metro;
export class LogicAtMost extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      maxSetInputs: {
        type: 'number',
        label: 'Maximum Inputs',
        hint: 'Maximum number of set inputs to trigger output',
        value: '',
        validate: `required max=9 min=0 custom=isValidInteger`,
        validateMessage: `Please enter a positive number between 0 and 9.`,
      },
    };

    const dataEntries = ['maxSetInputs'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Verified', 'Unverified'];
    this.properties.defaultInputs = [];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.showSettings = true;
    this.drawSettings.cssClass = 'logic-component';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.displayName = 'At most';
    this.drawSettings.color = '#333';
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addOutputButtonLabel = ' ';
    this.drawSettings.addInputButton = 'Input';
    this.drawSettings.componentDescription =
      'Set the output to true if a maximum number of inputs are set, if the maximum is exceeded, output does not trigger';
    // #endregion
  }
}
