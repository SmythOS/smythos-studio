import { Component } from './Component.class';
declare var Metro;
export class InputSync extends Component {
  protected async init() {
    this.settings = {
      inputs: {
        type: 'textarea',
        label: 'Inputs',
        value: '',
        hint: 'Comma separated list of inputs to wait for before triggering the outputs',
      },
    };

    const dataEntries = ['inputs'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    if (this.properties.inputs.length == 0) this.properties.inputs = ['Input'];
    this.properties.outputs = [];

    this._ready = true;
  }

  public redraw(triggerSettings = true): HTMLDivElement {
    const div = super.redraw(triggerSettings);
    div.classList.add(this.constructor.name);

    const titleBar = this.domElement.querySelector('.title-bar');
    const icon = titleBar.querySelector('.icon');
    icon.className = 'icon mif-share';

    //if (triggerSettings) this.editSettings();

    this.domElement.querySelector('.btn-add-output').remove();

    return div;
  }

  public async addInput(parent, name) {
    const inputEP = await super.addInput(parent, name);
    await super.addOutput(parent.parentElement.querySelector('.output-container'), name);
    return inputEP;
  }
}
