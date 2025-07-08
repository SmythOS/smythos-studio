import { Component, ComponentList } from './Component.class';
import { alert } from '../ui/dialogs';
import { delay } from '../utils';
import config from '../config';
declare var Metro;
export class POST_APIEndpoint extends Component {
  protected async init() {
    this.settings = {
      endpoint: {
        type: 'input',
        label: 'Endpoint',
        value: '',
        validate: `required maxlength=50 custom=isValidEndpoint`,
        validateMessage: `Provide a valid endpoint that only contains 'a-z', 'A-Z', '0-9', '-', '_' , without leading or trailing spaces.`,
        hint: 'Enter endpoint name',
      },
      ai_exposed: {
        type: 'checkbox',
        label: 'Expose to AI',
        value: true,
        hint: 'If checked, the endpoint can be used by AI (e.g. ChatGPT, Chatbot, ...)',
        events: {
          change: this.exposeIAChangeHandler.bind(this),
        },
      },
      description: {
        type: 'textarea',
        label: 'Instructions',
        value: '',
        hint: 'Instructions for AI Agent, Describes how to use this endpoint when exposed to an LLM',
        validate: `maxlength=5000`,
        validateMessage: 'Your text exceeds the 5,000 character limit.',
      },
      summary: {
        type: 'textarea',
        label: 'Description',
        value: '',
        hint: 'Short description of the endpoint, used for documentation',
        validate: `maxlength=1000`,
        validateMessage: 'Your text exceeds the 1,000 character limit.',
      },
    };
    const dataEntries = [/*'domain', */ 'endpoint', 'description', 'ai_exposed', 'summary'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.inputSettings = {
      ...this.inputSettings,
      description: {
        type: 'string',
        label: 'Description',
        default: '',
        editConfig: { type: 'textarea' },
      },
      isFile: {
        type: 'boolean',
        editConfig: { type: 'checkbox', label: 'Binary Input', value: false, cls: 'hidden' },
      },
    };

    this.properties.defaultOutputs = ['headers', 'body', 'query'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = 'Request Parts';
    this.drawSettings.addInputButton = 'Parameters';
    this.drawSettings.showSettings = true;
    this.drawSettings.inputMaxConnections = 0;
    this.drawSettings.shortDescription = 'HTTP API Endpoint - Expose your agent as a REST API';
    this.drawSettings.color = '#b700f1';

    this._ready = true;
  }

  private async exposeIAChangeHandler(e) {
    console.log(e, e.target, e.target.checked);
    const form = e.target.closest('form');
    if (!form) return;
    const description = form.querySelector('.form-box[data-field-name="description"]');
    if (!description) return;

    if (e.target.checked) {
      description.classList.remove('hidden');
    } else {
      description.classList.add('hidden');
    }
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
    const outputName = `body.${name}`;
    const outputDiv: any = await super.addOutput(outputParent, outputName);

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

  protected async run(): Promise<any> {
    this.addEventListener('settingsOpened', async (sidebar) => {
      await delay(50);
      const description = sidebar.querySelector('.form-box[data-field-name="description"]');
      if (!description) return;
      if (this.data.ai_exposed) {
        description.classList.remove('hidden');
      } else {
        description.classList.add('hidden');
      }
    });

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
        const newOutputName = `body.${newName}`;
        outputDiv.setAttribute('smt-name', newOutputName);
        outputDiv.querySelector('.name').innerText = newOutputName;
      }
    });
  }
}
