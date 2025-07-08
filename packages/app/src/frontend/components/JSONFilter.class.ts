import { Component } from './Component.class';
declare var Metro;
export class JSONFilter extends Component {
  protected async init() {
    this.settings = {
      fields: {
        type: 'textarea',
        label: 'Fields',
        value: '',
        validate: `maxlength=1000`,
        validateMessage: `Maximun 1000 characters`,
        hint: 'Comma separated json fields to keep',
        attributes: { 'data-template-vars': '' },
      },
    };

    const dataEntries = ['fields'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    this.properties.defaultInputs = ['Input'];
    this.properties.defaultOutputs = ['Output'];

    this.drawSettings.displayName = 'JSON Filter';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Filters a JSON object based on the fields provided';
    this.drawSettings.shortDescription = 'Filters a JSON object based on the fields provided';
    this.drawSettings.color = '#65a698';
    this.drawSettings.addInputButton = null; // Disable the input button
    this.drawSettings.addInputButtonLabel = 'Inputs';

    this._ready = true;
  }
}
