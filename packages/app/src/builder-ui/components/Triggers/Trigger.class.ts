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

    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButtonLabel = '';
    this.drawSettings.addInputButtonLabel = '';
    this.drawSettings.componentDescription = ' ';

    this.drawSettings.shortDescription = '';
    this.drawSettings.color = '#ff00f2';
    // #endregion
  }

  public redraw(triggerSettings?: boolean): any {
    super.redraw(triggerSettings);

    // add new connection endpoint
    this.domElement.classList.add('Trigger');
    this.domElement.setAttribute('smt-trigger', '');

    // const _ResultOutput = document.createElement('div');
    // _ResultOutput.className = 'smyth endpoint output-endpoint GmailTrigger';
    // _ResultOutput.setAttribute('smt-name', 'Result');
    // _ResultOutput.innerHTML = `<span class="name"><span class="label">Result</span></span>`;
    // this.outputContainer.appendChild(_ResultOutput);
  }
}
