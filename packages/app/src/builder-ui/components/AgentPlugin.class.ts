import { Component } from './Component.class';

import { lsCache } from '../../shared/Cache.class';
import { AGENT_VERSIONS_CACHE_KEY } from '../../shared/constants/general';
import { LLMFormController } from '../helpers/LLMFormController.helper';
import { createBadge } from '../ui/badges';
import { IconArrowRight, IconConfigure } from '../ui/icons';
import {
  handleElementClick,
  refreshLLMModels,
  saveApiKey,
  setLogoForDynamicComp,
  setupSidebarTooltips,
} from '../utils';
import { delay } from '../utils/general.utils';

type Option = {
  value: string;
  text: string;
};

const DEFAULT_VERSION = 'same-as-parent';

export class AgentPlugin extends Component {
  private id: string;
  private name: string;
  private desc: string;
  private descForModel: string;
  private logoUrl: string;
  private versions: Option[];
  private modelOptions: string[];
  private defaultModel: string;

  protected async prepare() {
    /* We retrieve data from the sender component because the this.data isn't available when redraw is called. */
    this.id = this.data?.id || this.properties.sender?.getAttribute('smt-id') || '';
    this.name =
      this.data?.name || this.properties.sender?.querySelector('.name')?.textContent || '';
    this.desc = this.data?.desc || this.properties.sender?.getAttribute('smt-desc') || '';
    this.descForModel =
      this.data?.descForModel || this.properties.sender?.getAttribute('smt-desc-for-model') || '';
    this.logoUrl = this.data?.logoUrl || this.properties.sender?.querySelector('img')?.src || '';

    // get versions from cache if available
    // * disabled for now
    /* const existingVersions = lsCache.get(AGENT_VERSIONS_CACHE_KEY)?.[this.id] || [];

        const options = existingVersions.map((version) => {
            if (version === 'prod-latest') {
                return { value: version, text: 'Prod Latest' };
            }

            return { value: version, text: `Prod v${version}` };
        }); */

    const hardcodedOptions = [
      { value: 'same-as-parent', text: 'Same as Parent' },
      { value: 'dev-latest', text: 'Dev' },
      { value: 'prod-latest', text: 'Prod Latest' },
    ];

    this.versions = hardcodedOptions; // [...hardcodedOptions, ...options];

    // load versions from server and update
    // this.updateVersions(); // * disabled for now

    // prepare models
    const modelOptions = LLMFormController.prepareModelSelectOptionsByFeatures(['tools']);

    this.defaultModel = LLMFormController.getDefaultModel(modelOptions);

    const model = this.data?.model || this.data?.openAiModel || this.defaultModel;

    //prevent losing the previously set model
    if (model && ![...modelOptions.map((item) => item?.value || item)].includes(model)) {
      let badge = createBadge('Removed', 'text-smyth-red-500 border-smyth-red-500');

      // add alias badge for gpt-4-0613 as it's removed
      if (model === 'gpt-4-0613') {
        badge += createBadge('alias of gpt-4', 'text-gray-500 border-gray-500');
      }

      modelOptions.push({
        text: model + '&nbsp;&nbsp', // Add non-breaking space entities to create visual spacing between model name and badge
        value: model,
        badge,
      });
    }

    //remove undefined models
    this.modelOptions = modelOptions.filter((e) => e);

    return true;
  }

  protected async init() {
    this.settings = {
      model: {
        type: 'select',
        label: 'Model',
        options: this.modelOptions,
        value: this.defaultModel,
        dropdownHeight: 350, // In pixels

        //#region // ! DEPRECATED, will be removed in the future
        // loading: true,
        // actions: [
        //   {
        //     label: 'Custom Model',
        //     icon: 'fa-regular fa-plus',
        //     id: 'customModelAddButton',
        //     classes: 'custom_model_add_btn',
        //     shouldDisplay: async () => {
        //       try {
        //         const shouldDisplay = await customModelHelper.shouldDisplayAddButton();

        //         return shouldDisplay;
        //       } finally {
        //         // * This is a quick solution to show the spinner using the 'loading' attribute and remove it here after checking if the button should be displayed or not
        //         const modelElm = document.getElementById('model');
        //         const formGroupElm = modelElm?.closest('.form-group');
        //         const spinnerElm = formGroupElm?.querySelector('.field-spinner');
        //         spinnerElm?.remove();
        //       }
        //     },
        //     afterCreation: () => {
        //       const model = document.getElementById('model');
        //       const modelWrapperElm = model?.closest('.select.smt-input-select');
        //       const dropdownIconElm = modelWrapperElm?.querySelector(
        //         '.dropdown-toggle',
        //       ) as HTMLElement;

        //       if (dropdownIconElm) {
        //         dropdownIconElm.style.right = '115px';
        //       }
        //     },
        //     events: {
        //       click: (event) => customModelHelper.addButtonClickHandler(this, event),
        //     },
        //   },
        // ],
        //#endregion

        actions: [
          {
            label: 'Configure more models',
            icons: {
              left: {
                svg: IconConfigure,
                classes: 'mr-2',
              },
              right: {
                svg: IconArrowRight,
                classes: 'absolute right-4',
              },
            },
            position: 'after-dropdown',
            id: 'configureMoreModelsBtn',
            classes: 'custom_model_add_btn',
            events: {
              click: () => {
                window.open('/vault', '_blank');
              },
            },
          },
        ],
      },
      version: { type: 'select', label: 'Version', options: this.versions, value: DEFAULT_VERSION },
      descForModel: {
        type: 'textarea',
        label: 'Description for Model',
        value: this.descForModel,
        attributes: { 'data-template-vars': 'true' }, // Note: for Agent Plugin we will need to check if we should allow the default input `Prompt` as template variable
      },
      agentId: {
        type: 'hidden',
        value: this.id,
      },
    };

    let dataEntries = ['model', 'version', 'descForModel', 'agentId'];

    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.drawSettings.addOutputButton = '+ out';
    this.drawSettings.addInputButton = '+ in';

    this.properties.defaultInputs = ['Prompt'];
    this.properties.defaultOutputs = ['Response'];

    this.drawSettings.displayName = this.name || this.constructor.name;
    this.drawSettings.shortDescription = this.desc || '';
    this.drawSettings.iconCSSClass = '';

    this._ready = true;
  }

