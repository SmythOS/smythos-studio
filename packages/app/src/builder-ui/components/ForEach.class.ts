import { Component } from './Component.class';
declare var Metro;
export class ForEach extends Component {
  protected async init() {
    this.settings = {
      format: {
        type: 'select',
        label: 'Output Format',
        value: 'full',
        options: [
          { text: 'Full', value: 'full' },
          { text: 'Minimal', value: 'minimal' },
          { text: 'Array Of Results', value: 'results-array' },
        ],
      },
    };

    const dataEntries = ['format'];
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
    this.properties.defaultOutputs = ['Loop', 'Result'];

    this.drawSettings.displayName = 'For Each';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Performs a for each loop on an array';
    this.drawSettings.shortDescription = 'Performs a for each loop on an array';
    this.drawSettings.color = '#4f81d5';
    this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButtonLabel = ' ';
    this.drawSettings.addOutputButtonLabel = ' ';

    this.drawSettings.showSettings = true;
    this._ready = true;
  }
}
