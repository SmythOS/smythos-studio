import { Component } from './Component.class';
declare var Metro;

export class FileStore extends Component {
  // Component description for settings sidebar
  public componentDescription = 'Use Filestore to save binary data and get a public link you can share. Name the file as users will download it, then set how long the link should stay valid. For input rules, file naming, and TTL limits, see Filestore inputs and TTL.';
  public componentDocsLink = 'https://smythos.com/docs/agent-studio/components/base/filestore/?utm_source=studio&utm_medium=tooltip&utm_campaign=filestore&utm_content=component-header';

  protected async init() {
    this.settings = {
      name: {
        type: 'input',
        label: 'File Name',
        help: 'Name the download and include an extension like .json or .png for easy use. <a href="https://smythos.com/docs/agent-studio/components/base/filestore/?utm_source=studio&utm_medium=tooltip&utm_campaign=filestore&utm_content=file-name#step-1-define-inputs" target="_blank" class="text-blue-600 hover:text-blue-800">See naming tips</a>',
        validate: `maxlength=50 custom=isValidS3FileName`,
        validateMessage: `Only alphanumeric characters, '-', '_' and '.' are allowed.`,
        value: '',
        attributes: { 'data-template-vars': 'true' },
      },
      ttl: {
        type: 'select',
        label: 'TTL',
        help: 'Set how long the public link stays valid before it expires. <a href="https://smythos.com/docs/agent-studio/components/base/filestore/?utm_source=studio&utm_medium=tooltip&utm_campaign=filestore&utm_content=ttl#step-1-define-inputs" target="_blank" class="text-blue-600 hover:text-blue-800">See TTL options</a>',
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
