import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// @ts-ignore
export class DataSourceLookup extends Component {
  private namespaces: string[] = [];
  private isNewComponent: boolean = false;
  private componentVersion: string = 'v1';

  protected async prepare(): Promise<any> {
    this.isNewComponent = Object.keys(this.data).length === 0;
    const componentVersion = this.data.version ?? (this.isNewComponent ? 'v2' : 'v1');
    if (this.isNewComponent) {
      this.data.version = componentVersion;
    }
    this.updateSettings();
  }

  protected async updateSettings() {
    if (!this.data.version || this.data.version === 'v1') {
      const result = await fetch(
        `${this.workspace.server}/api/component/DataSourceIndexer/namespaces`,
      );
      const namespaces = await result.json();
      this.namespaces = namespaces.map((item) => ({ value: item.id, text: item.name }));
      this.settings.namespace.options = this.namespaces;
      if (this.settingsOpen) this.refreshSettingsSidebar();
    } else if (this.data.version === 'v2') {
      const result = await fetch(
        `${this.workspace.server}/api/component/DataSourceIndexer/v2/namespaces`,
      );
      const namespaces = await result.json();
      this.namespaces = namespaces.map((item) => ({ value: item.label, text: item.label }));
      this.settings.namespace.options = this.namespaces;
      if (this.settingsOpen) this.refreshSettingsSidebar();
    }
  }

  protected async init() {
    this.settings = {
      namespace: {
        type: 'select',
        label: 'namespace',
        help: 'Select the memory bucket to search, matching the namespace used when indexing. <a href="https://smythos.com/docs/agent-studio/components/rag-data/rag-search/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-search&utm_content=namespace#step-1-define-the-search-scope" target="_blank" class="text-blue-600 hover:text-blue-800">See namespace mapping</a>',
        options: this.namespaces,
      },
      topK: {
        type: 'number',
        label: 'Results count',
        help: 'Choose how many top matches to return; more can raise cost.',
        value: 3,
        validate: `required min=0 custom=isValidInteger`,
        validateMessage: `Please enter a positive number`,
      },
      includeMetadata: {
        type: 'checkbox',
        label: 'Include metadata',
        help: 'Return stored fields like title, URL, tags, and timestamps with each result.',
        value: false,
      },
      scoreThreshold: {
        type: 'range',
        label: 'Score threshold',
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        help: 'Hide items below this 0–1 relevance score; higher keeps only strong matches. <a href="https://smythos.com/docs/agent-studio/components/rag-data/rag-search/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-search&utm_content=score-threshold#step-2-filter-and-format-the-output" target="_blank" class="text-blue-600 hover:text-blue-800">See threshold examples</a>',
      },
      includeScore: {
        type: 'checkbox',
        label: 'Include score',
        help: 'Add the similarity score to each item for sorting and debugging.',
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
    this.drawSettings.displayName = 'RAG Search';
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