  protected async run(): Promise<any> {
    this.addEventListener('settingsOpened', this.handleSettingsOpened.bind(this));

    // here this.properties.data is stable than this.data
    const logoUrl = this.properties.data?.logoUrl;

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, logoUrl);
  }

  private async handleSettingsOpened(sidebar, component) {
    if (component !== this) return;
    await delay(200);
    await setupSidebarTooltips(sidebar, this);

    const modelElm = sidebar.querySelector('#model');
    // customModelHelper.actionsHandler(this, modelElm); // ! DEPRECATED
  }

  /*
    * We currently have methods like handleElementClick(), saveApiKey(), and refreshLLMModels() to manage locked models.
    TODO [Forhad]: However, it's unclear which methods to copy when implementing this functionality here. We need to find a better way to organize and manage these methods for clarity and efficiency.
  */

  private async handleElementClick(event) {
    await handleElementClick(event, this);
  }

  private async saveApiKey(serviceKey, serviceLabel, formData) {
    return await saveApiKey(
      serviceKey,
      serviceLabel,
      formData,
      this.workspace,
      this.refreshLLMModels.bind(this),
    );
  }

  private async refreshLLMModels() {
    await refreshLLMModels(
      this.workspace,
      this.prepare.bind(this),
      this.init.bind(this),
      this.refreshSettingsSidebar.bind(this),
    );
  }

  public redraw(triggerSettings = true): HTMLDivElement {
    const div = super.redraw(triggerSettings);

    const internalNameDiv = div.querySelector('.internal-name');
    internalNameDiv.innerHTML = `<span class="internal-name-prefix agentplugin">Sub-agent </span>${this.drawSettings.displayName}`;

    //const logoUrl = this.properties.sender?.querySelector('img')?.src || '';
    this.domElement.querySelector('.title-bar img')?.remove();

    this.data = {
      ...this.data,
      id: this.id,
      name: this.name,
      desc: this.desc,
      descForModel: this.descForModel,
      logoUrl: this.logoUrl,
    };

    // ? we can move this function to init() method when we have this.domElement available there
    setLogoForDynamicComp.call(this, this.logoUrl);

    return div;
  }

  private async updateVersions() {
    // fetch versions from the server and update
    const fetchSubAgent = fetch(`/api/page/builder/ai-agent/${this.id}/deployments`);
    const fetchParentAgent = fetch(
      `/api/page/builder/ai-agent/${this.workspace.agent.id}/deployments`,
    );

    const [agentResult, parentAgentResult] = await Promise.all([fetchSubAgent, fetchParentAgent]);

    const subAgent = await agentResult.json();
    const parentAgent = await parentAgentResult.json();

    let hasSubAgentDeployment = subAgent.deployments.length > 0;
    const hasParentAgentDeployment = parentAgent.deployments.length > 0;

    let versions = subAgent.deployments.map((deployment) => deployment.version);
    let options = [];

    if (versions?.length) {
      versions = ['prod-latest', ...versions];
      lsCache.set(AGENT_VERSIONS_CACHE_KEY, { [this.id]: versions });

      options = versions.map((version) => {
        if (version === 'prod-latest') {
          return { value: version, text: 'Prod Latest' };
        }

        return { value: version, text: `Prod v${version}` };
      });
    }

    options.unshift({ value: 'dev-latest', text: 'Dev' });

    if (!(hasParentAgentDeployment && !hasSubAgentDeployment)) {
      options.unshift({ value: 'same-as-parent', text: 'Same as Parent' });
    }

    this.settings.version.options = options;
    this.settings.version.loading = false;
    if (this.settingsOpen) this.refreshSettingsSidebar();
  }
}
