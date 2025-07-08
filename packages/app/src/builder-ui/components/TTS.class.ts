import { Component } from './Component.class';
declare var Metro;
export class TTS extends Component {
  protected async init() {
    const provider = this.properties.sender?.getAttribute('provider') || '';
    this.settings = {
      format: {
        type: 'input',
        label: 'Format',
        value: provider,
        attributes: { readonly: 'readonly' },
      },
    };

    const dataEntries = ['format'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    if (this.properties.inputs.length == 0) this.properties.inputs = ['Text'];
    this.properties.outputs = ['Audio'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButton = null;

    this._ready = true;
  }

  public redraw(triggerSettings = true): HTMLDivElement {
    const div = super.redraw(triggerSettings);

    const iconClassName =
      this.properties.sender?.querySelector('.icon').className || 'icon mif-file-empty';
    const titleBar = this.domElement.querySelector('.title-bar');
    const icon = titleBar.querySelector('.icon');
    icon.className = iconClassName;

    return div;
  }
}
