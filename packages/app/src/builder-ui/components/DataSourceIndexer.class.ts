import { builderStore } from '@src/shared/state_stores/builder/store';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// @ts-ignore
export class DataSourceIndexer extends Component {
  private namespaces: string[] = [];
  private isNewComponent: boolean = false;

  protected async prepare(): Promise<any> {
    this.isNewComponent = Object.keys(this.data).length === 0;
    const eligibleForV2 =
      builderStore.getState().serverStatus.edition === 'enterprise' &&
      !window.location.hostname.includes('smythos.com');

    const componentVersion =
      this.data.version ?? (this.isNewComponent && eligibleForV2 ? 'v2' : 'v1');

    if (this.isNewComponent) {
      this.data.version = componentVersion;
    }

    this.updateSettings();

    return new Promise((resolve) => resolve(true));
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
        help: 'Select the memory bucket where this source is stored; keep staging and production separate.',
        options: this.namespaces,
      },

      id: {
        type: 'input',
        label: `source identifier`,
        help: 'Stable unique ID for this source; allowed: a–z, A–Z, 0–9, -, _, .; reusing updates the existing entry. <a href="https://smythos.com/docs/agent-studio/components/rag-data/rag-remember/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-remember&utm_content=source-identifier#step-1-define-the-namespace-and-source-details" target="_blank" class="text-blue-600 hover:text-blue-800">See ID rules</a>',
        attributes: { 'data-template-vars': 'true' },
        validate: `custom=isValidId`,
        validateMessage: `It should contain only 'a-z', 'A-Z', '0-9', '-', '_', '.' `,
      },
      name: {
        type: 'input',
        label: 'label',
        help: 'Human-readable name shown in dashboards and logs.',
        attributes: { 'data-template-vars': 'true' },
        validate: `maxlength=50`,
        validateMessage: 'Enter a non-empty label, not more than 50 characters.',
      },
      metadata: {
        type: 'textarea',
        expandable: true,
        code: { mode: 'json', theme: 'chrome' },
        label: `Metadata`,
        help: 'Optional JSON or text with author, tags, and timestamps to improve search and filtering.',
        tooltipClasses: 'w-44',
        arrowClasses: '-ml-11',
        value: '',
        validate: `maxlength=500000`,
        validateMessage: `The metadata length is limitted to 500,000 characters`,
        attributes: {},
      },

      ...(this.data.version === 'v2'
        ? {
            chunkSize: {
              type: 'input',
              label: 'chunk size',
              help: 'The size of the chunks to split the data into.',
              value: 1000,
            },
            chunkOverlap: {
              type: 'input',
              label: 'chunk overlap',
              help: 'The overlap of the chunks to split the data into.',
              value: 100,
            },
          }
        : {}),
    };

    const dataEntries = ['namespace'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultInputs = ['Source'];
    this.properties.defaultOutputs = ['Success'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.displayName = 'RAG Remember';
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
