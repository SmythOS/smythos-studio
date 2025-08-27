import { Component } from './Component.class';
import { importRegex } from '../ui/form/custom-validator-functions';
import { promptVaultInfo } from '../utils';

export class ServerlessCode extends Component {
  public templateSupport = false;

  protected async init() {
    const packagesImportsSample = `/*
* Enter packages imports here
*/
import dayjs from 'dayjs';`;

    const codeSample = `/*
* Enter code body here
* return value is bound to component Output endpoint
*/
return dayjs().format();`;

    this.settings = {
      code_imports: {
        type: 'textarea',
        code: { mode: 'javascript', theme: 'chrome' },
        label: 'Code Editor',
        value: packagesImportsSample,
        // validate: `custom=isValidImports`,
        // validateMessage: `Invalid imports`,
        // hint: 'Packages to be used in the code',
        attributes: {
          class: 'code-imports',
          'data-scroll-margin-top': 5,
          'data-scroll-margin-bottom': 5,
          'data-scroll-margin-left': 0,
          'data-scroll-margin-right': 0,
        },
        classOverride: 'code-imports-container',
      },
      function_label: {
        type: 'div',
        html: `
        <div class="code-editor-label-container-wrapper">
        <div class="code-editor-label-container" id="function-label-top-container">
          <div class="code-editor-label-container-left-border"></div>
          <div id="function-label-text" class="code-editor-label-container-right-border">async main() {</div>
        </div>
        </div>`,
        label: '',
        attributes: {
          labelCase: 'none',
        },
        classOverride: 'function-label-container',
      },
      code_body: {
        type: 'textarea',
        code: { mode: 'javascript', theme: 'chrome', disableWorker: true },
        label: '',
        value: codeSample,
        validate: `maxlength=500000`,
        validateMessage: `The code length is limitted to 500,000 characters`,
        attributes: {
          labelCase: 'none',
          class: 'code-body',
          'data-scroll-margin-top': 5,
          'data-scroll-margin-bottom': 5,
          'data-scroll-margin-left': 0,
          'data-scroll-margin-right': 0,
        },
        classOverride: 'code-body-container',
      },
      function_label_end: {
        type: 'div',
        html: `
        <div class="code-editor-label-container">
          <div class="code-editor-label-container-left-border"></div>
          <div class="code-editor-label-container-right-border">}</div>
        </div>`,
        label: '',
        attributes: {
          labelCase: 'none',
        },
        classOverride: 'function-label-container',
      },
      pricing_note: {
        type: 'div',
        html: '<div class="pricing-note">* This component will incur cloud usage cost. Configure your custom keys in advance to avoid extra charges.</div>',
        label: '',
        attributes: {
          class: 'pricing-note',
        },
      },
      ...(!this.isLegacyPlan()
        ? {
            use_own_keys: {
              type: 'toggle',
              label: 'Use Custom Cloud Keys',
              value: false,
              // hint: 'NodeJS is executed in AWS Lambda, Bring your own keys',
              display: 'inline',
              events: {
                change: this.useOwnKeysChangeHandler.bind(this),
              },
              section: `${this.isLegacyPlan() ? 'Credentials' : 'Advanced'}`,
              attributes: {},
              classOverride: 'use-own-keys',
            },
          }
        : {}),
      hintSelect: {
        type: 'p',
        html: '<small>NodeJS is executed in AWS Lambda. You can bring your own keys or use our default keys.</small>',
        section: `${this.isLegacyPlan() ? 'Credentials' : 'Advanced'}`,
        attributes: {
          class: 'hint-select mt-[-30px]',
        },
      },
      accessKeyId: {
        type: 'input',
        label: 'AWS Access Key ID',
        value: '',
        validate: `${this.isLegacyPlan() ? 'required' : ''} maxlength=350`,
        validateMessage: `Ensure a non-empty AWS Access Key ID`,
        attributes: {
          placeholder: 'Select AWS Access Key ID',
          'data-vault': `All`,
          'data-vault-exclusive': true,
        },
        events: {
          input: (event) => promptVaultInfo(event, 'AWS_ACCESS_KEY_ID'),
          focus: (event) => promptVaultInfo(event, 'AWS_ACCESS_KEY_ID'),
        },
        section: `${this.isLegacyPlan() ? 'Credentials' : 'Advanced'}`,
      },
      secretAccessKey: {
        type: 'input',
        label: 'AWS Secret Access Key',
        value: '',
        validate: `${this.isLegacyPlan() ? 'required' : ''}maxlength=350`,
        validateMessage: `Ensure a non-empty AWS Secret Access Key`,
        attributes: {
          placeholder: 'Select AWS Secret Access Key',
          'data-vault': `All`,
          'data-vault-exclusive': true,
        },
        events: {
          input: (event) => promptVaultInfo(event, 'AWS_SECRET_ACCESS_KEY'),
          focus: (event) => promptVaultInfo(event, 'AWS_SECRET_ACCESS_KEY'), // required when insert the key from vault key list
        },
        section: `${this.isLegacyPlan() ? 'Credentials' : 'Advanced'}`,
      },
      region: {
        type: 'select',
        label: 'Region',
        value: 'us-east-1',
        options: [
          { text: 'US East (N. Virginia) - us-east-1', value: 'us-east-1' },
          { text: 'US East (Ohio) - us-east-2', value: 'us-east-2' },
          { text: 'US West (N. California) - us-west-1', value: 'us-west-1' },
          { text: 'US West (Oregon) - us-west-2', value: 'us-west-2' },
          { text: 'Africa (Cape Town) - af-south-1', value: 'af-south-1' },
          { text: 'Asia Pacific (Hong Kong) - ap-east-1', value: 'ap-east-1' },
          { text: 'Asia Pacific (Mumbai) - ap-south-1', value: 'ap-south-1' },
          { text: 'Asia Pacific (Osaka) - ap-northeast-3', value: 'ap-northeast-3' },
          { text: 'Asia Pacific (Seoul) - ap-northeast-2', value: 'ap-northeast-2' },
          { text: 'Asia Pacific (Singapore) - ap-southeast-1', value: 'ap-southeast-1' },
          { text: 'Asia Pacific (Sydney) - ap-southeast-2', value: 'ap-southeast-2' },
          { text: 'Asia Pacific (Tokyo) - ap-northeast-1', value: 'ap-northeast-1' },
          { text: 'Canada (Central) - ca-central-1', value: 'ca-central-1' },
          { text: 'EU (Frankfurt) - eu-central-1', value: 'eu-central-1' },
          { text: 'EU (Ireland) - eu-west-1', value: 'eu-west-1' },
          { text: 'EU (London) - eu-west-2', value: 'eu-west-2' },
          { text: 'EU (Milan) - eu-south-1', value: 'eu-south-1' },
          { text: 'EU (Paris) - eu-west-3', value: 'eu-west-3' },
          { text: 'EU (Stockholm) - eu-north-1', value: 'eu-north-1' },
          { text: 'Middle East (Bahrain) - me-south-1', value: 'me-south-1' },
          { text: 'South America (São Paulo) - sa-east-1', value: 'sa-east-1' },
        ],
        help: 'Select AWS Region for Lambda',
        section: `${this.isLegacyPlan() ? 'Credentials' : 'Advanced'}`,
        //helpUrl: '#',
        //source: () => {},
      },
      role: {
        type: 'div',
        html: '<div></div>',
        label: 'Assigned Role',
        section: `${this.isLegacyPlan() ? 'Credentials' : 'Advanced'}`,
      },
    };

    const dataEntries = ['code_imports', 'code_body', 'use_own_keys'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item]?.value;
    }

