import { Component } from './Component.class';
declare var Metro;
export class Memory extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      name: {
        type: 'input',
        label: 'name',
        value: '',
        hint: 'Enter memory name',
      },
      scope: {
        type: 'select',
        label: 'Scope',
        hint: 'Memory Scope',
        value: 'Session',
        options: ['Session'],
      },
      // prompt_select:{
      //     type:'input-selector',
      //     options:['Input'],
      //     rel:'prompt'
      // }
    };

    // const dataEntries = ['ttl'];
    // for (let item of dataEntries) {
    //     if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    // }

    this.data = {};
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['_list'];
    this.properties.defaultInputs = ['_reset'];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.showSettings = false;
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    // this.drawSettings.addOutputButton = null;
    // this.drawSettings.addInputButton = ' + Entry';
    this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButton = ' + Mem Entry';
    // #endregion
  }
  // public inputNameAvailable(name) {
  //     const input = this.inputContainer.querySelector(`.input-endpoint[smt-name="${name}"]`);
  //     if (input) return false;
  //     // //find if there is an output with the same name
  //     const outputEP = this.outputContainer.querySelector(`.output-endpoint[smt-name="${name}"]`);
  //     if (!outputEP) return true;

  //     console.log('outputEP', outputEP);
  //     if (outputEP._inputDivElement == input) return false;

  //     return true;
  // }
  public outputNameExists(name) {
    const output = this.outputContainer.querySelector(`.output-endpoint[smt-name="${name}"]`);
    if (output) return true;
    // //find if there is an output with the same name
    const inputEP = this.inputContainer.querySelector(`.input-endpoint[smt-name="${name}"]`);
    if (inputEP) return true;

    return false;
  }

  public async addOutput(parent: any, name: any): Promise<any> {
    if (this.properties.defaultInputs.includes(name)) return super.addOutput(parent, name);

    const outputDiv: any = await super.addOutput(parent, name);
    const inputParent = parent.parentElement.querySelector('.input-container');
    const inputDiv: any = await super.addInput(inputParent, name);

    outputDiv.querySelector('.ep').setAttribute('smt-con-thickness', '8');
    outputDiv.querySelector('.ep').setAttribute('smt-con-hide-overlays', 'true');

    outputDiv._inputDivElement = inputDiv;
    inputDiv._outputDivElement = outputDiv;

    this.repaint();
    return outputDiv;
  }

  public async addInput(parent: any, name: any): Promise<any> {
    if (this.properties.defaultInputs.includes(name)) return super.addInput(parent, name);

    return null;
  }
  public async deleteEndpoint(endpointElement) {
    console.log('deleting');
    super.deleteEndpoint(endpointElement);
    const otherEntry = endpointElement._inputDivElement || endpointElement._outputDivElement;

    if (endpointElement._inputDivElement) endpointElement.inputDivElement = null;
    if (endpointElement._outputDivElement) endpointElement.outputDivElement = null;

    if (otherEntry) {
      super.deleteEndpoint(otherEntry);
    }
  }
  protected async run() {
    this.addEventListener('endpointNameChanged', (endPoint, oldName, newName) => {
      console.log('endpointNameChanged', endPoint, oldName, newName);
      const inputDiv: any = endPoint.classList.contains('input-endpoint')
        ? endPoint
        : endPoint._inputDivElement;
      const outputDiv: any = endPoint.classList.contains('output-endpoint')
        ? endPoint
        : endPoint._outputDivElement;

      const inputName = inputDiv.getAttribute('smt-name');
      const outputName = outputDiv.getAttribute('smt-name');

      if (inputName != newName) {
        inputDiv.setAttribute('smt-name', newName);
        inputDiv.querySelector('.name').innerText = newName;
      }

      if (outputName != newName) {
        outputDiv.setAttribute('smt-name', newName);
        outputDiv.querySelector('.name').innerText = newName;
      }
    });

    return true;
  }
}
