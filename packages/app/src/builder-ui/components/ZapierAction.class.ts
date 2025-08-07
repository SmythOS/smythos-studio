import { Component } from './Component.class';
import { setLogoForDynamicComp } from '../utils';

declare var Metro;
export class ZapierAction extends Component {
  private actionId: string;
  private actionName: string;
  private params: string;
  private logoUrl: string;
  private apiKey: string;
  private inputs: string[];

  protected async prepare() {
    /* We retrieve data from the sender component because the this.data isn't available when redraw is called. */
    this.actionId = this.data?.actionId || this.properties.sender?.getAttribute('smt-id') || '';
    this.actionName =
      this.data?.actionName || this.properties.sender?.getAttribute('smt-name') || '';
    this.params = this.data?.params || this.properties.sender?.getAttribute('smt-params') || '';
    this.logoUrl = this.data?.logoUrl || this.properties.sender?.querySelector('img')?.src || '';
    this.apiKey = this.data?.apiKey || this.properties.sender?.getAttribute('smt-api-key') || '';

    if (this.params) {
      const paramsObj = JSON.parse(this.params || '{}');
      const inputs = [];

      for (const param in paramsObj) {
        inputs.push(param);
      }

      this.inputs = inputs;
    }

    return true;
  }

  protected async init() {
    this.properties.defaultInputs = this.inputs;
    this.properties.defaultOutputs = ['Output'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = '+ out';
    this.drawSettings.addInputButton = '';

    this.drawSettings.displayName = this.actionName || this.constructor.name;
    this.drawSettings.shortDescription = this.actionName || '';

    this.drawSettings.showSettings = false;

    this._ready = true;
  }

  public redraw(triggerSettings = true): HTMLDivElement {
    const div = super.redraw(triggerSettings);

    const internalNameDiv = div.querySelector('.internal-name');
    internalNameDiv.innerHTML = `<span class="internal-name-prefix zapier">Zapier </span>${this.drawSettings.displayName}`;

    this.data = {
      ...this.data,
      actionName: this.actionName,
      actionId: this.actionId,
      logoUrl: this.logoUrl,
      apiKey: this.apiKey,
      params: this.params,
    };

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, this.logoUrl);

    div.setAttribute('data-action-id', this.actionId);

    return div;
  }
}
