import { FunctionComponent } from './FunctionComponent.class';

const encodings = ['hex', 'base64', 'base64url', 'latin1'];
export class FEncDec extends FunctionComponent {
  // Component description for settings sidebar
  public componentDescription = 'Converts data between text and binary encodings for safe storage, transport, and API compatibility. Supports Base64, Base64URL, hex, UTF-8, and Latin-1 with encode or decode actions. For quick picks and examples, see encoding basics.';
  public componentDocsLink = 'https://smythos.com/docs/agent-studio/components/crypto/encode-decode/?utm_source=studio&utm_medium=tooltip&utm_campaign=encode-decode&utm_content=component-header';

  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      action: {
        type: 'select',
        label: 'Action',
        help: 'Select Encode to produce a formatted string, or Decode to read one.',
        value: 'Encode',
        options: ['Encode', 'Decode'],
      },
      encoding: {
        type: 'select',
        label: 'encoding',
        value: 'hex',
        options: encodings,
        help: 'Choose the scheme: Base64 for binary, hex for hashes, UTF-8 for text. <a href="https://smythos.com/docs/agent-studio/components/crypto/encode-decode/?utm_source=studio&utm_medium=tooltip&utm_campaign=encode-decode&utm_content=encoding#step-1-select-an-action-and-encoding-method" target="_blank" class="text-blue-600 hover:text-blue-800">See common schemes</a>',
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
