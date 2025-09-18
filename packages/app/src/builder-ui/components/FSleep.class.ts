import { FunctionComponent } from './FunctionComponent.class';

const encodings = ['hex', 'base64', 'base64url', 'latin1'];
export class FSleep extends FunctionComponent {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      delay: {
        type: 'range',
        label: 'Delay',
        help: 'Pause for the set seconds, then continue; input passes through unchanged. <a href="https://smythos.com/docs/agent-studio/components/advanced/sleep/?utm_source=studio&utm_medium=tooltip&utm_campaign=sleep&utm_content=component-header#step-1-set-the-delay-duration" target="_blank" class="text-blue-600 hover:text-blue-800">See dynamic delays and limits</a>',
        min: 1,
        max: 3600,
        value: 1,
        step: 1,
        validate: `min=1 max=3600`,
        validateMessage: `Allowed range 1 to 3600`,
      },
    };

    const dataEntries = ['delay'];
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

    this.properties.title = `Sleep for ${this.data.delay}s`;
    this.drawSettings.displayName = 'F:Sleep';
  }
  protected async run() {
    if (!this.domElement.style.width) this.domElement.style.width = '130px';
    this.addEventListener('settingsSaved', async () => {
      this.title = `Sleep for ${this.data.delay}s`;
      this.domElement.querySelector('.title .text').textContent = this.title;
    });
  }
}
