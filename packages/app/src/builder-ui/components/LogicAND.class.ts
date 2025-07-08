import { Component } from './Component.class';
declare var Metro;
export class LogicAND extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {};

    const dataEntries = [];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Verified', 'Unverified'];
    this.properties.defaultInputs = [];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.showSettings = false;
    this.drawSettings.cssClass = 'logic-component';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.color = '#333';
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addOutputButtonLabel = ' ';
    this.drawSettings.addInputButton = 'Input';
    this.drawSettings.componentDescription =
      'Set the output to true if all the inputs are set, otherwise set it to false';
    // #endregion
  }
}
