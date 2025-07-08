import { delay } from '../utils';
import { Component } from './Component.class';
declare var Metro;

// @ts-ignore
export class DataSourceIndexer extends Component {
  private namespaces: string[] = [];

  protected async prepare(): Promise<any> {
    this.updateSettings();
  }

  protected async updateSettings() {
    const result = await fetch(
      `${this.workspace.server}/api/component/DataSourceIndexer/namespaces`,
    );
    const namespaces = await result.json();
    this.namespaces = namespaces.map((item) => ({ value: item.id, text: item.name }));
    this.settings.namespace.options = this.namespaces;
    if (this.settingsOpen) this.refreshSettingsSidebar();
  }

  protected async init() {
    this.settings = {
      namespace: {
        type: 'select',
        label: 'namespace',
        hint: 'Select namespace',
        options: this.namespaces,
      },

      id: {
        type: 'input',
        label: `source identifier`,
        hint: `Accepted characters: 'a-z', 'A-Z', '0-9', '-', '_', '.'`,
        attributes: { 'data-template-vars': 'true' },
        validate: `custom=isValidId`,
        validateMessage: `It should contain only 'a-z', 'A-Z', '0-9', '-', '_', '.' `,
      },
      name: {
        type: 'input',
        label: 'label',
        hint: 'a human readable label for the data source',
        attributes: { 'data-template-vars': 'true' },
        validate: `maxlength=50`,
        validateMessage: 'Enter a non-empty label, not more than 50 characters.',
      },

      metadata: {
        type: 'textarea',
        label: 'Metadata',
        value: '',
        validate: `maxlength=10000`,
        hint: 'Enter the source metadata, not more than 10000 characters.',
        attributes: { 'data-template-vars': 'true' },
      },

      // isAutoId: {
      //     type: 'checkbox',
      //     label: 'Auto generate Id',
      //     value: false,
      // },
    };

    const dataEntries = ['namespace'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultInputs = ['Source'];
    this.properties.defaultOutputs = ['Success'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.displayName = 'Source Indexer';
    this.drawSettings.shortDescription = 'Index data sources to data pool';
    this.drawSettings.color = '#fb3464';

    this.drawSettings.showSettings = true;
  }

  protected async checkSettings() {
    super.checkSettings();

    if (!this.namespaces || this.namespaces.length == 0) await delay(3000);

    const namespaces = {};
    this.namespaces.forEach((ns: any) => {
      namespaces[ns.value] = ns.text;
    });
    if (this.data['namespace']) {
      const nsId = this.data['namespace'];
      if (!namespaces[nsId]) {
        console.log('Namespace Missing', nsId);
        this.addComponentMessage(
          `Missing Namespace<br /><a href="/data" target="_blank" style="color:#33b;text-decoration:underline">Create one</a> then configure it for this component`,
          'alert',
        );
      }
    }
  }
}
