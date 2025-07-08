import { Component } from './Component.class';
declare var Metro;

export class Code extends Component {
  public templateSupport = true;
  protected async init() {
    const codeSample = `
//This is a simple example of how to use the code component.
let result = _A + _B;
let message = \`The sum of \${_A} and \${_B} is \${result}\`;
_output = {result, message};

//_output variable is bound to component Output endpoint
//  _output can be a json object or a primitive value
 

`;
    this.settings = {
      code_vars: {
        type: 'textarea',
        code: { mode: 'javascript', theme: 'chrome' },
        label: 'Variables',
        value: '',
        validate: ``,
        validateMessage: ``,
        help: 'A variable stores data that can be used and modified in your code, such as numbers, text, or objects.',
        tooltipClasses: 'w-56',
        arrowClasses: '-ml-11',
        attributes: { readonly: 'readonly' },
      },
      code_body: {
        type: 'textarea',
        code: { mode: 'javascript', theme: 'chrome' },
        label: `Code`,
        help: 'Code to process inputs.',
        value: codeSample,
        validate: `maxlength=500000`,
        validateMessage: `The code length is limitted to 500,000 characters`,
        attributes: {},
      },
    };

    const dataEntries = ['code_vars', 'code_body'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    if (this.properties.template && !this.data._templateVars) {
      this.data._templateVars = {};
    }

    // #region [ Output config ] ==================
    //this.outputSettings = { ...this.outputSettings, description: { type: 'string', default: '', editConfig: { type: 'textarea' } } };
    // #endregion

    this.properties.defaultInputs = [];
    if (this.properties.inputs.length == 0) this.properties.inputs = ['A', 'B'];
    this.properties.defaultOutputs = ['Output'];
    if (this.properties.outputs.length == 0) this.properties.outputs = ['Output', '_error'];

    this.data.code_vars = this.generateCodeVars(JSON.parse(JSON.stringify(this.properties.inputs)));

    this.drawSettings.displayName = 'Code';

    const templateIcon = this.properties.template?.templateInfo?.icon || '';
    const templateIconColor = this.properties.template?.templateInfo?.color || '#000000';
    const svgIcon = templateIcon && templateIcon.startsWith('<svg');
    this.drawSettings.iconCSSClass = templateIcon
      ? `tpl-fa-icon ${templateIcon}`
      : `svg-icon ${this.constructor.name}`;
    this.drawSettings.color = templateIcon ? templateIconColor : '#00BCD4';
    if (svgIcon) this.drawSettings.iconCSSClass = templateIcon;

    this.drawSettings.componentDescription = 'Process inputs with code';
    this.drawSettings.shortDescription = 'Process inputs with code';
    //this.drawSettings.showSettings = false;

    this._ready = true;
  }
  protected async run() {
    this.addEventListener('endpointAdded', this.updateCodeVars.bind(this));
    this.addEventListener('endpointRemoved', this.updateCodeVars.bind(this));
    this.addEventListener('endpointChanged', this.updateCodeVars.bind(this));

    this.addEventListener('settingsOpened', async (sidebar, component) => {
      if (component !== this) return;
      console.log('settingsOpened');

      const code_vars = sidebar.querySelector('#code_vars');
      if (code_vars) {
        code_vars.classList.add('hidden');
        const vars_editor = code_vars._editor;
        if (vars_editor) {
          vars_editor.session.setOption('useWorker', false);
          vars_editor.clearSelection();
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
    });

    //await delay(500);
    //this.updateCodeVars();
  }

  updateCodeVars() {
    const inputs = [...this.domElement.querySelectorAll('.input-container .input-endpoint')].map(
      (e) => e.getAttribute('smt-name'),
    );
    this.data.code_vars = this.generateCodeVars(inputs);

    const sidebar = this.getSettingsSidebar();
    if (sidebar) {
      const codeVars: any = sidebar.querySelector('#code_vars');
      if (codeVars) codeVars.value = this.data.code_vars;
      if (codeVars && codeVars._editor) codeVars._editor.setValue(this.data.code_vars); //ACE editor
    }
  }
  generateCodeVars(inputs: string[]) {
    let codeVars = ``;
    if (inputs.length >= 1) {
      codeVars = `//Use these variables to access your input values.\n`;
      inputs.push(''); //add empty string to process the case of single input;
      codeVars += inputs.reduce((acc, val) => {
        if (!val && !acc.startsWith('const ')) return `const _${acc}={{${acc}}};`;

        if (!val) return acc;

        return acc.startsWith('const ')
          ? `${acc}\nconst _${val}={{${val}}};`
          : `const _${acc}={{${acc}}};\nconst _${val}={{${val}}};`;
      });
    }
    codeVars += `\n\n//This variable determines the output of your component.\nlet _output=undefined;`;
    codeVars += '\n';
    return codeVars;
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
}
