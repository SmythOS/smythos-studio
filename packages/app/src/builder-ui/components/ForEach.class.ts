import { Component } from './Component.class';
declare var Metro;
export class ForEach extends Component {
  protected async init() {
    this.settings = {
      format: {
        type: 'select',
        label: 'Output Format',
        help: 'Choose Full for item plus metadata, Minimal for the last step\'s output only, or Array of Results for a simple list. <a href="https://smythos.com/docs/agent-studio/components/advanced/for-each/?utm_source=studio&utm_medium=tooltip&utm_campaign=for-each&utm_content=output-format#step-3-select-an-output-format" target="_blank" class="text-blue-600 hover:text-blue-800">See format examples</a>',
        value: 'full',
        options: [
          { text: 'Full', value: 'full' },
          { text: 'Minimal', value: 'minimal' },
          { text: 'Array Of Results', value: 'results-array' },
        ],
      },
    };

    const dataEntries = ['format'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    // #region [ Output config ] ==================
    this.outputSettings = {
      ...this.outputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };
    // #endregion

    this.properties.defaultInputs = ['Input'];
    this.properties.defaultOutputs = ['Loop', 'Result'];

    this.drawSettings.displayName = 'For Each';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Performs a for each loop on an array';
    this.drawSettings.shortDescription = 'Performs a for each loop on an array';
    this.drawSettings.color = '#4f81d5';
    this.drawSettings.addInputButton = null;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.addInputButtonLabel = ' ';
    this.drawSettings.addOutputButtonLabel = ' ';

    this.drawSettings.showSettings = true;
    this._ready = true;
  }
}
