import { Component } from './Component.class';
declare var Metro;
export class FormParser extends Component {
  protected async init() {
    this.settings = {
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        value: 'Use the context to extract the values of corresponding outputs',
      },
    };

    const dataEntries = ['prompt'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.inputs = [];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addInputButton = null;

    this._ready = true;
  }
}
