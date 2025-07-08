import { delay } from '../utils';
import { Component } from './Component.class';
declare var Metro;

// @ts-ignore
export class DataSourceCleaner extends Component {
  private namespaces: string[] = [];

  protected async prepare(): Promise<any> {
    this.updateSettings();
  }

  protected async updateSettings() {
    const result = await fetch(
      `${this.workspace.server}/api/component/DataSourceCleaner/namespaces`,
    );
    const namespaces = await result.json();
    this.namespaces = namespaces.map((item) => ({ value: item.id, text: item.name }));
    this.settings.namespaceId.options = this.namespaces;
    if (this.settingsOpen) this.refreshSettingsSidebar();
  }

  protected async init() {
    this.settings = {
      namespaceId: {
        type: 'select',
        label: 'namespace',
        hint: 'Select namespace',
        options: this.namespaces,
      },

      id: {
        type: 'input',
        label: `source identifier`,
        hint: `Accepted characters: 'a-z', 'A-Z', '0-9', '-', '_', '.'`,
        validate: `custom=isValidId`,
        validateMessage: `It should contain only 'a-z', 'A-Z', '0-9', '-', '_', '.', `,
        attributes: { 'data-template-vars': 'true' },
      },
    };

    const dataEntries = [];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultInputs = [];
    this.properties.defaultOutputs = ['Success'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.displayName = 'Source Cleaner';
    this.drawSettings.shortDescription = 'Delete data sources from data pool';
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
