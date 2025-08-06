import { Component } from './Component.class';

export class ComputerUse extends Component {
  protected async prepare() {
    return true;
  }

  protected async init() {
    this.settings = this.generateSettings();

    const dataEntries = [
      'prompt',
      // , 'environment'
    ];

    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') {
        this.data[item] = this.settings[item].value;
      }
    }

    this.properties.defaultOutputs = ['Output'];
    this.properties.defaultInputs = ['Prompt'];

    this.drawSettings.displayName = 'Computer Use';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.componentDescription =
      'Control a virtual computer to perform tasks using natural language commands';
    this.drawSettings.shortDescription = 'AI-powered computer automation';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }

  private generateSettings() {
    return {
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        validate: 'required minlength=2',
        validateMessage: 'Please provide a prompt with at least 2 characters',
        value: '{{Prompt}}',
        attributes: {
          'data-template-vars': 'true',
          placeholder:
            'Describe what you want the computer to do. For example: "Go to google.com and search for SmythOS"',
        },
        help: 'Natural language instructions for what you want the computer to do',
      },
      // environment: {
      //   type: 'select',
      //   label: 'Environment',
      //   value: 'browser',
      //   options: ['browser', 'desktop'],
      //   section: 'Advanced',
      //   hint: 'The type of computer environment to use',
      //   hintPosition: 'left',
      // },
    };
  }

  protected async run() {
    // Add any runtime event listeners or initialization here
    this.addEventListener('settingsOpened', this.handleSettingsOpened.bind(this));
  }

  private async handleSettingsOpened(sidebar, component) {
    if (component !== this) return;

    // Handle environment-dependent field visibility
    // const envSelect = sidebar.querySelector('#environment');
    // if (envSelect) {
    //   const updateFieldVisibility = () => {
    //     const env = envSelect.value;
    //     const browserOnlyFields = sidebar.querySelectorAll('[data-supported-env="browser"]');
    //     browserOnlyFields.forEach((field) => {
    //       const parent = field.closest('.form-group');
    //       if (parent) {
    //         parent.style.display = env === 'browser' ? '' : 'none';
    //       }
    //     });
    //   };

    //   envSelect.addEventListener('change', updateFieldVisibility);
    //   // Initial visibility update
    //   updateFieldVisibility();
    // }
  }

  public redraw(triggerSettings?: boolean): any {
    super.redraw(triggerSettings);

    const computerStateContainer = document.createElement('div');
    computerStateContainer.className =
      'computer-state-container mt-4 p-1 border border-gray-300 rounded-lg shadow-sm bg-white';
    const computerStateImage = document.createElement('img');
    computerStateImage.className =
      'computer-state-img w-full h-auto rounded-md object-contain max-h-[400px]';
    // add placeholder image
    computerStateImage.src = '/img/builder/computer-use-ui-placeholder.png';
    computerStateImage.onerror = () => {
      computerStateImage.src = '/img/builder/computer-use-ui-placeholder.png';
    };
    // Add a title/label above the image
    // const computerStateLabel = document.createElement('div');
    // computerStateLabel.className = 'text-sm font-medium text-gray-700 mb-2';
    // computerStateLabel.textContent = 'Computer Screen';
    // computerStateContainer.appendChild(computerStateLabel);

    computerStateContainer.appendChild(computerStateImage);
    this.domElement.appendChild(computerStateContainer);

    return this.domElement;
  }
}
