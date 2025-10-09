import { Component } from './Component.class';
import { delay } from '../utils';
import { FunctionComponent } from './FunctionComponent.class';

const encodings = ['hex', 'base64', 'base64url', 'latin1'];
export class FEncDec extends FunctionComponent {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      action: {
        type: 'select',
        label: 'Action',
        hint: 'Action to perform',
        value: 'Encode',
        options: ['Encode', 'Decode'],
      },
      encoding: {
        type: 'select',
        label: 'encoding',
        value: 'hex',
        options: encodings,
      },
    };

    const dataEntries = ['action', 'encoding'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Output'];
    this.properties.defaultInputs = ['Data'];

    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.color = '#329bff';
    // #endregion

    this.properties.title = `${this.data.encoding} ${this.data.action}`;
    this.drawSettings.displayName = 'F:Encode/Decode';
  }
  protected async run() {
    if (!this.domElement.style.width) this.domElement.style.width = '130px';
    this.addEventListener('settingsSaved', async () => {
      this.title = `${this.data.encoding} ${this.data.action}`;
      this.domElement.querySelector('.title .text').textContent = this.title;
    });
  }
}
