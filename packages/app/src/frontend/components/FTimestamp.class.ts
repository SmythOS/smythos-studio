import { Component } from './Component.class';
import { delay } from '../utils';
import { FunctionComponent } from './FunctionComponent.class';

const encodings = ['hex', 'base64', 'base64url', 'latin1'];
export class FTimestamp extends FunctionComponent {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {};

    const dataEntries = [];
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
    this.properties.defaultOutputs = ['Timestamp'];
    this.properties.defaultInputs = ['Trigger'];

    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.showSettings = false;
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.color = '#329bff';
    // #endregion

    this.properties.title = `Timestamp`;
    this.drawSettings.displayName = 'F:Timestamp';
  }
  protected async run() {
    if (!this.domElement.style.width) this.domElement.style.width = '140px';
    this.addEventListener('settingsSaved', async () => {
      this.title = `Timestamp`;
      this.domElement.querySelector('.title .text').textContent = this.title;
    });
  }
}
