import { Component } from './Component.class';
declare var Metro;
export class Redirect extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      url: {
        type: 'input',
        label: 'URL',
        validate: `required maxlength=8192 custom=isUrlValid`,
        validateMessage: 'Provide a valid URL',
        attributes: { 'data-template-vars': 'true' },
      },
    };

    const dataEntries = ['url'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = [];
    this.properties.defaultInputs = [];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.outputMaxConnections = 0;
    this.drawSettings.addOutputButtonLabel = ' ';
    this.drawSettings.color = '#8600f1';
    // #endregion
  }
}
