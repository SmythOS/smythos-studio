import { Component } from './Component.class';
declare var Metro;
export class EmailSender extends Component {
  protected async init() {
    this.settings = {
      email: {
        type: 'input',
        label: 'Email',
        value: '',
        hint: 'customer@email.com',
      },
    };

    const dataEntries = ['email'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.outputs = ['Success', 'Error'];

    if (this.properties.inputs.length == 0) this.properties.inputs = ['Input'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this._ready = true;
  }
}
