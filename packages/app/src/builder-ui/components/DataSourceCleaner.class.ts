import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// @ts-ignore
export class DataSourceCleaner extends Component {
  private namespaces: { value: string; text: string; __legacy_id: string }[] = [];

  protected async prepare(): Promise<any> {
    this.updateSettings().then(() => {
      // if the current value does not match anything
      const isUnableToMatchNsRecord =
        this.data['namespaceId'] &&
        !this.namespaces.find((ns) => ns.value === this.data['namespaceId']);
      if (isUnableToMatchNsRecord) {
        // try two cases, case where teamid is stripped, and case of original id
        const nsWithTeamId = `${window.workspace.teamData.id}_${this.data['namespaceId']}`;
        const ns = this.data['namespaceId'];
        const matching = this.namespaces.find(
          (_nsRec) => _nsRec.__legacy_id === ns || _nsRec.__legacy_id === nsWithTeamId,
        );
        if (matching) {
          this.data['namespaceId'] = matching.value;
        } else {
          console.log('WE are not able to map the old name');
        }
      }
    });
  }

  protected async updateSettings() {
    const result = await fetch(
      `${this.workspace.server}/api/component/DataSourceIndexer/v2/namespaces`,
    );
    const namespaces = await result.json();
    this.namespaces = namespaces.map((item) => ({
      value: item.label,
      text: item.label,
      __legacy_id: item.__legacy_id,
    }));
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
        tooltipClasses: 'w-56',
      },

      id: {
        type: 'input',
        label: `source identifier`,
        help: 'Enter the exact ID used during indexing (a–z, A–Z, 0–9, -, _, .). <a href="https://smythos.com/docs/agent-studio/components/rag-data/rag-forget/?utm_source=studio&utm_medium=tooltip&utm_campaign=rag-forget&utm_content=source-identifier#step-1-specify-the-target-data" target="_blank" class="text-blue-600 hover:text-blue-800">See how to find the ID</a>',
        value: '',
        validate: `custom=isValidId`,
        validateMessage: `It should contain only 'a-z', 'A-Z', '0-9', '-', '_', '.', `,
        attributes: { 'data-template-vars': 'true' },
        tooltipClasses: 'w-56',
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
