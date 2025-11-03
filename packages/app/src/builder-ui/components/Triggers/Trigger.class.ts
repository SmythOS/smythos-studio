import { Component } from '../Component.class';

export class Trigger extends Component {
  protected async init() {
    this.settings = {
      triggerEndpoint: {
        type: 'input',
        label: 'Trigger Endpoint',
        hint: 'Trigger Endpoint',
        validate: `required maxlength=50 custom=isValidEndpoint`,
        validateMessage: `Provide a valid endpoint that only contains 'a-z', 'A-Z', '0-9', '-', '_' , without leading or trailing spaces. Length should be less than 50 characters.`,
        attributes: { 'data-template-vars': 'true' },
      },
    };

    this.outputSettings = {
      ...this.outputSettings,
      expression: {
        type: 'text',
        label: 'Field Mapping',
        editConfig: {
          validate: 'required custom=isValidOutputName',
          validateMessage: `Field Mapping is required for triggers, Use a valid JSON path notation, e.g., Payload.id, Payload.name, etc.`,

          // fieldCls:
          //   'bg-white border text-gray-900 rounded block w-full outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal py-2 px-3 transition-all duration-150 ease-in-out border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500',
          attributes: {
            'data-trigger-vars': 'true',
            'data-auto-size': 'true',
            rows: '2',
            placeholder: `Map the triggers variables to this input`,
          }, // Enable auto-size for consistent UX with 2-line default
          //section: 'Advanced_Options',
          hintPosition: 'after_label',
        },
      },
    };

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Payload'];
    this.properties.defaultInputs = [];
    this.properties.outputProps = [{ name: 'Payload', type: 'string', color: '#95f562' }];
    // #endregion

    const dataEntries = ['triggerEndpoint'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #region [ Draw config ] ==================

    //this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButtonLabel = ' ';
    this.drawSettings.addInputButtonLabel = '';
    this.drawSettings.componentDescription = ' ';

    this.drawSettings.shortDescription = '';
    this.drawSettings.color = '#ff00f2';
    // #endregion
  }

  protected async run(): Promise<any> {
    this.addEventListener('outputEditorReady', (dialog) => {
      console.log('outputEditorReady', dialog);

      const triggerName = dialog.querySelector('.form-box [name="name"]');
      if (triggerName) {
        //ensure that the trigger name is available in the expression
        triggerName.setAttribute('data-triggers', this.uid);
      }

      //try to find the triggerExpression field by name
      const triggerExpression = dialog.querySelector('.form-box [name="expression"]');
      if (triggerExpression) {
        //ensure that the trigger variables are available in the expression
        triggerExpression.setAttribute('data-triggers', this.uid);
      }
    });
  }

  public redraw(triggerSettings?: boolean): any {
    super.redraw(triggerSettings);

    // add new connection endpoint
    this.domElement.classList.add('Trigger');
    this.domElement.setAttribute('smt-trigger', '');

    //bind trigger variables

    // const _ResultOutput = document.createElement('div');
    // _ResultOutput.className = 'smyth endpoint output-endpoint GmailTrigger';
    // _ResultOutput.setAttribute('smt-name', 'Result');
    // _ResultOutput.innerHTML = `<span class="name"><span class="label">Result</span></span>`;
    // this.outputContainer.appendChild(_ResultOutput);

    const toggleOutputContainer = document.createElement('button');
    toggleOutputContainer.className = 'toggle-output-container';
    const toggleIcon = document.createElement('i');
    toggleIcon.className = this.domElement.classList.contains('collapsed')
      ? 'fa-solid fa-chevron-right text-gray-300'
      : 'fa-solid fa-chevron-left text-gray-300';

    toggleOutputContainer.appendChild(toggleIcon);
    toggleOutputContainer.onclick = (event: MouseEvent) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
      this.domElement.classList.toggle('collapsed');
      if (this.domElement.classList.contains('collapsed')) {
        toggleIcon.className = 'fa-solid fa-chevron-right text-gray-300';
      } else {
        toggleIcon.className = 'fa-solid fa-chevron-left text-gray-300';
      }

      this.repaint();
    };
    this.outputContainer.appendChild(toggleOutputContainer);
  }
}