    this.properties.defaultInputs = [];
    this.properties.defaultOutputs = ['Output'];
    if (this.properties.outputs.length == 0) this.properties.outputs = ['Output', '_error'];

    this.drawSettings.displayName = 'NodeJS';

    const templateIcon = this.properties.template?.templateInfo?.icon || '';
    const templateIconColor = this.properties.template?.templateInfo?.color || '#000000';
    const svgIcon = templateIcon && templateIcon.startsWith('<svg');
    this.drawSettings.iconCSSClass = templateIcon
      ? `tpl-fa-icon ${templateIcon}`
      : `svg-icon ${this.constructor.name}`;
    this.drawSettings.color = templateIcon ? templateIconColor : '#00BCD4';
    if (svgIcon) this.drawSettings.iconCSSClass = templateIcon;
    this.data.use_own_keys = !this.doHideAWSKeys(this.data);
    this.drawSettings.componentDescription = 'Execute code in a NodeJS environment';
    this.drawSettings.shortDescription = 'Execute code in a NodeJS environment';
    this._ready = true;
  }
  protected async run() {
    this.addEventListener('endpointAdded', this.updateCodeVars.bind(this));
    this.addEventListener('endpointRemoved', this.updateCodeVars.bind(this));
    this.addEventListener('endpointChanged', this.updateCodeVars.bind(this));

    this.addEventListener('settingsOpened', async (sidebar, component) => {
      if (component !== this) return;
      const code_imports = sidebar.querySelector('#code_imports');
      if (code_imports) {
        code_imports.classList.add('hidden');
        const imports_editor = code_imports._editor;
        if (imports_editor) {
          imports_editor.session.setOption('useWorker', false);
          imports_editor.clearSelection();
        }
      }

      const code_body = sidebar.querySelector('#code_body');
      if (code_body) {
        code_body.classList.add('hidden');
        const body_editor = code_body._editor;

        if (body_editor) {
          body_editor.clearSelection();
        }
      }

      const role = document.querySelector('[data-field-name="role"]');
      if (role) role.classList.add('hidden');
      this.setFunctionLabelStyling();
      this.setCodeBodyTitle([]);

      this.toggleAWSKeys(this.isLegacyPlan() ? false : this.doHideAWSKeys(this.data));
    });
  }

  private doHideAWSKeys(data) {
    if (data?.use_own_keys) {
      return false;
    }
    if (!this.isLegacyPlan() && !data?.use_own_keys) {
      return true;
    }
    // for legacy users, we need to show the AWS keys if they have them
    if (data?.accessKeyId && data?.secretAccessKey && data?.region) {
      return false;
    }
    return true;
  }

  private setFunctionLabelStyling() {
    const functionLabelElement = document.querySelector('[data-field-name="function_label"]');
    if (functionLabelElement) {
      functionLabelElement.setAttribute(
        'style',
        'margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; padding-right: 0 !important;',
      );
    }
    const functionLabelElementEnd = document.querySelector(
      '[data-field-name="function_label_end"]',
    );
    if (functionLabelElementEnd) {
      functionLabelElementEnd.setAttribute(
        'style',
        'margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; padding-right: 0 !important;',
      );
    }
  }
  private useOwnKeysChangeHandler(e) {
    const form = e.target.closest('form');
    if (!form) return;
    const accessKeyId = form.querySelector('[data-field-name="accessKeyId"]');
    const secretAccessKey = form.querySelector('[data-field-name="secretAccessKey"]');
    const region = form.querySelector('[data-field-name="region"]');
    if (!accessKeyId || !secretAccessKey || !region) return;

    if (e.target.checked) {
      this.toggleAWSKeys(false);
    } else {
      this.toggleAWSKeys(true);
    }
  }

  protected async updateRole() {
    const lambdaFunctionData = await this.fetchDeploymentStatus();
    if (lambdaFunctionData?.data) {
      const role = lambdaFunctionData.data.role;
      const roleName = role.split('/').pop();
      const roleUrl = `https://${this.data.region}.console.aws.amazon.com/iam/home?region=${this.data.region}#/roles/details/${roleName}?section=permissions`;
      const roleLink = `
        <a style="text-decoration: underline" href="${roleUrl}" target="_blank">Manage AWS Role</a>`;
      const roleContainer = document.querySelector('#role');
      if ((roleContainer && this.data.use_own_keys) || this.isLegacyPlan()) {
        roleContainer.innerHTML = roleLink;
        const roleField = document.querySelector('[data-field-name="role"]');
        roleField.classList.remove('hidden');
      }
    }
  }

  private async toggleAWSKeys(hide: boolean) {
    const accessKeyId = document.querySelector('[data-field-name="accessKeyId"]');
    const secretAccessKey = document.querySelector('[data-field-name="secretAccessKey"]');
    const region = document.querySelector('[data-field-name="region"]');
    const role = document.querySelector('[data-field-name="role"]');
    const hintSelect = document.querySelector('[data-field-name="hintSelect"]');
    if (!accessKeyId || !secretAccessKey || !region) return;
    if (hide) {
      accessKeyId.classList.add('hidden');
      secretAccessKey.classList.add('hidden');
      region.classList.add('hidden');
      role.classList.add('hidden');
      hintSelect.classList.add('hidden');
    } else {
      accessKeyId.classList.remove('hidden');
      secretAccessKey.classList.remove('hidden');
      region.classList.remove('hidden');
      hintSelect.classList.remove('hidden');
      await this.updateRole();
    }
  }

  protected validateServerlessCode(input: string) {
    const lines = input.split('\n');
    return lines.every((line) => line.trim() === '' || !importRegex.test(line));
  }

  protected async fetchDeploymentStatus() {
    const response = await fetch('/api/page/builder/serverless-code/get-deployment-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: this.workspace.agent.id,
        componentId: Component.curComponentSettings.uid,
        awsConfigs: {
          accessKeyId: this.data.accessKeyId,
          secretAccessKey: this.data.secretAccessKey,
          region: this.data.region,
        },
      }),
    });
    return response.json();
  }

  protected setCodeBodyTitle(endpointInputs: string[]) {
    // want to change code body title based on inputs
    const sidebar = this.getSettingsSidebar();
    if (sidebar) {
      const inputs =
        endpointInputs && endpointInputs.length ? endpointInputs : this.properties.inputs;

      const functionLabelText = document.querySelector('#function-label-text');
      if (functionLabelText) {
        functionLabelText.textContent = `async main(${inputs.join(', ')}) {`;
      }
    }
  }

  async updateCodeVars() {
    const inputs = [...this.domElement.querySelectorAll('.input-container .input-endpoint')].map(
      (e) => e.getAttribute('smt-name'),
    );
    this.setCodeBodyTitle(inputs);
  }

  public exportTemplate() {
    // if (this.properties.template) {
    //     return this.properties.template;
    // }
    let data = JSON.parse(JSON.stringify(this.data));
    const settings = {};
    data.code_body = data.code_body || '';
    data.code_body = this.parseTemplateString(data.code_body, settings);

    const inputs = this.properties.inputProps;
    const outputs = this.properties.outputProps;

    const template = {
      name: this.title,
      componentName: this.constructor.name,
      description: this.description,
      settings,
      data,
      inputs,
      outputs,
    };

    return template;
  }
  isLegacyPlan() {
    return this.workspace.teamData.isLegacyPlan;
  }
}
