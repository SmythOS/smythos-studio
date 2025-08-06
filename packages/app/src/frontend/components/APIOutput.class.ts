import { Component } from './Component.class';
declare var Metro;
export class APIOutput extends Component {
  protected async init() {
    // #region [ Settings config ] ==================
    this.settings = {
      format: {
        type: 'select',
        label: 'Output Format',
        value: 'full',
        options: ['full', 'minimal', 'raw'],
        help: 'API Output component refines and standardizes output data, ensuring relevance and clarity for user requirements.',
        tooltipClasses: 'w-64',
        arrowClasses: '-ml-11',
        hintPosition: 'bottom',
        events: {
          // change: (event) => {
          //   const format = (event.target as HTMLSelectElement).value;
          //   console.log('Format selected', format);
          //   if (format === 'raw') {
          //     console.log('RAW Format selected');
          //   }
          // },
        },
      },
      // contentType: {
      //   type: 'select',
      //   class: 'hidden',
      //   label: 'Content Type',
      //   value: 'json',
      //   options: [
      //     {
      //       text: 'JSON',
      //       value: 'application/json',
      //     },
      //     {
      //       text: 'Text',
      //       value: 'text/plain',
      //     },
      //     {
      //       text: 'HTML',
      //       value: 'text/html',
      //     },
      //     {
      //       text: 'XML',
      //       value: 'application/xml',
      //     },
      //   ],
      // },
    };

    const dataEntries = ['format'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }
    // #endregion

    // #region [ I/O config ] ==================
    this.properties.defaultOutputs = ['Output'];
    this.properties.defaultInputs = [];
    // #endregion

    // #region [ Draw config ] ==================
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.outputMaxConnections = 0;
    this.drawSettings.addOutputButtonLabel = ' ';
    this.drawSettings.color = '#8600f1';
    // #endregion
  }
}
