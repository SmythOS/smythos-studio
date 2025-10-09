import { Component } from './Component.class';
declare var Metro;

export class FileStore extends Component {
  protected async init() {
    this.settings = {
      name: {
        type: 'input',
        label: 'File Name',
        validate: `maxlength=50 custom=isValidS3FileName`,
        validateMessage: `Only alphanumeric characters, '-', '_' and '.' are allowed.`,
        value: '',
        attributes: { 'data-template-vars': 'true' },
      },
      ttl: {
        type: 'select',
        label: 'TTL',
        help: 'Time to live',
        value: '86400', // Default to 1 day
        tooltipClasses: 'w-28',
        arrowClasses: '-ml-11',
        options: [
          {
            value: '86400',
            text: '1 day',
          },
          {
            value: '259200',
            text: '3 days',
          },
          {
            value: '604800',
            text: '1 week',
          },
          {
            value: '1209600',
            text: '2 weeks',
          },
          {
            value: '2592000',
            text: '1 month',
          },
        ],
      },
    };

    const dataEntries = ['name', 'ttl'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultOutputs = ['Url'];
    this.properties.defaultInputs = ['Data'];

    this.drawSettings.displayName = 'File Store';
    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;

    this.drawSettings.componentDescription = 'Store a file or data permanently';
    this.drawSettings.shortDescription = 'Store a file or data permanently';
    this.drawSettings.color = '#65a698';

    this._ready = true;
  }
}
