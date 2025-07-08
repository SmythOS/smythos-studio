import { Component } from './Component.class';
declare var Metro;
export class Base64Encoder extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      mime: {
        type: 'select',
        label: 'MIME type',
        hint: 'Model name',
        value: 'default',
        options: ['default', 'image/jpeg', 'image/png'],
      },
    };

    const dataEntries = ['mime'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Output'];
    this.properties.defaultInputs = ['Data'];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.showSettings = false;
    this.drawSettings.cssClass = '';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButton = ' + Input';
    this.drawSettings.componentDescription =
      'Converts a raw data string to base64 encoded string or url';
    // #endregion
  }
}
