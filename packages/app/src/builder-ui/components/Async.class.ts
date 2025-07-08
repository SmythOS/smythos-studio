import { Component } from './Component.class';
declare var Metro;
export class Async extends Component {
  protected async init() {
    this.settings = {};

    const dataEntries = [];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    this.properties.defaultInputs = [];
    this.properties.defaultOutputs = ['JobID'];

    this.drawSettings.displayName = 'Async';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Runs workflow asynchronously';
    this.drawSettings.shortDescription = 'Runs workflow asynchronously';
    this.drawSettings.color = '#4fd581';
    //this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButtonLabel = 'in/out';
    this.drawSettings.addOutputButtonLabel = ' ';

    this.drawSettings.showSettings = false;
    this._ready = true;
  }

  //override name availability check
  public inputNameExists(name: any): boolean {
    const input = this.inputContainer.querySelector(`.input-endpoint[smt-name="${name}"]`);
    if (input) return true;
    // //find if there is an output with the same name
    const outputEP = this.outputContainer.querySelector(`.output-endpoint[smt-name="${name}"]`);
    if (outputEP) return true;

    return false;
  }

  public async addInput(parent: any, name: any): Promise<any> {
    if (this.properties.defaultOutputs.includes(name)) return super.addInput(parent, name);

    const inputDiv: any = await super.addInput(parent, name);
    const outputParent = parent.parentElement.querySelector('.output-container');
    const outputDiv: any = await super.addOutput(outputParent, name);

    inputDiv.querySelector('.ep').setAttribute('smt-con-thickness', '8');
    inputDiv.querySelector('.ep').setAttribute('smt-con-hide-overlays', 'true');

    inputDiv._outputDivElement = outputDiv;
    outputDiv._inputDivElement = inputDiv;

    this.repaint();
    return inputDiv;
  }

  public async addOutput(parent: any, name: any): Promise<any> {
    if (this.properties.defaultOutputs.includes(name)) return super.addOutput(parent, name);

    return null;
  }

  public async deleteEndpoint(endpointElement) {
    console.log('deleting');
    super.deleteEndpoint(endpointElement);
    const otherEntry = endpointElement._outputDivElement || endpointElement._inputDivElement;

    if (endpointElement._outputDivElement) endpointElement.outputDivElement = null;
    if (endpointElement._inputDivElement) endpointElement.inputDivElement = null;

    if (otherEntry) {
      super.deleteEndpoint(otherEntry);
    }
  }
  protected async run() {
    this.addEventListener('endpointChanged', (prop, endPoint, oldName, newName) => {
      if (prop != 'name') return;
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
