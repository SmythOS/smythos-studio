import { Component } from './Component.class';
declare var Metro;
export class Await extends Component {
  protected async init() {
    this.settings = {
      html: {
        type: 'div',
        html: 'The first met condition will interrupt Await and continue the workflow.',
      },
      jobs_count: {
        type: 'range',
        label: 'Minimum Jobs Count',
        min: 1,
        max: 100,
        value: 1,
        step: 1,
        validate: `min=1 max=100`,
        validateMessage: `Allowed range 1 to 100`,
      },
      max_time: {
        type: 'range',
        label: 'Maximum wait time in seconds',
        min: 1,
        max: 10800,
        value: 1,
        step: 1,
        validate: `min=1 max=10800`,
        validateMessage: `Allowed range 1 to 10800`,
      },
    };

    const dataEntries = ['jobs_count', 'max_time'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    this.properties.defaultInputs = ['Jobs'];
    this.properties.defaultOutputs = ['Results'];

    this.drawSettings.displayName = 'Await';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Wait for asynchronous jobs';
    this.drawSettings.shortDescription = 'Wait for asynchronous jobs';
    this.drawSettings.color = '#4fd581';
    //this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButton = null;
    //this.drawSettings.addInputButtonLabel = '';
    this.drawSettings.addOutputButtonLabel = ' ';

    this.drawSettings.showSettings = true;
    this._ready = true;
  }
}
