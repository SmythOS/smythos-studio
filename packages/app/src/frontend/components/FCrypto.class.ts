import { Component } from './Component.class';
import { delay } from '../utils';
import { FunctionComponent } from './FunctionComponent.class';

declare var Metro;
export class FCrypto extends FunctionComponent {
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
      function: {
        type: 'select',
        label: 'Function',
        hint: 'Function name',
        value: 'BASE64',
        options: [
          'BASE64',
          'MD5',
          'SHA1',
          'SHA256',
          'SHA512',
          'HMACHex',
          'HMACBase64',
          'HMACBase64URL',
          'HMACBase64URLNoPadding',
        ],
      },
    };

    const dataEntries = ['action', 'function'];
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
    this.properties.defaultInputs = ['Input'];

    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.color = '#329bff';
    // #endregion

    this.properties.title = `${this.data.function} ${this.data.action}`;
    this.drawSettings.displayName = 'F:Crypto';
  }
  protected async run() {
    if (!this.domElement.style.width) this.domElement.style.width = '130px';
    this.addEventListener('settingsSaved', async () => {
      this.title = `${this.data.function} ${this.data.action}`;
      this.domElement.querySelector('.title .text').textContent = this.title;
    });
  }
}
