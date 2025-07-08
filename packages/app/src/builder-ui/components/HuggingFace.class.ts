import { Component } from './Component.class';
import hfParams from '../params/hugging-face.params.json';
import {
  kebabToCapitalize,
  handleKvFieldEditBtn,
  setLogoForDynamicComp,
  promptVaultInfo,
} from '../utils';

declare var Metro;

export class HuggingFace extends Component {
  private name: string;
  private _displayName: string;
  private desc: string;
  private modelTask: string;
  private defaultParameters: Record<string, unknown>;
  private parametersInfo: string;
  //private inputConfig: Record<string, unknown>;
  private inputInfoHtml: string;

  protected async prepare() {
    /* We retrieve data from the sender component because the this.data isn't available when redraw is called. */
    this.name = this.data?.name || this.properties.sender?.getAttribute('smt-name') || '';
    this._displayName =
      this.data?.displayName || this.properties.sender?.querySelector('.name')?.textContent || '';
    this.desc = this.data?.desc || this.properties.sender?.getAttribute('smt-desc') || '';
    this.modelTask =
      this.data?.modelTask || this.properties.sender?.getAttribute('smt-model-task') || '';

    this.parametersInfo = '';
    this.defaultParameters = {};
    //this.inputConfig = {};
    this.inputInfoHtml = '';

    const parameters = hfParams?.[this.modelTask]?.parameters;

    if (parameters) {
      for (const key in parameters) {
        const parameter = parameters[key];
        this.defaultParameters[key] = parameter.default;

        this.parametersInfo += `<div class="comp-config-info">
                    <h6 class="info__title">${key}</h6>
                    <div class="info_item">${parameter?.desc}</div>
                `;

        if (parameter?.supportedValues?.length > 0) {
          for (const value of parameter.supportedValues) {
            this.parametersInfo += `
                            <div class="info_item">
                                <strong>${value?.value}:</strong>
                                <span>${value?.desc || ''}</span>
                            </div>
                        `;
          }
        }

        this.parametersInfo += `</div>`;
      }
    }

    const formatRequest = hfParams?.[this.modelTask]?.formatRequest;
    const _hfParams = hfParams?.[this.modelTask]?.inputs;
    if (_hfParams && Object.keys(_hfParams).length > 0) {
      this.inputInfoHtml += `
                <div class="comp-config-info">
                    <h5 class="info__title">Inputs: </h5>
            `;

      for (const key in _hfParams) {
        this.properties.defaultInputs.push(key);

        const config = _hfParams[key];
        //this.inputConfig[key] = config;

        this.inputInfoHtml += `
                    <div class="info_item">
                        <strong>${key}: </strong>
                        <span>${config?.desc || ''}</span>
                    </div>
                `;
      }
      // if (typeof this.inputConfig === 'object' && this.inputConfig !== null) {
      //     this.inputConfig = {...this.inputConfig, formatRequest};
      // }
      this.inputInfoHtml += '<div>';
    }

    return true;
  }

  protected async init() {
    this.settings = {
      modelNameInfo: {
        type: 'div',
        html: `<div class="comp-config-info"><span><strong>Model: </strong> ${this.name}</span></div>`,
      },
      modelName: {
        type: 'hidden',
        value: this.name,
      },
      modelTaskInfo: {
        type: 'div',
        html: `<div class="comp-config-info"><span><strong>Task: </strong> ${kebabToCapitalize(
          this.modelTask,
        )}</span></div>`,
      },
      modelTask: {
        type: 'hidden',
        value: this.modelTask,
      },
      inputsInfo: {
        type: 'div',
        html: this.inputInfoHtml,
      },
      // inputConfig: {
      //     type: 'hidden',
      //     value: JSON.stringify(this.inputConfig),
      // },
      accessToken: {
        type: 'password',
        label: 'Access Token',
        value: '',
        validate: `required maxlength=350`,
        validateMessage: `Ensure a non-empty access token and limit text to 50 characters`,
        attributes: {
          placeholder: 'hf_...',
          'data-vault': `${this.constructor.name},All`,
        },
        events: {
          input: promptVaultInfo,
          focus: promptVaultInfo, // required when insert the key from vault key list
        },
      },
      disableCache: {
        type: 'checkbox',
        label: 'Disable Cache',
        hint: 'Hugging Face models automatically fetch cached responses. For a new response each time, you can Disable Cache.',
        value: false,
      },
    };

    let dataEntries = ['accessToken', 'modelName', 'modelTask' /*, 'inputConfig'*/];

    // Set parameters if available
    if (Object.keys(this.defaultParameters || {}).length > 0) {
      this.settings.parameters = {
        type: 'textarea',
        label: 'Parameters',
        validate: `custom=isValidJsonWithoutEmptyField`,
        validateMessage: 'Provide a Valid JSON with non-empty keys/values',
        readonly: true,
        value: JSON.stringify(this.defaultParameters, null, 2),
        actions: [
          {
            label: 'edit',
            events: {
              click: handleKvFieldEditBtn.bind(this, 'parameters'),
            },
          },
        ],
      };

      this.settings.parametersInfo = {
        type: 'div',
        html: this.parametersInfo,
      };

      dataEntries.push('parameters');
    }

    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = '+ out';
    this.drawSettings.addInputButton = '+ in';

    this.drawSettings.displayName = this._displayName || this.constructor.name;
    this.drawSettings.shortDescription = this.desc;

    this.properties.defaultOutputs = ['Output'];

    this._ready = true;
  }

  protected async run(): Promise<any> {
    // here this.properties.data is stable than this.data
    const logoUrl = this.properties.data?.logoUrl;

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, logoUrl);

    this.addEventListener('settingsOpened', (sidebar) => {
      const accessTokenField = sidebar?.querySelector('#accessToken');
      promptVaultInfo({ target: accessTokenField });
    });
  }

  public redraw(triggerSettings = true): HTMLDivElement {
    const div = super.redraw(triggerSettings);

    const name = this.properties.sender?.getAttribute('smt-name') || '';
    const displayName = this.properties.sender?.querySelector('.name')?.textContent || '';
    const desc = this.properties.sender?.getAttribute('smt-desc') || '';
    const modelTask = this.properties.sender?.getAttribute('smt-model-task') || '';
    const logoUrl = this.properties.sender?.querySelector('img')?.src || '';

    const internalNameDiv = div.querySelector('.internal-name');
    internalNameDiv.innerHTML = `<span class="internal-name-prefix huggingface">HuggingFace </span>${this.drawSettings.displayName}`;

    //const _hfParams = hfParams?.[modelTask]?.inputs;
    // const inputConfig = {};

    // if (_hfParams && Object.keys(_hfParams).length > 0) {
    //     for (const key in _hfParams) {
    //         inputConfig[key] = _hfParams[key].type;
    //     }
    // }

    this.data = {
      ...this.data,
      name,
      displayName,
      desc,
      modelTask,
      //inputConfig: JSON.stringify(inputConfig),
      logoUrl,
    };

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, logoUrl);

    return div;
  }
}
