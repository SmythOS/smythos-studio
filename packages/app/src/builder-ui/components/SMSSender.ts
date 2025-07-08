import { Component } from './Component.class';
declare var Metro;
export class SMSSender extends Component {
  protected async init() {
    this.settings = {
      phone: {
        type: 'input',
        label: 'Phone Number',
        value: '',
        hint: '+1 555 555 5555',
      },
    };

    const dataEntries = ['phone'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.outputs = ['Success', 'Error'];

    if (this.properties.inputs.length == 0) this.properties.inputs = ['Input'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addInputButton = null;
    this._ready = true;
  }
}
