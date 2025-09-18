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
        help: 'Choose HMAC with a shared secret or RSA with a private key.',
        value: 'HMAC',
        options: ['HMAC', 'RSA'],
      },
      dataTransform: {
        type: 'select',
        label: 'Data Transform',
        help: 'Prepare the data to sign: raw bytes, JSON stringify, or a canonical form. <a href="https://smythos.com/docs/agent-studio/components/crypto/sign/?utm_source=studio&utm_medium=tooltip&utm_campaign=sign&utm_content=data-transform#data-canonicalization" target="_blank" class="text-blue-600 hover:text-blue-800">See canonical formats</a>',
        //hint: 'Action to perform',
        value: 'Stringify',
        options: ['Stringify', 'Querystring'],
      },
      key: {
        type: 'textarea',
        label: 'Key / Secret',
        attributes: { 'data-template-vars': 'true', 'data-vault': `APICall,ALL_NON_GLOBAL_KEYS` },
        help: 'Provide the signing secret or private key; store in Vault, not in code.',
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
        help: 'Select the digest used inside the method, for example SHA-256.',
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
        help: 'Choose how the signature is returned: hex, Base64, or Base64URL.',
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

    this.properties.title = `${this.data.signMethod.toUpperCase()}-${this.data.hashType.toUpperCase()} :: ${this.data.encoding
      }`;
    this.drawSettings.displayName = 'F:Sign';
  }
  protected async run() {
    if (!this.domElement.style.width) this.domElement.style.width = '130px';
    this.addEventListener('settingsSaved', async () => {
      this.title = `${this.data.signMethod.toUpperCase()}-${this.data.hashType.toUpperCase()} :: ${this.data.encoding
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
