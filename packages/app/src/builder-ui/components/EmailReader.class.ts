import { Component } from './Component.class';
declare var Metro;
export class EmailReader extends Component {
  protected async init() {
    this.settings = {
      server: {
        type: 'input',
        label: 'Server',
        value: '',
      },
      username: {
        type: 'select',
        label: 'Username',
        value: ['user1', 'user2'],
        options: ['user1', 'user2', 'user3'],
        attributes: { multiple: true },
      },
      password: {
        type: 'input',
        label: 'Password',
        value: '',
        attributes: { type: 'password' },
      },
    };

    const dataEntries = ['server', 'username', 'password'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.inputs = [];
    this.properties.outputs = ['All Content', 'From', 'Subject', 'Body', 'Attachments'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addInputButton = null;

    this._ready = true;
  }
}
