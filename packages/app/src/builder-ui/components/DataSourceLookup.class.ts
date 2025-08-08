import { delay } from '../utils';
import { Component } from './Component.class';
declare var Metro;

// @ts-ignore
export class DataSourceLookup extends Component {
  private namespaces: string[] = [];

  protected async prepare(): Promise<any> {
    this.updateSettings();
  }

  protected async updateSettings() {
    const result = await fetch(
      `${this.workspace.server}/api/component/DataSourceLookup/namespaces`,
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
      topK: {
        type: 'number',
        label: 'Results count',
        hint: 'Number of results to return',
        value: 3,
        validate: `required min=0 custom=isValidInteger`,
        validateMessage: `Please enter a positive number`,
      },
      includeMetadata: {
        type: 'checkbox',
        label: 'Include metadata',
        value: false,
      },
      scoreThreshold: {
        type: 'range',
        label: 'Score threshold',
        hint: 'Score threshold',
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        help: 'Score threshold for filtering results — the higher the threshold, the more restrictive the filtering.',
      },
      includeScore: {
        type: 'checkbox',
        label: 'Include score',
        value: false,
      },
    };

    const dataEntries = ['namespace', 'topK', 'scoreThreshold', 'includeScore'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultInputs = ['Query'];
    this.properties.defaultOutputs = ['Results'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.displayName = 'Data Lookup';
    this.drawSettings.shortDescription = 'Lookup data from data pool';
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
