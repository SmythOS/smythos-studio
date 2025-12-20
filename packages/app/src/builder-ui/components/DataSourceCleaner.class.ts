import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// @ts-ignore
export class DataSourceCleaner extends Component {
  private namespaces: string[] = [];

  protected async prepare(): Promise<any> {
    this.updateSettings();
  }

  protected async updateSettings() {
    const result = await fetch(
      `${this.workspace.server}/api/component/DataSourceIndexer/v2/namespaces`,
    );
    const namespaces = await result.json();
    this.namespaces = namespaces.map((item) => ({ value: item.label, text: item.label }));
    this.settings.namespaceId.options = this.namespaces;
    if (this.settingsOpen) this.refreshSettingsSidebar();
  }

  protected async init() {
    this.settings = {
      namespaceId: {
        type: 'select',
        label: 'data space',
        help: 'Select the data space that contains the source to remove.',
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

    // if the namespace value is using the old legacy format {{teamId}}_{{namespace}}, we need to convert it to the new format {{namespace}}
    if (this.data['namespaceId'] && /^c[a-z0-9]{24}.+$/.test(this.data['namespaceId'])) {
      this.data['namespaceId'] = this.data['namespaceId'].split('_').slice(1).join('_');
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
    if (this.data['namespaceId']) {
      const nsId = this.data['namespaceId'];
      if (!namespaces[nsId]) {
        console.log('Namespace Missing', nsId);
        this.addComponentMessage(
          `Missing Data Space<br /><a href="/data" target="_blank" style="color:#33b;text-decoration:underline">Create one</a> then configure it for this component`,
          'alert',
        );
      }
    }
  }
}
