import { builderStore } from '@src/shared/state_stores/builder/store';
import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// @ts-ignore
export class DataSourceCleaner extends Component {
  private namespaces: string[] = [];
  private isNewComponent: boolean = false;

  protected async prepare(): Promise<any> {
    this.isNewComponent = Object.keys(this.data).length === 0;
    const eligibleForV2 =
      builderStore.getState().serverStatus.edition === 'enterprise' &&
      !window.location.hostname.includes('smythos.com');

    const componentVersion =
      this.data.version ?? (this.isNewComponent && eligibleForV2 ? 'v2' : 'v1');

    if (this.isNewComponent && eligibleForV2) {
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
      this.settings.namespaceId.options = this.namespaces;
      if (this.settingsOpen) this.refreshSettingsSidebar();
    } else if (this.data.version === 'v2') {
      const result = await fetch(
        `${this.workspace.server}/api/component/DataSourceIndexer/v2/namespaces`,
      );
      const namespaces = await result.json();
      this.namespaces = namespaces.map((item) => ({ value: item.label, text: item.label }));
      this.settings.namespaceId.options = this.namespaces;
      if (this.settingsOpen) this.refreshSettingsSidebar();
    }
  }

  protected async init() {
    this.settings = {
      namespaceId: {
        type: 'select',
        label: 'namespace',
        help: 'Select the namespace that contains the source to remove.',
        value: '',
        options: this.namespaces,
      },

      id: {
        type: 'input',
        label: `source identifier`,
        help: 'Enter the exact ID used during indexing (a–z, A–Z, 0–9, -, _, .). <a href="https://smythos.com/docs/agent-studio/components/rag-data/rag-forget/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier#step-1-specify-the-target-data" target="_blank" class="text-blue-600 hover:text-blue-800">See how to find the ID</a>',
        value: '',
        validate: `custom=isValidId`,
        validateMessage: `It should contain only 'a-z', 'A-Z', '0-9', '-', '_', '.', `,
        attributes: { 'data-template-vars': 'true' },
      },
    };

    const dataEntries = ['namespaceId', 'id'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultInputs = [];
    this.properties.defaultOutputs = ['Success'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.displayName = 'RAG Forget';
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
