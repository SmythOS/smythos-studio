import { Component } from './Component.class';
declare var Metro;
export class DBInsert extends Component {
  protected async init() {
    this.settings = {
      db: {
        type: 'input',
        label: 'DB Connection',
        hint: 'Database Connection string',
        value: '',
      },
      table: {
        type: 'input',
        label: 'Table',
        hint: 'Table name',
        value: '',
      },
    };
    const dataEntries = ['db', 'table'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.outputs = [];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this._ready = true;
  }
}
