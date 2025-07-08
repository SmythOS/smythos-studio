import { Component } from './Component.class';
import { delay } from '../utils';
import { FunctionComponent } from './FunctionComponent.class';

declare var Metro;
export class FSign extends FunctionComponent {
  protected async init() {
    // #region [ Settings config ] ==================

    this.settings = {
      signMethod: {
        type: 'select',
        label: 'Signature Method',
        //hint: 'Action to perform',
        value: 'HMAC',
        options: ['HMAC', 'RSA'],
      },
      dataTransform: {
        type: 'select',
        label: 'Data Transform',
        help: 'If the provided data is not a string, it will be transformed using the selected method before signing',
        //hint: 'Action to perform',
        value: 'Stringify',
        options: ['Stringify', 'Querystring'],
      },
      key: {
        type: 'textarea',
        label: 'Key / Secret',
        attributes: { 'data-template-vars': 'true', 'data-vault': `APICall,ALL_NON_GLOBAL_KEYS` },
        hint: 'This will be used if the input key is not supplied as input',
        value: '',
      },
      keyMessage: {
        type: 'div',
        class: 'hidden',
        html: '<b>The Key will be read from input</b>',
      },
      hashType: {
        type: 'select',
        label: 'Hash Type',
        value: 'md5',
        options: ['md5', 'sha1', 'sha256', 'sha512'],
      },
      RSA_padding: {
        type: 'select',
        class: 'hidden',
        label: 'RSA Options',
        value: 'RSA_PKCS1_PADDING',
        options: ['RSA_PKCS1_PADDING', 'RSA_PKCS1_PSS_PADDING', 'RSA_NO_PADDING'],
      },
      RSA_saltLength: {
        type: 'number',
        class: 'hidden',
        label: 'RSA Salt Length',
        value: ['RSA_PSS_SALTLEN_DIGEST', 'RSA_PSS_SALTLEN_MAX_SIGN'],
      },
      encoding: {
        type: 'select',
        label: 'Output encoding',
        //hint: 'Output encoding',
        value: 'hex',
        options: ['hex', 'base64', 'base64url', 'latin1', 'utf8'],
      },
    };

    const dataEntries = [
      'signMethod',
      'dataTransform',
      'key',
      'hashType',
      'RSA_padding',
      'RSA_saltLength',
      'encoding',
    ];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ Output config ] ==================
    //this.outputSettings = { ...this.outputSettings, description: { type: 'string', default: '', editConfig: { type: 'textarea' } } };
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Signature'];
    this.properties.defaultInputs = ['Data', 'Key'];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.color = '#0083ff';
    // #endregion

    this.properties.title = `${this.data.signMethod.toUpperCase()}-${this.data.hashType.toUpperCase()} :: ${
      this.data.encoding
    }`;
    this.drawSettings.displayName = 'F:Sign';
  }
  protected async run() {
    if (!this.domElement.style.width) this.domElement.style.width = '130px';
    this.addEventListener('settingsSaved', async () => {
      this.title = `${this.data.signMethod.toUpperCase()}-${this.data.hashType.toUpperCase()} :: ${
        this.data.encoding
      }`;
      this.domElement.querySelector('.title .text').textContent = this.title;
    });

    this.addEventListener('settingsOpened', async (settingsSidebar) => {
      await delay(100);
      const keyField = settingsSidebar.querySelector('.form-box[data-field-name="key"]');
      const keyMessageField = settingsSidebar.querySelector(
        '.form-box[data-field-name="keyMessage"]',
      );
      const jsPlumbInstance: any = this.workspace.jsPlumbInstance;
      const connections = jsPlumbInstance.getConnections({
        target: this.domElement.querySelector('.endpoint[smt-name="Key"]'),
      });
      if (connections.length > 0) {
        keyField.classList.add('hidden');
        keyMessageField.classList.remove('hidden');
      } else {
        keyField.classList.remove('hidden');
        keyMessageField.classList.add('hidden');
      }
    });

    this.addEventListener('connectionDetached', async (name, element, component) => {
      if (name === 'Key') {
        const settingsSidebar = this.getSettingsSidebar();
        if (!settingsSidebar) return;

        const keyField = settingsSidebar.querySelector('.form-box[data-field-name="key"]');
        const keyMessageField = settingsSidebar.querySelector(
          '.form-box[data-field-name="keyMessage"]',
        );
        keyField.classList.remove('hidden');
        keyMessageField.classList.add('hidden');
      }
    });
    this.addEventListener('connectionAttached', async (name, element, component) => {
      if (name === 'Key') {
        const settingsSidebar = this.getSettingsSidebar();
        if (!settingsSidebar) return;

        const keyField = settingsSidebar.querySelector('.form-box[data-field-name="key"]');
        const keyMessageField = settingsSidebar.querySelector(
          '.form-box[data-field-name="keyMessage"]',
        );
        keyField.classList.add('hidden');
        keyMessageField.classList.remove('hidden');
      }
    });
  }
}
