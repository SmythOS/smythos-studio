import { delay } from '../utils/general.utils';
import { Component } from './Component.class';

// @ts-ignore
export class DataSourceIndexer extends Component {
  private namespaces: { value: string; text: string; __legacy_id: string }[] = [];

  protected async prepare(): Promise<any> {
    this.updateSettings().then(() => {
      // if the current value does not match anything
      const isUnableToMatchNsRecord =
        this.data['namespace'] &&
        !this.namespaces.find((ns) => ns.value === this.data['namespace']);
      if (isUnableToMatchNsRecord) {
        // try two cases, case where teamid is stripped, and case of original id
        const nsWithTeamId = `${window.workspace.teamData.id}_${this.data['namespace']}`;
        const ns = this.data['namespace'];
        const matching = this.namespaces.find(
          (_nsRec) => _nsRec.__legacy_id === ns || _nsRec.__legacy_id === nsWithTeamId,
        );
        if (matching) {
          this.data['namespace'] = matching.value;
        } else {
          console.log('WE are not able to map the old name');
        }
      }
    });

    return new Promise((resolve) => resolve(true));
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
    this.settings.namespace.options = this.namespaces;
    if (this.settingsOpen) this.refreshSettingsSidebar();
  }

  protected async init() {
    this.settings = {
      namespace: {
        type: 'select',
        label: 'data space',
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
        attributes: {
          'data-template-vars': 'true',
        },
      },

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
          `Missing Data Space<br /><a href="/data" target="_blank" style="color:#33b;text-decoration:underline">Create one</a> then configure it for this component`,
          'alert',
        );
      }
    }
  }
}
