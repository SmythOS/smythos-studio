import { Component } from './Component.class';

export class MemoryWriteObject extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      memoryName: {
        type: 'input',
        label: 'Memory Name',
        value: '',
        hint: 'Enter memory name',
        validate: `required maxlength=100`,
        validateMessage: 'Enter a non-empty name, not more than 100 characters.',
        attributes: { 'data-template-vars': 'true' },
        help: 'Groups all saved keys under one namespace for consistent reads and deletes.',
        doNotValidateOnLoad: true,
      },
      scope: {
        type: 'select',
        label: 'Scope',
        hint: 'Memory Scope',
        value: 'ttl',
        options: [
          { value: 'ttl', text: 'TTL' },
          //{ value: 'session', text: 'Session' },
          { value: 'request', text: 'Request' },
        ],
        help: 'Controls lifespan and visibility, Request for this run or TTL to persist until expiry.',
        events: {
          change: (event) => {
            console.log('change', event);
            const target = event.target as HTMLSelectElement;
            const form = target.closest('form');
            const ttl = form?.querySelector('[data-field-name="ttl"]');
            if (target.value === 'ttl') ttl?.classList.remove('hidden');
            else ttl?.classList.add('hidden');
          },
        },
      },
      ttl: {
        type: 'select',
        label: 'TTL',
        help: 'Sets how long a TTL value remains available before automatic deletion.',
        value: '300',
        options: [
          { value: '300', text: '5 minutes' },
          { value: '600', text: '10 minutes' },
          { value: '900', text: '15 minutes' },
          { value: '1800', text: '30 minutes' },
          { value: '3600', text: '1 hour' },
          { value: '7200', text: '2 hours' },
          { value: '14400', text: '4 hours' },
          { value: '28800', text: '8 hours' },
          { value: '43200', text: '12 hours' },
          { value: '86400', text: '1 day' },
          { value: '604800', text: '1 week' },
        ],
      },
    };

    const dataEntries = ['memoryName'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Keys'];
    this.properties.defaultInputs = [];
    if (this.properties.inputs.length == 0) this.properties.inputs = ['Data'];
    // #endregion

    // #region [ Draw config ] ==================
    //this.drawSettings.showSettings = false;
    this.drawSettings.displayName = 'Memory Write Multi';
    this.drawSettings.iconCSSClass = 'svg-icon Memory ' + this.constructor.name;
    this.drawSettings.addOutputButton = ' ';
    // this.drawSettings.addInputButton = ' + Entry';
    this.drawSettings.addInputButton = 'Mem Entry';
    this.drawSettings.addOutputButtonLabel = ' ';
    // #endregion
  }

  protected async run(): Promise<any> {
    this.addEventListener('settingsOpened', async (sidebar) => {
      const ttl = sidebar.querySelector('[data-field-name="ttl"]');
      if (ttl) ttl.classList.add('hidden');
      const scope = sidebar.querySelector('[data-field-name="scope"]');
      const scopeValue = scope?.value;
      if (scopeValue === 'ttl') ttl?.classList.remove('hidden');
      else ttl?.classList.add('hidden');
    });

    this.addEventListener('settingsSaved', (settingsValues) => {
      //console.log(settingsValues);
    });
  }
}
