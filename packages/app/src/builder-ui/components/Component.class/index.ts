import interact from 'interactjs';
import EventEmitter from '../../EventEmitter.class';
import { ComponentProperties, DrawSettingsType, Settings } from '../../types/component.types';
import { confirm } from '../../ui/dialogs';
import { makeInlineEditable } from '../../ui/dom';
import { delay, getVaultData, isKeyTemplateVar, uid, updateVaultDataCache } from '../../utils';
import { Workspace, WorkspaceDefaults } from '../../workspace/Workspace.class';

import { readFormValues, syncCompositeValues } from '../../ui/form';

import { ComponentDocLinks } from '@src/builder-ui/enums/doc-links.enum';
import { errorToast, successToast } from '@src/shared/components/toast';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { jsonrepair } from 'jsonrepair';
import { isEqual } from 'lodash-es';
import { TooltipV2 } from '../../../react/shared/components/_legacy/ui/tooltip/tooltipV2';
import config, { COMP_NAMES } from '../../config';
import { BINARY_INPUT_TYPES } from '../../constants';
import { PostHog } from '../../services/posthog';
import { generateTemplateVarBtns } from '../../ui/form/misc';
import { renderComponentInputEditor } from '../../ui/react-injects';
import { closeTwDialog, editValuesDialog, twEditValuesWithCallback } from '../../ui/tw-dialogs';
import { createSpinner, createTypingLoader, focusField } from '../../utils';
import {
  enableAllDebugControls,
  updateDebugControls,
  updateDebugControlsOnSelection,
} from '../../utils/debugger.utils';
import { destroyMenu as destroyCanvasContextMenu } from '../../workspace/CanvasContextMenu';
import {
  addMockDataToggleButton,
  MockDataToggleButtonState,
  saveMockOutputs,
  toggleMockOutputPills,
} from './mock-data-handler';
import { closeSettings, editSettings } from './settings-editor';

declare var Metro;
declare var $, workspace;

export const ComponentList = {};

const triggerFixWithAIBtn = (data) => {
  // Check if weaver sidebar is already open
  const isSidebarOpen = localStorage.getItem('sidebarOpen') === 'true';
  const currentSidebarTab = localStorage.getItem('currentSidebarTab');

  // Set a flag to prevent multiple dispatches
  if (window['_fixWithAIBtnDispatched']) {
    return;
  }
  window['_fixWithAIBtnDispatched'] = true;

  // Create and dispatch the event with more information
  const event = new CustomEvent('fixWithAIBtn', {
    detail: {
      data,
    },
    bubbles: true,
    composed: true,
  });
  window.dispatchEvent(event);

  // Reset the flag after a short delay
  setTimeout(() => {
    window['_fixWithAIBtnDispatched'] = false;
  }, 100);
};

export const COMPONENT_INPUT_EDITOR: { [key: string]: (config: any) => Promise<any> } = {
  VANILLA: editValuesDialog,
  REACT: (config: any) => renderComponentInputEditor({ config: config }),
};

window['__INPUT_TEMPLATE_VARIABLES__'] = {};
window['__FIELD_TEMPLATE_VARIABLES__'] = {};
window['interact'] = interact;

const infoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<path d="M3 12C3 16.9699 7.02908 21 12 21C16.9709 21 21 16.9699 21 12C21 7.02908 16.9709 3 12 3C7.02908 3 3 7.02908 3 12Z" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.0057 15.6932V11.3936M12 8.35426V8.29102" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function parseEndpointJson(str: string): string | Record<string, unknown> | null {
  const isNumber = (str: string): boolean => {
    const numRegex = /^-?\d+(\.\d+)?$/;
    return numRegex.test(str.trim());
  };

  const isValidNumber = (str: string): boolean => {
    const num = parseFloat(str);
    return (
      !isNaN(num) &&
      num <= Number.MAX_SAFE_INTEGER &&
      num >= Number.MIN_SAFE_INTEGER &&
      num.toString() === str.trim()
    );
  };
  if (!str) return null;

  if (
    (isNumber(str) && !isValidNumber(str)) ||
    (!str.trim().startsWith('{') && !str.trim().startsWith('['))
  )
    return str;

  try {
    return JSON.parse(str);
  } catch (e) {
    return JSON.parse(jsonrepair(str));
  }
}

function recursiveTruncateLongJsonValues(jsonValue) {
  if (Array.isArray(jsonValue)) {
    for (let i = 0; i < jsonValue.length; i++) {
      jsonValue[i] = recursiveTruncateLongJsonValues(jsonValue[i]);
    }
    return jsonValue; // Return the modified array
  }
  if (typeof jsonValue === 'object' && jsonValue !== null) {
    for (let key in jsonValue) {
      jsonValue[key] = recursiveTruncateLongJsonValues(jsonValue[key]);
    }
    return jsonValue; // Return the modified object
  }

  const strVal = typeof jsonValue === 'string' ? jsonValue : JSON.stringify(jsonValue);
  if (strVal.length > 100) {
    return strVal.substring(0, 100) + '...(long content truncated)';
  }
  return strVal;
}

export class Component extends EventEmitter {
  protected _uid;
  public settings: Settings = {};
  public inputEditor: (config: any) => Promise<any> = COMPONENT_INPUT_EDITOR.VANILLA;
  public inputSettings: any = {
    //binary: { type: 'string', editConfig: { type: 'checkbox', label:'Binary Data' } },
    defaultVal: {
      type: 'string',
      default: '',
      allowDefaultEdit: true,
      editConfig: {
        type: 'textarea',
        label: 'Default Value',
        fieldCls: 'min-h-[50px] px-3 py-1 resize-y',
        attributes: {
          'data-agent-vars': 'true',
          'data-auto-size': 'false',
          style: 'height: 34px;',
        }, // 'data-auto-size': 'false' to prevent set auto height initially
        section: 'Advanced_Options',
        hint: 'Value assigned if no specific value provided by user.',
        hintPosition: 'after_label',
      },
    },
  };
  public outputSettings: any = {
    //binary: { type: 'string', editConfig: { type: 'checkbox', label:'Binary Data' } },
    expression: {
      type: 'string',
      default: '',
      editConfig: { type: 'input', section: 'Advanced_Options', help: 'JSON path' },
    },
  };

  public data: any = {};
  protected dataFields: any;
  public drawSettings: DrawSettingsType = {
    displayName: this.constructor.name,
    cssClass: '',
    iconCSSClass: 'mif-cog',
    showSettings: true,
    addOutputButton: 'Outputs',
    addInputButton: 'Inputs',
    inputMaxConnections: -1,
    outputMaxConnections: -1,
    firendlyName: this.constructor.name,
    category: 'Base',
    componentDescription: '',
    shortDescription: '',
    color: '#fff',
  };
  private _destroyed = false;

  public domElement: HTMLElement;
  public closeButton;
  public settingsContainer;
  public inputContainer;
  public outputContainer;
  public buttonContainer;
  public overlay;
  public loadingIcon;
  public docUrl = SMYTHOS_DOCS_URL + (ComponentDocLinks[this.constructor.name] || '');
  public settingsEntries = {};
  public title;
  public description;
  public async = false;
  public templateSupport = false;
  public templateEditing = false;
  protected _ready = false;
  public aiTitle;
  public displayName = this.constructor.name;

  get uid() {
    return this._uid;
  }

  get settingsOpen() {
    return Component.curComponentSettings == this;
  }

  get templateSettings() {
    return this.properties?.template?.settings;
  }
  set templateSettings(val) {
    if (this.properties?.template) {
      this.properties.template.settings = val;
    }
  }

  public static curComponentSettings: Component;
  constructor(
    public workspace: Workspace,
    public properties: ComponentProperties = {
      outputs: [],
      inputs: [],
      data: {},
      top: '',
      left: '',
      width: '',
      height: '',
      title: '',
      description: '',
      sender: null,
      uid: null,
      template: null,
      aiTitle: '',
      displayName: '',
    },
    triggerSettings = true,
  ) {
    super();
    this._uid = this.properties.uid || 'C' + uid();
    if (!this.properties) this.properties = { top: '', left: '' };

    this.properties.defaultOutputs = ['Output'];
    this.properties.defaultInputs = [];
    if (!this.properties.outputs) this.properties.outputs = [];
    if (!this.properties.inputs) this.properties.inputs = [];
    if (!this.properties.inputProps) this.properties.inputProps = [];
    if (!this.properties.outputProps) this.properties.outputProps = [];

    this.data = this.properties.data || {};

    if (this.properties.template) {
      const template = this.properties.template;
      this.properties.inputs = [
        ...new Set([...this.properties.inputs, ...(template.inputs?.map((s) => s.name) || [])]),
      ];
      this.properties.outputs = [
        ...new Set([...this.properties.outputs, ...(template.outputs?.map((s) => s.name) || [])]),
      ];

      const inputProps = [];
      for (let prop of this.properties.inputs) {
        const templateProp = template.inputs?.find((e) => e.name === prop);
        const inputProp = this.properties.inputProps.find((e) => e.name === prop);
        inputProps.push({ ...templateProp, ...inputProp });
      }
      this.properties.inputProps = inputProps;

      const outputProps = [];
      for (let prop of this.properties.outputs) {
        const templateProp = template.outputs?.find((e) => e.name === prop);
        const outputProp = this.properties.outputProps.find((e) => e.name === prop);
        outputProps.push({ ...templateProp, ...outputProp });
      }
      this.properties.outputProps = outputProps;

      //this.properties.outputProps = [...(this.properties.outputProps || []), ...(template.outputs || [])];
    }

    //this.data._templateSettings = this.properties?.template?.settings;

    this.prepare()
      .then(this.init.bind(this))
      .then(() => {
        this.title =
          this.properties.aiTitle || this.properties.title || this.drawSettings.displayName;
        this.aiTitle = this.properties.aiTitle || '';
        this.description =
          this.properties.description ||
          this.drawSettings.shortDescription ||
          this.drawSettings.componentDescription ||
          '';

        //reverse order
        const defaultOutputs = this.properties.defaultOutputs.reverse();
        for (let outputEP of defaultOutputs) {
          if (this.properties.outputs.indexOf(outputEP) === -1)
            this.properties.outputs.unshift(outputEP);
        }

        const defaultInputs = this.properties.defaultInputs.reverse();

        for (let inputEP of defaultInputs) {
          if (this.properties.inputs.indexOf(inputEP) === -1)
            this.properties.inputs.unshift(inputEP);
        }
        this.redraw(triggerSettings);
        this._ready = true;
      })
      .then(this.run.bind(this))
      .finally(() => {
        this.syncTemplateVars();
      });

    ComponentList[this.uid] = this;
  }

  protected async prepare(): Promise<any> {
    return true;
  }
  protected async run(): Promise<any> {
    return true;
  }
  private syncTemplateVars() {
    window['__INPUT_TEMPLATE_VARIABLES__'][this._uid] = new Map();

    const addVar = (fieldName: string, type: string = 'Any'): void => {
      const value = { var: `{{${fieldName}}}`, type: type };
      window['__INPUT_TEMPLATE_VARIABLES__'][this._uid].set(fieldName, value);
    };
    const deleteVar = (fieldName: string): void => {
      window['__INPUT_TEMPLATE_VARIABLES__'][this._uid].delete(fieldName);
    };
    const generateVarBtns = (): void => {
      const inputVars = window['__INPUT_TEMPLATE_VARIABLES__']?.[this._uid] || new Map();
      const fieldName = window['__LAST_FIELD_WITH_TEMPLATE_VARS__'];
      const fieldVars = window['__FIELD_TEMPLATE_VARIABLES__']?.[fieldName] || new Map();

      const variables = new Map([...inputVars, ...fieldVars]) as Map<
        string,
        { var: string; type: string }
      >;

      generateTemplateVarBtns(variables, this._uid);
    };

    this.properties.inputProps?.forEach((input: { name: string; type: string }) =>
      addVar(input.name, input.type),
    );

    const isInput = (elm) => elm.classList.contains('input-endpoint');

    this.addEventListener('endpointAdded', (name, elm) => {
      if (isInput(elm)) {
        // Wait for the DOM attributes to be updated
        setTimeout(() => {
          const type = elm.getAttribute('smt-type');
          addVar(name, type);
        }, 100);

        generateVarBtns();
      }
    });

    this.addEventListener('endpointChanged', (name, elm, oldValue, newValue) => {
      if (isInput(elm)) {
        // Handle different types of input endpoint changes
        if (name === 'name' || name === 'type') {
          setTimeout(() => {
            // Wait for the DOM attributes to be updated
            const elementName = name === 'name' ? newValue : elm.getAttribute('smt-name');
            const elementType = name === 'type' ? newValue : elm.getAttribute('smt-type');

            // For name changes, we need to delete the old variable first
            if (name === 'name') {
              deleteVar(oldValue);
            }

            // Add the variable with updated information
            addVar(elementName, elementType);
          }, 100);
        }

        generateVarBtns();
      }
    });

    this.addEventListener('endpointRemoved', (name, elm) => {
      if (isInput(elm)) {
        deleteVar(name);
        generateVarBtns();
      }
    });
  }
  protected addFieldVariable(fieldName: string, newVariables: Record<string, string>) {
    const variables = window['__FIELD_TEMPLATE_VARIABLES__']?.[fieldName] || new Map();

    for (const [key, value] of Object.entries(newVariables)) {
      variables.set(key, {
        var: value,
        type: 'field',
      });
    }

    window['__FIELD_TEMPLATE_VARIABLES__'][fieldName] = variables;
  }

  private ready(cb: Function) {
    return new Promise((resolve, reject) => {
      if (this._ready) return resolve(true);

      const itv = setInterval(() => {
        if (this._ready) {
          clearInterval(itv);
          if (cb) cb();
          resolve(true);
        }
      }, 15);
    });
  }
  protected async repaint(redrawConnectors = false) {
    if (redrawConnectors) {
      let connections = [...this.domElement.querySelectorAll('.endpoint')]
        .map((ep: any) => ep?.endpoint?.connections)
        .flat(Infinity);
      //deduplicate
      connections = [...new Set(connections)];

      connections.forEach((connection) => {
        this.workspace.updateConnectionStyle(connection);
      });
    }

    this.workspace.jsPlumbInstance.repaint(this.domElement);
  }

  protected async init(): Promise<any> {}

  /**
   * Call this before deleting the component to clean up any data or events
   */
  protected async clean() {
    return true;
  }

  protected isFunctionalComponent() {
    return ['FSign', 'FEncDec', 'FSleep', 'FTimestamp', 'FHash'].includes(this.constructor.name);
  }

  protected isLogicalComponent() {
    return ['LogicAND', 'LogicOR', 'LogicXOR', 'LogicAtLeast', 'LogicAtMost'].includes(
      this.constructor.name,
    );
  }

  // Add a new method to add debug button that can be called by all components
  public addDebugButton() {
    if (!this.domElement) return;

    const titleBar = this.domElement.querySelector('.title-bar');
    if (!titleBar) return;

    // Remove existing debug button if any
    titleBar.querySelector('.btn-debug')?.remove();

    const debugBtn = document.createElement('button');
    debugBtn.className = 'btn-debug button-icon absolute z-10';

    if (this.isFunctionalComponent()) {
      debugBtn.style.top = '1px';
      debugBtn.style.right = '4px';
    } else {
      debugBtn.style.top = '9px';
      debugBtn.style.right = '7px';
    }

    const svgContainer = document.createElement('div');
    svgContainer.className = 'debug-icon-container';
    svgContainer.innerHTML = `
          <img src="" class="debug-icon default-icon w-8 h-8" alt="Debug" style="opacity: 1;" />
      `;

    debugBtn.appendChild(svgContainer);
    debugBtn.onclick = this.openDebugDialog.bind(this);

    new TooltipV2(debugBtn, {
      text: 'Run with Debug',
      position: this.isLogicalComponent() ? 'left' : 'top',
      showWhen: 'hover',
    });

    titleBar.appendChild(debugBtn);
  }

  public async checkSettings() {
    this.clearComponentMessages();

    //#region Get vault data
    const { data: vaultData } = await getVaultData({
      scope: undefined,
    });

    const vaultEntries = Object.values(vaultData);
    //#endregion

    //#region Render missing key messages
    let requiredSettings = [];
    for (let settingId in this.settings) {
      const setting = this.settings[settingId];
      if (setting.validate?.includes('required')) {
        requiredSettings.push({ id: settingId, name: setting.label || settingId });
      }
    }
    const missingSettings = requiredSettings.filter((setting) => !this.data[setting.id]);
    if (missingSettings.length > 0) {
      this.addComponentMessage(
        `Missing Settings ${missingSettings.map((e) => e.name).join(', ')}`,
        'alert pointer',
        () => {
          PostHog.track('app_component_alert_click', {
            type: 'missing settings',
          });
          this.editSettings();
        },
      );
    }

    const MANAGE_KEYS_MESSAGE_CLASS_NAME = '_manage_keys_message';
    const hasManageKeysMessage = this.hasComponentMessage(`.${MANAGE_KEYS_MESSAGE_CLASS_NAME}`);

    const updateUIForVaultKeys = async ({
      addMockToggle = false,
      addManageMessage = false,
    }: {
      addMockToggle?: boolean;
      addManageMessage?: boolean;
    }) => {
      try {
        // Ensure the "Manage Keys" message is rendered before adding the mock data toggle button to prevent duplicate messages. Since adding the toggle button is an asynchronous operation and checkSettings is called without await, there is a potential race condition.
        if (addManageMessage) {
          this?.addComponentMessage(
            'Manage keys',
            'info pointer',
            () => window.open('/vault', '_blank'),
            MANAGE_KEYS_MESSAGE_CLASS_NAME,
          );
        }

        if (addMockToggle) {
          await addMockDataToggleButton(this);
          await toggleMockOutputPills(this);
        }
      } catch (error) {
        console.error('Failed to update UI for vault keys');
      }
    };
    //#region Check for missing template-based settings required for integrations.
    if (this.properties.template) {
      // #region copied from settings-editor.ts
      let templateSettingsEntries = null;
      if (this.properties.template) {
        templateSettingsEntries = {};
        const includedSettings = this.properties?.template?.templateInfo?.includedSettings || [];
        for (let name of includedSettings) {
          // * Ignore button type settings, we don't need to display a 'missing settings' message for them
          if (this.settings?.[name]?.type === 'button') continue;

          templateSettingsEntries[name] = this.settings[name];
          templateSettingsEntries[name].value = this.data[name];
        }

        const templateData = this.data._templateVars;
        for (let name in this.templateSettings) {
          const setting = this.templateSettings[name];
          const entry = { ...setting, value: templateData[name] || setting.value || '' };

          if (setting?.type === 'composite') {
            templateSettingsEntries[name] = syncCompositeValues(entry);
          } else {
            templateSettingsEntries[name] = entry;
          }
        }
      }
      // #endregion copied from settings-editor.ts

      // #region get missing settings
      type TemplateValue = string | number | boolean | null | undefined;

      const templateKeys = Object.keys(templateSettingsEntries || {});

      const missingSettings = templateKeys.filter((key: string): boolean => {
        // Get values from both possible locations
        const templateValue: TemplateValue = this.data?._templateVars?.[key];
        const dataValue: TemplateValue = this.data?.[key];

        /**
         * Check if a value should be considered missing
         * @param value - The value to check
         * @returns true if the value is considered missing/empty
         */
        const isEmptyValue = (value: TemplateValue): boolean => {
          // Explicitly check for null/undefined first
          if (value === null || value === undefined) {
            return true;
          }
          // Check for empty string
          if (typeof value === 'string' && value.trim() === '') {
            return true;
          }
          // All other values (including 0, false) are considered valid
          return false;
        };

        return isEmptyValue(templateValue) && isEmptyValue(dataValue);
      });
      // #endregion get missing settings

      if (missingSettings.length > 0) {
        this.addComponentMessage(`Missing Settings`, 'alert pointer', () => {
          PostHog.track('app_component_alert_click', {
            type: 'missing settings',
          });
          this.editSettings();
        });
      } else {
        const keyTemplateVars = Object.keys(templateSettingsEntries || []).filter((key) =>
          isKeyTemplateVar(this.data?._templateVars?.[key]),
        );

        let shouldShowMockToggle = false;
        let shouldAddManageKeysMessage = false;
        for (let key of keyTemplateVars) {
          const value = this.data?._templateVars?.[key];

          const checkVaultKeysResult = await this.checkVaultKeys(value, vaultEntries);

          if (checkVaultKeysResult?.allKeys?.size > 0) {
            shouldShowMockToggle = true;
          }

          if (checkVaultKeysResult?.existKeys?.size > 0 && !hasManageKeysMessage) {
            shouldAddManageKeysMessage = true;
          }
        }

        updateUIForVaultKeys({
          addMockToggle: shouldShowMockToggle,
          addManageMessage: shouldAddManageKeysMessage,
        });
      }
    }
    //#endregion

    //#region Check for missing vault keys
    let shouldShowMockToggle = false;
    let shouldAddManageKeysMessage = false;
    for (let settingId in this.settings) {
      let value = '';
      try {
        value = decodeURIComponent(this.data[settingId]);
      } catch (e) {
        value = this.data[settingId];
        //console.warn('Error decoding', settingId, this.data[settingId]);
      }

      const checkVaultKeysResult = await this.checkVaultKeys(value, vaultEntries);

      if (checkVaultKeysResult?.allKeys?.size > 0) {
        shouldShowMockToggle = true;
      }

      if (checkVaultKeysResult?.existKeys?.size > 0 && !hasManageKeysMessage) {
        shouldAddManageKeysMessage = true;
      }
    }

    updateUIForVaultKeys({
      addMockToggle: shouldShowMockToggle,
      addManageMessage: shouldAddManageKeysMessage,
    });
    //#endregion

    for (let settingId in this.settings) {
      let value = '';
      try {
        value = decodeURI(this.data[settingId]);
      } catch (e) {
        value = this.data[settingId];
      }

      const regex = /{{INFO\:([^}]*)}}/g;
      let matches = [];
      let match;

      while ((match = regex.exec(value)) !== null) {
        const message = match[1];
        this.addComponentMessage(message, 'warning pointer', () => {
          window.open('/vault', '_blank');
        });
      }
    }
  }
  public async checkVaultKeys(
    value: string = '',
    vaultEntries: any[],
  ): Promise<{
    allKeys: Set<string>;
    existKeys: Set<string>;
    missingKeys: Set<string>;
  }> {
    const regex = /{{KEY\(([^}]*)\)}}/g;
    let matches = [];
    let match;

    while ((match = regex.exec(value)) !== null) {
      if (match[1]) matches.push(match[1]);
    }

    const allKeys = new Set(matches);
    const existKeys: Set<string> = new Set();
    const missingKeys: Set<string> = new Set();

    for (let keyName of matches) {
      if (
        keyName &&
        vaultEntries.find((e: any) => e.name === keyName || e.name === keyName.replace(/\+/g, ' '))
      ) {
        console.log('Vault Key Found', keyName);
        existKeys.add(keyName);
      } else {
        console.log('Vault Key Missing', keyName);
        missingKeys.add(keyName);

        const hasMissingKeyMessage = this.hasComponentMessage(`.${formatKeyAsClassName(keyName)}`);

        if (hasMissingKeyMessage) continue;

        this.addComponentMessage(
          `Missing Key "${keyName}"`,
          'alert pointer',
          () => {
            PostHog.track('app_component_alert_click', {
              type: 'missing key',
            });
            missingKeyMessageClickHandler.bind(this, keyName)();
          },
          formatKeyAsClassName(keyName),
        );
      }
    }

    return {
      allKeys,
      existKeys,
      missingKeys,
    };
  }
  /**
   * This is called before saving the newly edited values of the component, use it to save or validate specific values or perform server side actions
   * @param data the values to be saved
   * @returns
   */
  public async save(data) {
    this.checkSettings();

    setTimeout(async () => {
      this.checkSettings(); //check again after 1 second, in case async operations are still running
    }, 1000);

    return true;
  }
  public destroy() {
    this._destroyed = true;
    this.domElement.remove();
  }
  public getSettingsSidebar() {
    if (Component.curComponentSettings !== this) return null;
    return document.querySelector('#right-sidebar');
  }

  public async deleteEndpoint(endpointElement) {
    const jsPlumbInstance = this.workspace.jsPlumbInstance;
    jsPlumbInstance.deleteEndpoint(endpointElement.endpoint);
    if (endpointElement.classList.contains('input-endpoint')) {
      this.properties.inputs = this.properties.inputs.filter(
        (c) => c !== endpointElement.getAttribute('smt-name'),
      );
      this.properties.inputProps = this.properties.inputProps.filter(
        (c) => c.name !== endpointElement.getAttribute('smt-name'),
      );
    }
    if (endpointElement.classList.contains('output-endpoint')) {
      this.properties.outputs = this.properties.outputs.filter(
        (c) => c !== endpointElement.getAttribute('smt-name'),
      );
      this.properties.outputProps = this.properties.outputProps.filter(
        (c) => c.name !== endpointElement.getAttribute('smt-name'),
      );
    }
    endpointElement.remove();

    // Emit endpoint change event
    document.dispatchEvent(
      new CustomEvent('componentEndpointChanged', {
        detail: { componentId: this.uid },
      }),
    );

    this.workspace.redraw();
    this.workspace.saveAgent();
  }

  private syncProps(type, name, values) {
    const entryName = type === 'input' ? 'inputs' : 'outputs';
    const propName = type === 'input' ? 'inputProps' : 'outputProps';

    const entries = this.properties[entryName];
    const entryIndex = entries.findIndex((n) => n === name);

    const props = this.properties[propName];
    const propIndex = props.findIndex((c) => c?.name === name);

    if (entryIndex >= 0 && propIndex >= 0) {
      this.properties[entryName][entryIndex] = values.name;

      const oldValues = props.find((c) => c?.name === name);
      this.properties[propName][propIndex] = { ...oldValues, ...values };
    }
  }

  public inputNameExists(name) {
    return !!this.inputContainer.querySelector(`.input-endpoint[smt-name="${name}"]`);
  }
  public outputNameExists(name) {
    return !!this.outputContainer.querySelector(`.output-endpoint[smt-name="${name}"]`);
  }

  private parseOutputProp(outputName, propName, _default?) {
    if (!this.outputSettings[propName]) return undefined;
    const outputProps = this.properties.outputProps?.find((c) => c.name === outputName);
    const propSettings = this.outputSettings[propName];

    switch (propSettings?.type) {
      case 'string':
        return outputProps?.[propName] || propSettings?.default || _default;
      case 'number':
        return outputProps?.[propName] || propSettings?.default || _default;
      case 'boolean':
        return outputProps?.[propName] || propSettings?.default || _default;
    }
  }
  public async addOutput(parent, name, outputProperties: any = {}, options: any = {}) {
    if (this.outputNameExists(name)) {
      errorToast(`${name} already exists`);
      return;
    }
    const jsPlumbInstance = this.workspace.jsPlumbInstance;
    const outputDiv: any = document.createElement('div');
    outputDiv.className = `smyth endpoint output-endpoint ${this.constructor.name}`;

    outputDiv.setAttribute('smt-name', name);
    const outputProps = this.properties.outputProps?.find((c) => c.name === name);
    //outputDiv.setAttribute('smt-description', description || outputProps?.description || '');
    const epColor = outputProps?.color || `${WorkspaceDefaults.conStartColor}`;
    outputDiv.setAttribute('smt-color', epColor);

    for (let entry in this.outputSettings) {
      outputDiv.setAttribute(`smt-${entry}`, this.parseOutputProp(name, entry, ''));
    }

    //* update: this might have been a bad copy/paste because we should check if the property is in the outputSettings and not the inputSettings
    //* we will keep it for now just to see if it was there intentionally or not. for now, we added a new if condition to check outputSettings
    for (let entry in outputProperties) {
      if (this.inputSettings[entry]) {
        outputDiv.setAttribute(`smt-${entry}`, outputProperties[entry]);
      }
    }

    for (let entry in outputProperties) {
      if (this.outputSettings[entry]) {
        outputDiv.setAttribute(`smt-${entry}`, outputProperties[entry]);
      }
    }

    if (Object.keys(outputProperties)?.length > 0) {
      this.properties.outputs.push(name);
    }

    parent.appendChild(outputDiv);

    await delay(50);

    const endpoint = jsPlumbInstance.addEndpoint(outputDiv, {
      paintStyle: { fill: '#ddddff00' },
      endpoint: ['Rectangle', { height: 10, width: 40 }],
      //anchor: [1.07, 0.5] ,
      anchor: 'Right',
      isSource: true,
      maxConnections: this.drawSettings.outputMaxConnections,
      cssClass: 'exclude-panzoom',
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.innerHTML = `<span class="label">${name}</span>`;
    outputDiv.appendChild(nameSpan);

    //const defaultEP = this.properties.defaultOutputs.includes(name);
    const defaultEP = this.properties.defaultOutputs.includes(name);
    const templateDefaultEP =
      !this.templateEditing && this.properties.template?.outputs?.find((e) => e.name == name);

    const epEditButton = document.createElement('button');
    epEditButton.className =
      'btn-edit-endpoint  button text-gray-310 bg-white hover:text-emerald-600 mini';
    epEditButton.innerHTML = '<span class="icon mif-pencil"></span>';
    epEditButton.setAttribute('rel', outputDiv.id);
    epEditButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      let result = true;
      if (options.onEditBtnClick) {
        result = await options.onEditBtnClick(event);
        if (result === false) return; // user cancelled the edit
      }
      event.stopImmediatePropagation();

      const name = outputDiv.getAttribute('smt-name');

      const templateDefaultEP =
        !this.templateEditing && this.properties.template?.outputs?.find((e) => e.name == name);
      const color = outputDiv.getAttribute('smt-color') || `${WorkspaceDefaults.conStartColor}`;
      const valConfig: any = {
        name: {
          label: 'Output Name',
          type: 'text',
          class: 'stg-output stg-name',
          value: name,
          readonly: defaultEP || templateDefaultEP,
          validate: 'required custom=isValidOutputName',
          validateMessage: `Name is required and allow JSON path notation, e.g., Response.text, items[0], data['key'], etc.`,
        },
        additionalOptionsLabel: {
          type: 'div',
          html: '<small class="field-hint">You can also assign a color label to this input for better organization or categorization.</small>',
          section: 'Advanced_Options',
          formControlCls: 'bg-white',
        },
        color: getColorField(color),
        // html: { type: 'div', html: '<hr />' },
      };

      for (let entry in this.outputSettings) {
        const prop = this.outputSettings[entry];
        if (prop) {
          let value = outputDiv.getAttribute(`smt-${entry}`);

          // make sure proper boolean type to show checkbox status correctly
          if (value === 'true') value = true;
          if (value === 'false') value = false;

          valConfig[entry] = { ...prop.editConfig, value };

          if (!prop.allowDefaultEdit) {
            valConfig[entry].readonly = defaultEP || templateDefaultEP;
            valConfig[entry].class += defaultEP || templateDefaultEP ? ' hidden' : '';
          }
        }
      }

      // Move description inside Advanced Options section
      if (valConfig?.description) {
        valConfig.description.section = 'Advanced_Options';
      }

      const dialogTitle =
        this.constructor.name === COMP_NAMES.apiEndpoint
          ? `<span class="text-xl agent-skill-dialog-title">Edit Skill Output</span>`
          : '<span class="text-xl">Edit Output</span>';

      const orderedValConfig = getOrderedValConfig(valConfig, [
        'description',
        'expression',
        'additionalOptionsLabel',
        'color',
      ]);

      //const newValues: any = await editValues({ title: 'Edit Output', entriesObject: valConfig });
      const newValues: any = await this.inputEditor({
        title: dialogTitle,
        fields: orderedValConfig,
        onDOMReady: (dialog) => {
          const nameElm = dialog.querySelector('#name') as HTMLInputElement;

          const titleElm = dialog.querySelector('.agent-skill-dialog-title') as HTMLSpanElement;
          const buttonElm = document.querySelector('#add-skill-input-info-icon');

          if (titleElm && buttonElm) {
            buttonElm.classList.remove('hidden');
            titleElm.appendChild(buttonElm);
          }

          // requires a tiny delay to make sure the input is focused
          delay(50).then(() => focusField(nameElm));
        },
        contentClasses: 'min-h-[335px]',
        dialogClasses: 'dialog-center rounded-[18px] p-2 pb-3',
        showCloseButton: true,
      });

      if (!newValues) return;
      if (newValues.name != name) {
        if (this.outputNameExists(newValues.name)) {
          errorToast(`${newValues.name} already used`);
          return;
        }
        outputDiv.setAttribute('smt-name', newValues.name);
        outputDiv.querySelector('.name').innerHTML = newValues.name;
        this.emit('endpointChanged', 'name', outputDiv, name, newValues.name);

        // Emit endpoint change event for search tracking
        document.dispatchEvent(
          new CustomEvent('componentEndpointChanged', {
            detail: { componentId: this.uid },
          }),
        );
      }
      if (outputDiv && newValues.color != color) {
        outputDiv.setAttribute('smt-color', newValues.color);
        outputDiv.querySelector('.ep').style.backgroundColor =
          newValues.color || `${WorkspaceDefaults.conStartColor}`;
        outputDiv.querySelector('.name').style.borderImage =
          `linear-gradient(90deg, transparent 20%, ${newValues.color}) 1`;
        const endpoint: any = outputDiv.endpoint;
        if (endpoint && endpoint['connections']) {
          for (let connection of endpoint['connections'])
            this.workspace.updateConnectionColors(connection);
        }

        this.emit('endpointChanged', 'color', outputDiv, color, newValues.color);
      }

      for (let entry in this.outputSettings) {
        const prop = this.outputSettings[entry];
        if (outputDiv && prop) {
          const value = outputDiv.getAttribute(`smt-${entry}`);
          if (newValues[entry] !== value && newValues[entry] != undefined) {
            outputDiv.setAttribute(`smt-${entry}`, newValues[entry]);
            this.emit(`endpointChanged`, entry, outputDiv, value, newValues[entry]);
          }
        }
      }

      // sync properties with the updated output values
      this.syncProps('output', name, newValues);

      this.workspace.saveAgent();
    });
    const epDeleteButton = document.createElement('button');
    epDeleteButton.className =
      'btn-delete-endpoint button text-smyth-red-500 hover:text-white hover:bg-smyth-red-500 mini outline';
    epDeleteButton.innerHTML = '<span class="icon mif-bin"></span>';
    epDeleteButton.setAttribute('rel', outputDiv.id);
    epDeleteButton.addEventListener('click', async (event) => {
      const name = outputDiv.getAttribute('smt-name');
      const templateDefaultEP =
        !this.templateEditing && this.properties.template?.outputs?.find((e) => e.name == name);
      if (defaultEP || templateDefaultEP) return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      return (await confirm('Deleting Output. Are you sure ?', '', {
        btnYesLabel: 'Delete',
        btnNoLabel: 'Cancel',
        btnNoClass: 'hidden',
        btnYesType: 'danger',
      }))
        ? this.deleteEndpoint(outputDiv)
        : false;
    });
    if (!defaultEP && templateDefaultEP) {
      epDeleteButton.setAttribute('templateEditable', 'true');
    }
    outputDiv.appendChild(epDeleteButton);
    epDeleteButton.classList.add('hidden');

    if (!defaultEP && !templateDefaultEP) {
      epDeleteButton.classList.remove('hidden');
    } else {
      outputDiv.classList.add('default');
    }
    outputDiv.appendChild(epEditButton);

    const epMoveUpButton = document.createElement('button');
    epMoveUpButton.className =
      'btn-moveup-endpoint button text-gray-310 bg-white hover:text-emerald-600 mini';
    epMoveUpButton.innerHTML = '<span class="icon mif-arrow-up"></span>';
    epMoveUpButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      outputDiv.parentElement.insertBefore(outputDiv, outputDiv.previousSibling);
      this.repaint();
      this.workspace.saveAgent();
    });
    outputDiv.appendChild(epMoveUpButton);

    const epMoveDownButton = document.createElement('button');
    epMoveDownButton.className =
      'btn-movedown-endpoint button text-gray-310 bg-white hover:text-emerald-600 mini';
    epMoveDownButton.innerHTML = '<span class="icon mif-arrow-down"></span>';
    epMoveDownButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      outputDiv?.parentElement?.insertBefore(outputDiv?.nextSibling, outputDiv);
      this.repaint();
      this.workspace.saveAgent();
    });
    outputDiv.appendChild(epMoveDownButton);

    const epDiv = document.createElement('span');
    epDiv.className = `ep ep-Output ep-${name}`;
    epDiv.innerHTML = ' ';
    epDiv.style.backgroundColor = outputProps?.color || `${WorkspaceDefaults.conStartColor}`;
    outputDiv.appendChild(epDiv);

    outputDiv.querySelector('.name').style.borderImage =
      `linear-gradient(90deg, transparent 20%, ${epColor}) 1`;
    // set jsPlumb connection Color
    for (let connection of endpoint['connections'])
      this.workspace.updateConnectionColors(connection);

    outputDiv.endpoint = endpoint;
    endpoint['_domElement'] = outputDiv;
    if (!outputProps && outputProperties.name) {
      if (!outputProperties.default) outputProperties.default = false;
      this.properties.outputProps.push(outputProperties);
    }

    this.emit('endpointAdded', name, outputDiv);

    // Emit endpoint change event for search tracking
    document.dispatchEvent(
      new CustomEvent('componentEndpointChanged', {
        detail: { componentId: this.uid },
      }),
    );

    this.workspace.saveAgent();
    return outputDiv;
  }

  public setTemplateEditMode() {
    this.templateEditing = true;
    this.domElement
      .querySelectorAll('[templateEditable="true"]')
      .forEach((e) => e.classList.remove('hidden'));
  }
  public unsetTemplateEditMode() {
    this.templateEditing = false;
    this.domElement
      .querySelectorAll('[templateEditable="true"]')
      .forEach((e) => e.classList.add('hidden'));
  }

  private parseInputProp(inputName, propName, _default?) {
    if (!this.inputSettings[propName]) return undefined;
    const inputProps = this.properties.inputProps?.find((c) => c.name === inputName);
    const propSettings = this.inputSettings[propName];

    switch (propSettings?.type) {
      case 'string':
        return inputProps?.[propName] || propSettings?.default || _default;
      case 'number':
        return inputProps?.[propName] || propSettings?.default || _default;
      case 'boolean':
        return inputProps?.[propName] || propSettings?.default || _default;
    }
  }

  public async addInput(parent, name, inputProperties: any = {}) {
    if (this.inputNameExists(name)) {
      errorToast(`${name} already exists`);
      return;
    }
    const jsPlumbInstance: any = this.workspace.jsPlumbInstance;
    const inputDiv: any = document.createElement('div');
    inputDiv.className = `smyth endpoint input-endpoint ${this.constructor.name}`;

    inputDiv.setAttribute('smt-name', name);

    const inputProps = this.properties.inputProps?.find((c) => c.name === name);
    //inputDiv.setAttribute('smt-description', description || inputProps?.description || '');
    inputDiv.setAttribute('smt-optional', inputProps?.optional || 'false');
    inputDiv.setAttribute('smt-color', inputProps?.color || `${WorkspaceDefaults.conEndColor}`);
    inputDiv.setAttribute('smt-type', inputProps?.type || 'Any');
    inputDiv.setAttribute('smt-friendly-input-type', inputProps?.friendlyInputType || '');
    inputDiv.setAttribute('smt-core-input-type', inputProps?.coreInputType || '');

    if (inputProps?.optional) inputDiv.classList.add('optional');
    else inputDiv.classList.remove('optional');

    for (let entry in this.inputSettings) {
      inputDiv.setAttribute(`smt-${entry}`, this.parseInputProp(name, entry, ''));
    }

    for (let entry in inputProperties) {
      if (this.inputSettings[entry]) {
        inputDiv.setAttribute(`smt-${entry}`, inputProperties[entry]);
      }
    }

    if (Object.keys(inputProperties)?.length > 0) {
      this.properties.inputs.push(name);
    }

    parent.appendChild(inputDiv);

    await delay(50);

    const endpoint = jsPlumbInstance.addEndpoint(inputDiv, {
      paintStyle: { fill: 'transparent' },
      endpoint: ['Dot', { radius: 10 }],
      //endpoint: ["Rectangle", { height: 10, width: 30 }],
      anchor: ['Left', { dx: 40 }],

      isTarget: true,
      maxConnections: this.drawSettings.inputMaxConnections,
      cssClass: 'exclude-panzoom',
    });
    //handle connection re-targetting (this is not handled by jsPlumb, we need to override it)
    if (!endpoint._listeners.mouseup) endpoint._listeners.mouseup = [];
    endpoint._listeners.mouseup.push(() => {
      if (this.workspace._draggingConnection) {
        const source = this.workspace._draggingConnection.source.endpoint;

        const existingConnection = source.connections.find((c) => c.endpoints.includes(endpoint));

        if (existingConnection) return; //connection already exists between these two endpoints ==> do nothing

        this.workspace.jsPlumbInstance.connect({
          source: source,
          target: endpoint,
          cssClass: 'exclude-panzoom',
        });
        this.workspace.jsPlumbInstance.deleteConnection(this.workspace._draggingConnection);
      }
      document.querySelectorAll('.endpoint.active').forEach((e) => e.classList.remove('active'));
    });

    const epDiv = document.createElement('span');
    epDiv.className = `ep ep-Input ep-${name}`;
    epDiv.innerHTML = ' ';
    epDiv.style.backgroundColor = inputProps?.color || `${WorkspaceDefaults.conEndColor}`;
    inputDiv.appendChild(epDiv);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.innerHTML = name;
    inputDiv.appendChild(nameSpan);

    const defaultEP = this.properties.defaultInputs.includes(name);
    const templateDefaultEP =
      !this.templateEditing && this.properties.template?.inputs?.find((e) => e.name == name);

    const epEditButton = document.createElement('button');
    epEditButton.className =
      'btn-edit-endpoint  button text-gray-310 bg-white hover:text-emerald-600 mini';
    epEditButton.innerHTML = '<span class="icon mif-pencil"></span>';
    epEditButton.setAttribute('rel', inputDiv.id);
    epEditButton.addEventListener('click', async (event) => {
      event.stopPropagation();

      const name = inputDiv.getAttribute('smt-name');

      // * Need to get the inputProps to have the updated data
      const inputProps = this.properties.inputProps?.find((c) => c.name === name);

      const templateDefaultEP =
        !this.templateEditing && this.properties.template?.inputs?.find((e) => e.name == name);

      const optional = inputDiv.getAttribute('smt-optional') == 'true';
      const color = inputDiv.getAttribute('smt-color') || `${WorkspaceDefaults.conEndColor}`;

      let type =
        inputDiv.getAttribute('smt-type') && inputDiv.getAttribute('smt-type') !== 'undefined'
          ? inputDiv.getAttribute('smt-type')
          : '';
      let friendlyInputType = inputDiv.getAttribute('smt-friendly-input-type') || '';
      let coreInputType = inputDiv.getAttribute('smt-core-input-type') || '';

      if (type && !friendlyInputType) {
        friendlyInputType = 'Others';
        coreInputType = type;
      }

      // [MIGRATION BINARY INPUT]
      // transfer old 'Binary Input' checkbox to new 'Binary' type
      const isFile = inputDiv.getAttribute('smt-isfile') == 'true';
      let hadBinaryInput = false;
      if (isFile) {
        hadBinaryInput = true;
        type = 'Binary';
      }

      const isDefaultEP = defaultEP || templateDefaultEP;

      const valConfig: {
        name: Record<string, unknown>;
        description?: Record<string, unknown>;
        friendlyInputType?: Record<string, unknown>;
        coreInputType?: Record<string, unknown>;
        type?: Record<string, unknown>;
        color?: Record<string, unknown>;
        optional?: Record<string, unknown>;
        additionalOptionsLabel?: Record<string, unknown>;
      } = {
        name: {
          type: 'text',
          label: 'Input Name',
          class: 'stg-input stg-name',
          value: name,
          readonly: defaultEP || templateDefaultEP,
          validate: 'required custom=isValidInputName',
          validateMessage:
            'Name is required and can only contain letters, numbers, and underscores.',
        },
      };

      if (!isDefaultEP) {
        const typeFields = getTypeFields({
          compName: this.constructor.name,
          values: {
            friendlyInputType,
            // Prioritize inputProps values since components like GenAI LLM enforce specific types
            coreInputType: inputProps?.type || coreInputType,
            type: inputProps?.type || type,
          },
        });
        if (typeFields?.friendlyInputType) {
          valConfig.friendlyInputType = typeFields.friendlyInputType;
        }
        if (typeFields?.coreInputType) {
          valConfig.coreInputType = typeFields.coreInputType;
        }
        if (typeFields?.type) {
          valConfig.type = typeFields.type;
        }
      }

      valConfig.additionalOptionsLabel = {
        type: 'div',
        html: '<small class="field-hint">Choose whether this input is mandatory or optional. You can also assign a color label to this input for better organization or categorization.</small>',
        section: 'Advanced_Options',
        formControlCls: 'bg-white',
      };

      /*  valConfig.optional = {
        type: 'checkbox',
        class: `${isDefaultEP ? 'w-32' : 'w-28'} stg-input stg-optional pt-7 ${
          defaultEP || templateDefaultEP ? 'hidden' : ''
        }`,
        value: optional,
        readonly: defaultEP || templateDefaultEP,
        section: 'Advanced_Options',
      }; */

      valConfig.optional = getOptionalField(optional, defaultEP || templateDefaultEP);
      valConfig.color = getColorField(color);

      //if (this.drawSettings.hasInputsDescription) valConfig.description = { type: 'textarea', value: description, readonly: defaultEP };
      for (let entry in this.inputSettings) {
        const prop = this.inputSettings[entry];
        if (prop) {
          let value = inputDiv.getAttribute(`smt-${entry}`);

          // make sure proper boolean type to show checkbox status correctly
          if (value === 'true') value = true;
          if (value === 'false') value = false;

          valConfig[entry] = { ...prop.editConfig, value };

          if (!prop.allowDefaultEdit) {
            valConfig[entry].readonly = defaultEP || templateDefaultEP;
            valConfig[entry].class += defaultEP || templateDefaultEP ? ' hidden' : '';
          }
        }
      }

      const dialogTitle =
        this.constructor.name === COMP_NAMES.apiEndpoint
          ? `<span class="text-xl agent-skill-dialog-title">Edit Skill Input</span>`
          : '<span class="text-xl">Edit Input</span>';

      // Move description inside Advanced Options section
      if (valConfig?.description) {
        valConfig.description.section = 'Advanced_Options';
      }

      const orderedValConfig = getOrderedValConfig(valConfig, [
        'name',
        'type',
        'description',
        'additionalOptionsLabel',
        'optional',
        'color',
      ]);

      //const newValues: any = await editValues({ title: 'Edit input', entriesObject: valConfig });
      const newValues: any = await this.inputEditor({
        title: dialogTitle,
        fields: orderedValConfig,
        onDOMReady: (dialog) => {
          const nameElm = dialog.querySelector('#name') as HTMLInputElement;

          const titleElm = dialog.querySelector('.agent-skill-dialog-title') as HTMLSpanElement;
          const buttonElm = document.querySelector('#add-skill-input-info-icon');

          if (titleElm && buttonElm) {
            buttonElm.classList.remove('hidden');
            titleElm.appendChild(buttonElm);
          }

          // requires a tiny delay to make sure the input is focused
          delay(50).then(() => focusField(nameElm));
        },
        contentClasses: 'min-h-[425px]',
        dialogClasses: 'dialog-center rounded-[18px] p-2 pb-3',
        showCloseButton: true,
      });
      if (!newValues) return;
      if (newValues.name !== name) {
        if (this.inputNameExists(newValues.name)) {
          errorToast(`${newValues.name} already used`);
          return;
        }
        inputDiv.setAttribute('smt-name', newValues.name);
        inputDiv.querySelector('.name').innerHTML = newValues.name;

        this.emit('endpointChanged', 'name', inputDiv, name, newValues.name);

        // Emit endpoint change event for search tracking
        document.dispatchEvent(
          new CustomEvent('componentEndpointChanged', {
            detail: { componentId: this.uid },
          }),
        );
      }
      if (newValues.optional !== optional) {
        inputDiv.setAttribute('smt-optional', newValues.optional);
        if (newValues.optional) inputDiv.classList.add('optional');
        else inputDiv.classList.remove('optional');

        this.emit('endpointChanged', 'optional', inputDiv, optional, newValues.optional);
      }
      if (inputDiv && newValues.color !== color) {
        inputDiv.setAttribute('smt-color', newValues.color);
        inputDiv.querySelector('.ep').style.backgroundColor =
          newValues.color || `${WorkspaceDefaults.conEndColor}`;

        inputDiv.querySelector('.name').style.borderImage =
          `linear-gradient(90deg, transparent 20%, ${newValues.color}) 1`;

        const endpoint: any = inputDiv.endpoint;
        if (endpoint && endpoint['connections']) {
          for (let connection of endpoint['connections'])
            this.workspace.updateConnectionColors(connection);
        }

        this.emit('endpointChanged', 'color', inputDiv, color, newValues.color);
      }

      if (!newValues.type) newValues.type = 'Any';
      // [MIGRATION BINARY INPUT]
      if ((inputDiv && newValues.type !== type) || hadBinaryInput) {
        inputDiv.setAttribute('smt-type', newValues.type);
        this.emit('endpointChanged', 'type', inputDiv, type, newValues.type);
      }

      inputDiv?.setAttribute('smt-friendly-input-type', newValues?.friendlyInputType || '');
      inputDiv?.setAttribute('smt-core-input-type', newValues?.coreInputType || '');

      // if (newValues.description !== description && newValues.description != undefined) {
      //     inputDiv.setAttribute('smt-description', newValues.description);

      //     this.emit('endpointDescriptionChanged', inputDiv, description, newValues.description);
      // }

      for (let entry in this.inputSettings) {
        const prop = this.inputSettings[entry];
        if (inputDiv && prop) {
          const value = inputDiv.getAttribute(`smt-${entry}`);
          if (newValues[entry] !== value && newValues[entry] != undefined) {
            inputDiv.setAttribute(`smt-${entry}`, newValues[entry]);
            this.emit(`endpointChanged`, entry, inputDiv, value, newValues[entry]);
          }
        }
      }

      // sync properties with the updated output values
      this.syncProps('input', name, newValues);

      this.workspace.saveAgent();
    });

    const epDeleteButton = document.createElement('button');
    epDeleteButton.className =
      'btn-delete-endpoint button text-smyth-red-500 hover:text-white hover:bg-smyth-red-500 mini outline';
    epDeleteButton.innerHTML = '<span class="icon mif-bin"></span>';
    epDeleteButton.setAttribute('rel', inputDiv.id);
    epDeleteButton.addEventListener('click', async (event) => {
      const name = inputDiv.getAttribute('smt-name');
      const templateDefaultEP =
        !this.templateEditing && this.properties.template?.inputs?.find((e) => e.name == name);
      if (defaultEP || templateDefaultEP) return;

      event.stopPropagation();
      event.stopImmediatePropagation();
      const _confirm = await confirm('Deleting Input. Are you sure ?', '', {
        btnYesLabel: 'Delete',
        btnNoLabel: 'Cancel',
        btnNoClass: 'hidden',
        btnYesType: 'danger',
      });

      if (_confirm) {
        this.deleteEndpoint(inputDiv);

        const name = inputDiv.getAttribute('smt-name');
        this.emit('endpointRemoved', name, inputDiv);

        return true;
      }

      return false;
    });
    if (!defaultEP && templateDefaultEP) {
      epDeleteButton.setAttribute('templateEditable', 'true');
    }
    inputDiv.appendChild(epDeleteButton);
    epDeleteButton.classList.add('hidden');

    if (!defaultEP && !templateDefaultEP) {
      epDeleteButton.classList.remove('hidden');
    } else {
      inputDiv.classList.add('default');
    }

    inputDiv.appendChild(epEditButton);

    const epMoveUpButton = document.createElement('button');
    epMoveUpButton.className =
      'btn-moveup-endpoint button text-gray-310 bg-white hover:text-emerald-600 mini';
    epMoveUpButton.innerHTML = '<span class="icon mif-arrow-up"></span>';
    epMoveUpButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      inputDiv.parentElement.insertBefore(inputDiv, inputDiv.previousSibling);
      this.repaint();
      this.workspace.saveAgent();
    });
    inputDiv.appendChild(epMoveUpButton);

    const epMoveDownButton = document.createElement('button');
    epMoveDownButton.className =
      'btn-movedown-endpoint button text-gray-310 bg-white hover:text-emerald-600 mini';
    epMoveDownButton.innerHTML = '<span class="icon mif-arrow-down"></span>';
    epMoveDownButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      inputDiv.parentElement.insertBefore(inputDiv.nextSibling, inputDiv);
      this.repaint();
      this.workspace.saveAgent();
    });
    inputDiv.appendChild(epMoveDownButton);

    // set jsPlumb connection Color
    for (let connection of endpoint['connections'])
      this.workspace.updateConnectionColors(connection);

    inputDiv.endpoint = endpoint;
    endpoint['_domElement'] = inputDiv;

    if (!inputProps && inputProperties.name) {
      if (!inputProperties.default) inputProperties.default = false;
      this.properties.inputProps.push(inputProperties);
    }
    this.emit('endpointAdded', name, inputDiv);

    // Emit endpoint change event for search tracking
    document.dispatchEvent(
      new CustomEvent('componentEndpointChanged', {
        detail: { componentId: this.uid },
      }),
    );

    this.workspace.saveAgent();
    return inputDiv;
  }

  public refreshSettingsSidebar() {
    if (this.settingsOpen) this.editSettings();
  }

  /**
   * This function takes a template string and a settings object,
   * it replace the string with a unique id representation, extract the settings from the string and store them in the settings object
   * @param str
   * @param settingsObj
   * @returns
   */
  public parseTemplateString(str: string, settingsObj: any) {
    let arrRegex = /{{([A-Z]+):([\w\s]+):\[(.*?)\]}}/gm;
    let jsonRegex = /{{([A-Z]+):([\w\s]+):(\{.*?\})}}/gm;
    const arrMaches = str.matchAll(arrRegex);
    const jsonMaches = str.matchAll(jsonRegex);

    const matches = [...arrMaches, ...jsonMaches];

    for (const match of matches) {
      const attributes = { 'data-template-vars': 'false' };

      let type = match[1].toUpperCase();

      //generate a unique id for the entry
      //the id will be used to map template settings values to _templateVars
      const id = `${type}-${uid()}`;

      if (type.startsWith('VAR')) {
        type = type.replace('VAR', '');
        attributes['data-template-vars'] = 'true';
      }
      if (type.startsWith('VAULT')) {
        type = type.replace('VAULT', '');
        attributes['data-vault'] = `${this.constructor.name},All`;
      }
      const label = match[2];
      let options;
      let jsonValue;
      if (match[3].trim().startsWith('{') && match[3].trim().endsWith('}')) {
        try {
          jsonValue = JSON.parse(match[3]);
        } catch (e) {}
      }
      if (!jsonValue) {
        try {
          const arrValues = JSON.parse(`[${match[3] || ''}]`);
          if (arrValues.length > 1) {
            options = arrValues.map((e) => {
              return { text: e, value: e };
            });
            options.unshift({ text: ' ', value: '' });
          } else {
            options = arrValues;
          }
        } catch (e) {
          options = [];
        }
      }

      let value = options?.[0] || '';
      let customSettings = {};

      switch (type) {
        case 'KVJSON':
          value = JSON.stringify(jsonValue, null, 2);
          break;

        default:
          customSettings = jsonValue;
      }

      settingsObj[id] = {
        id,
        type,
        label,
        value,
        options,
        attributes,
        _templateEntry: true,
        ...customSettings,
      };

      str = str.replace(match[0], `{{${id}}}`);
    }
    return str;
  }

  public parseCompositeTemplateString(data: string, settings: Record<string, string>): string {
    let _data = JSON.parse(data || '{}') || {};

    const isArrayData = Array.isArray(_data);

    _data = isArrayData ? _data[0] : _data;

    for (let key in _data) {
      let value = _data[key];

      if (typeof value === 'object' && value !== null) {
        value = this.parseCompositeTemplateString(JSON.stringify(value), settings);

        // For nested objects, we need to parse the string again. So only final result will be stringified
        value = JSON.parse(value);
      } else if (typeof value === 'string') {
        value = this.parseTemplateString(value, settings);
      }

      _data[key] = value;
    }

    return JSON.stringify(isArrayData ? [_data] : _data);
  }

  protected normalizeTemplateSettings(str) {
    const regex = /{{([A-Z]+):([\w\s]+):\[(.*?)\]}}/gm;
  }

  public async editSettings() {
    return editSettings(this);
  }

  public async confirmSaveSettings() {
    const changed = this.settingsChanged();
    if (changed) {
      const saveBeforeClose = await confirm(
        'Settings Changed',
        'You have unsaved changes. Are you sure you want to discard your changes?',
        {
          btnYesLabel: 'Save Changes',
          btnNoClass: 'hidden',
        },
      );
      if (saveBeforeClose) {
        const form = document.querySelector('#right-sidebar form');
        const values = readFormValues(form, this.settingsEntries);
        const saved = await this.save(values);
        if (!saved) {
          errorToast('Error saving settings');
          return;
        }

        if (this.properties.template) {
          const templateData = this.data._templateVars;
          const settings = this.templateSettings;

          const includedSettings = this.properties?.template?.templateInfo?.includedSettings || [];
          for (let name of includedSettings) {
            this.data[name] = values[name];
          }

          for (let name in settings) {
            //const setting = settings[name];
            templateData[name] = values[name];
          }
          //this.data._templateData = JSON.stringify(templateData);
        } else {
          for (let name in this.settings) {
            this.data[name] = values[name];
          }
        }
        console.log('new settings', values);

        this.emit('settingsSaved', values);
        return true;
      }
    }

    return false;
  }
  public settingsChanged() {
    if (!this.settingsOpen) return false;
    const entries = this.settingsEntries;
    const form = document.querySelector(`#right-sidebar form.Settings`);
    if (!form) return false;
    const values = readFormValues(form, entries);

    if (this.properties.template) {
      const templateData = this.data._templateVars;
      for (let name in entries) {
        if (
          Object.prototype.hasOwnProperty.call(templateData, name) &&
          !isEqual(templateData[name], values[name])
        )
          return true;

        if (
          Object.prototype.hasOwnProperty.call(entries, name) &&
          !isEqual(entries[name]?.value, values[name])
        )
          return true;
      }
    } else {
      for (let name in entries) {
        if (
          Object.prototype.hasOwnProperty.call(this.data, name) &&
          !isEqual(this.data[name], values[name])
        )
          return true;
      }
    }
  }
  public async closeSettings(force = false) {
    return closeSettings(this, force);
  }

  public showOverlay(content) {
    this.overlay.querySelector('.content').innerHTML = content;
    this.overlay.style.display = 'block';
  }

  public hideOverlay() {
    this.overlay.querySelector('.content').innerHTML = '';
    this.overlay.style.display = 'none';
  }

  // todo: need to improve by checking specific class for message
  public hasComponentMessage(selector: string) {
    return this.domElement.querySelector(selector) !== null;
  }

  // todo: need to improve by checking specific class for button
  public hasComponentButton(selector: string) {
    return this.domElement.querySelector(selector) !== null;
  }

  public clearComponentMessage(selector: string) {
    const message = this.domElement.querySelector(selector);
    if (message) message.remove();
  }

  public clearComponentMessages() {
    this.domElement.querySelector('.messages-container').innerHTML = '';
  }
  /**
   * Adds a message to the component's message container
   * @param message - The message content to display
   * @param type - The type/style of message (default: 'info')
   * @param onClick - Optional click handler for the message
   * @returns The created message element
   */
  public addComponentMessage(
    message: string | { id: string; text: string },
    type = 'info',
    onClick?: (event: MouseEvent) => void,
    classes?: string,
  ): HTMLDivElement {
    const msg = document.createElement('div');
    msg.className = `message ${type} ${classes}`;
    msg.innerHTML = typeof message === 'string' ? message : message.text;

    if (onClick) {
      msg.style.cursor = 'pointer';
      msg.addEventListener('click', onClick);
    }

    this.domElement.querySelector('.messages-container').appendChild(msg);
    return msg;
  }
  public addComponentButton(label, type = 'info', attributes?: any, callback?) {
    const msg = document.createElement('div');
    msg.className = `message ${type} flex flex-wrap justify-center items-center p-2`;

    // TODO: ID must be unique but it's possible to have multiple buttons across different components, need to find a solution
    msg.id = 'component-button';

    const btn = document.createElement('button');
    //btn.innerHTML = label;
    const stylesMap = {
      primary:
        'flex flex-row w-full items-center content-center text-xs justify-start gap-1 h-sm px-2 py-1 rounded-xl text-white bg-blue-500 pointer active:text-gray-100 active:bg-blue-600 active:ring-0',
      secondary:
        'flex flex-row w-full items-center justify-center text-xs gap-1 h-sm px-2 py-2 rounded-md text-[#3C89F9] border-[#3C89F9] bg-transparent pointer border-2 ',
      toggle:
        'flex flex-row w-full items-center justify-start text-xs gap-1 h-sm px-1 rounded-md bg-transparent pointer',
    };
    btn.className = stylesMap[attributes?.customStyle] || stylesMap['primary'];

    btn.innerHTML = label;

    if (attributes) {
      for (let key in attributes) {
        if (key == 'class') btn.className += ` ${attributes[key]}`;
        else btn.setAttribute(key, attributes[key]);
      }
    }
    if (callback) btn.onclick = callback;

    msg.appendChild(btn);

    if (attributes?.position === 'top') {
      this.domElement.querySelector('.messages-container').prepend(msg);
    } else {
      this.domElement.querySelector('.messages-container').appendChild(msg);
    }
    return msg;
  }
  public redraw(triggerSettings = true) {
    const jsPlumbInstance: any = this.workspace.jsPlumbInstance;
    const workspace = this.workspace;
    const component = this;
    const outputEndpoints = this.properties.outputs || [];
    const inputEndpoints = this.properties.inputs || [];

    const div = document.createElement('div');
    div.className = `component exclude-panzoom group ${this.drawSettings.cssClass || ''}`;
    div.id = `${this._uid}`;
    div.style.left = this.properties.left || '20px';
    div.style.top = this.properties.top || '20px';
    if (this.properties.width) div.style.width = this.properties.width;
    if (this.properties.height) div.style.height = this.properties.height;
    div.classList.add(this.constructor.name);

    const componentName = document.createElement('div');
    componentName.className = 'internal-name';

    const displayName =
      this.properties.template?.templateInfo?.name ||
      this.properties.template?.name ||
      this.drawSettings.displayName ||
      this.constructor.name;

    this.displayName = displayName;

    const shortDescription =
      this.properties.template?.templateInfo?.description ||
      this.properties.template?.shortDescription ||
      this.drawSettings.shortDescription ||
      this.drawSettings.componentDescription ||
      '';
    componentName.innerHTML = this.properties.template ? 'T:' + displayName : displayName;
    //componentName.innerHTML = '&nbsp;';

    div.appendChild(componentName);

    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';

    const iconCss = this.drawSettings.iconCSSClass || '';

    if (iconCss.startsWith('<svg')) {
      const color = this.drawSettings.color || '#000';
      const svg = iconCss.replace(/<path/g, `<path `);
      titleBar.innerHTML = `<div class="flex flex-row items-center gap-1 title-bar-top">
          <span class="icon w-6 h-6">${svg}</span>
          <span class="title">${this.title}</span>
        </div>
        <span class="description">${this.description}</span>
      `;
      const allPathes = titleBar.querySelectorAll('path');
      const pathFill = [...allPathes].find(
        (p) => p.getAttribute('fill') && p.getAttribute('fill') !== 'none',
      );
      if (!pathFill) {
        allPathes.forEach((p) => p.setAttribute('fill', color));
      }
    } else {
      titleBar.innerHTML = `<div class="flex flex-row items-center gap-1 title-bar-top">
        <span class="icon ${iconCss} h-full"></span>
        <span class="title font-semibold">${this.title}</span>
      </div>
      <span class="description">${this.description}</span>
      `;
    }
    titleBar.setAttribute('smt-name', this.constructor.name);

    const title: HTMLElement = titleBar.querySelector('.title');
    const description: HTMLElement = titleBar.querySelector('.description');
    // Add cursor style
    title.style.cursor = 'default';
    description.style.cursor = 'default';

    div.appendChild(titleBar);
    setTimeout(() => {
      // Wait for the titleBar to be added to the DOM
      this.addDebugButton();
    }, 500);

    /**
     * Handles click events for title and description (clicking on contenteditable and non-contenteditable area)
     * @param event Mouse click event
     * @param div Parent div element
     */
    const handleComponentElementClick = (event: MouseEvent, div: HTMLElement) => {
      // Type guard to ensure event.target is HTMLElement
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      // Handle edit mode
      if (target.hasAttribute('contenteditable')) {
        event.stopPropagation();
        return;
      }

      // Handle selection when not in edit mode and no modifier keys
      if (!event.ctrlKey && !event.metaKey) {
        // Reset all components to default state
        this.workspace.refreshComponentSelection();
        openSettingsSidebar(event);
      }

      div.classList.toggle('selected');
      div.classList.remove('unselected');

      const unSelectedComponents = document.querySelectorAll(
        '#workspace-container .component:not(.selected)',
      );
      unSelectedComponents.forEach((component) => component.classList.add('unselected'));

      updateDebugControlsOnSelection();
    };

    // Add click handlers using the shared function
    title.addEventListener('click', (event) => handleComponentElementClick(event, div));
    description.addEventListener('click', (event) => handleComponentElementClick(event, div));

    setTimeout(() => {
      makeInlineEditable(title, {
        callback: (value) => {
          if (!value) value = displayName || '';
          title.querySelector('.text').textContent = value;
          this.title = value;
          this.aiTitle = ''; // Need to reset AI title on manual update

          // Dispatch title change event for search tracking
          document.dispatchEvent(
            new CustomEvent('componentTitleChanged', {
              detail: { componentId: this.uid },
            }),
          );

          this.workspace.saveAgent();
        },
        editOnClick: false,
        showButtons: true,
      });
      makeInlineEditable(description, {
        callback: (value) => {
          if (!value) value = '';
          description.querySelector('.text').textContent = value;
          this.description = value;

          // Dispatch description change event for search tracking
          document.dispatchEvent(
            new CustomEvent('componentDescriptionChanged', {
              detail: { componentId: this.uid },
            }),
          );

          this.workspace.saveAgent();
        },
        editOnClick: false,
        showButtons: true,
      });
    }, 500);

    // Add truncate class to the text element after it's created by makeInlineEditable
    setTimeout(() => {
      const textElement = title.querySelector('.text');
      if (textElement) {
        textElement.classList.add('truncate');
      }
    }, 550);
    const debugBar = document.createElement('div');
    debugBar.className = `debug-bar cursor-pointer px-[10px] mx-auto text-white variant_2 rounded-lg ${
      this.isFunctionalComponent() ? 'mt-[10px]' : ''
    }`;
    div.appendChild(debugBar);

    debugBar.addEventListener('click', (event) => {
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Highlight the component if the user clicks on the debug bar
      this.workspace.refreshComponentSelection(div);
    });

    const debugInfo = document.createElement('div');
    debugInfo.className = 'debug-info hidden';
    debugBar.appendChild(debugInfo);

    const debugLogBtn = document.createElement('button');
    debugLogBtn.innerHTML = `<span class="mif-search icon"></span> Log`;
    debugLogBtn.className = 'btn-debug-log button primary mini outline hidden';
    debugLogBtn.onclick = (event) => {
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Highlight the component on click of the button
      this.workspace.refreshComponentSelection(div);

      const dbgBox = this.workspace.domElement.querySelector(`.debug-box[rel="${this._uid}"]`);
      dbgBox?.classList?.toggle('hidden');
      if (!dbgBox.classList.contains('hidden')) {
        if (!dbgBox['_connection'] && !dbgBox.classList.contains('hidden')) {
          const con: any = workspace.jsPlumbInstance.connect({
            source: dbgBox.querySelector('h2'),
            target: debugBar,
            detachable: false,
            cssClass: 'exclude-panzoom z-100',
            anchors: ['Continuous', 'Left'],
          });

          con.setPaintStyle({
            stroke: '#7d7c96',
            strokeWidth: 1,
            dashstyle: '4 3',
          });
          con.removeAllOverlays();

          con.endpoints[0]._domElement = dbgBox;
          con.endpoints[1]._domElement = debugBar;
          dbgBox['_connection'] = con;
        }
        dbgBox['_connection'].canvas.classList.remove('hidden');
      } else {
        dbgBox['_connection'].canvas.classList.add('hidden');
      }
      //debugInfo.classList.toggle('hidden');
    };
    debugBar.appendChild(debugLogBtn);

    //Agent Weaver Auto Fix feature
    const fixWithAIButton = document.createElement('button');
    fixWithAIButton.innerHTML = ` <i class="fa-solid fa-wand-magic-sparkles"></i> Fix with AI`;
    fixWithAIButton.className = 'btn-fix-with-ai button primary mini outline hidden';
    fixWithAIButton.onclick = async (event) => {
      event.stopPropagation();

      // Highlight the component on click of the button
      this.workspace.refreshComponentSelection(div);

      const weaverTab = document.getElementById('builder-button');
      if (!weaverTab) {
        errorToast('Agent Weaver is not enabled');
        return;
      }
      const weaverTextArea: HTMLTextAreaElement = document.getElementById(
        'agentMessageInput',
      ) as HTMLTextAreaElement;
      const weaverSendButton = document.getElementById('agentSendButton') as HTMLButtonElement;
      const dbgBoxContent =
        this.workspace.domElement.querySelector(`.debug-box[rel="${this._uid}"] .dbg-log`)
          ?.textContent || '';
      const errorMessage = fixWithAIButton.getAttribute('data-error') || '';

      const inputEndpoints = this.domElement.querySelectorAll('.input-container .endpoint');
      let inputValues = '';

      //constructing meaningful inputs object for weaver
      for (let e of inputEndpoints) {
        const name = (e.querySelector('span.name') as HTMLElement).innerText;
        const dbgOutputArea = e.querySelector('div.dbg-output textarea.dbg') as HTMLTextAreaElement;
        let value = dbgOutputArea ? dbgOutputArea?.value : '';
        let jsonValue;
        try {
          jsonValue = parseEndpointJson(value);
          jsonValue = recursiveTruncateLongJsonValues(jsonValue);
          if (Array.isArray(jsonValue) && jsonValue.length > 3) {
            jsonValue = jsonValue.slice(0, 3);
            jsonValue.push('...(truncated to 3 items)');
          }
          /*
          for (let key in jsonValue) {
            if (typeof jsonValue[key] === 'object') {
              jsonValue[key] = JSON.stringify(jsonValue[key]);
              if (jsonValue[key].length > 100) {
                jsonValue[key] = jsonValue[key].substring(0, 100) + '...(long content truncated)';
              }

              continue;
            }

            if (typeof jsonValue[key] === 'string') {
              if (jsonValue[key].length > 100) {
                jsonValue[key] = jsonValue[key].substring(0, 100) + '...(long content truncated)';
              }
              continue;
            }
          }
            */

          inputValues += `${name}: ${JSON.stringify(jsonValue)}\n`;

          //escape html entities
          inputValues = inputValues
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        } catch (e) {
          if (value.length > 300) {
            value = value.substring(0, 300) + '...(long content truncated)';
          }
          inputValues += `${name}: ${value}\n`;
        }
      }
      if (inputValues) {
        inputValues = `===\nReceived Inputs:\n${inputValues}\n\n`;
      }

      const weaverPrompt = `Component With ID=${this._uid} has a runtime error:
      ${errorMessage.substring(0, 500)}

      ${inputValues}
      ####

      \nPlease fix the issue, or explain it if you can't fix it`;

      //${dbgBoxContent.slice(-500)}

      console.log('Weaver Error fix prompt: ', weaverPrompt);

      triggerFixWithAIBtn({ weaverPrompt, componentId: this._uid });
    };
    debugBar.appendChild(fixWithAIButton);

    const inputsControl = document.createElement('div');
    inputsControl.className = 'ep-control inputs px-2';
    inputsControl.innerHTML = `<span>${
      this.drawSettings.addInputButtonLabel || this.drawSettings.addInputButton
    }</span>`;
    div.appendChild(inputsControl);

    if (this.drawSettings.addInputButton) {
      const addInputButton = document.createElement('button');
      addInputButton.innerHTML = '+';
      //addInputButton.innerHTML = this.drawSettings.addInputButton;
      inputsControl.innerHTML = '';
      addInputButton.className =
        'btn-add-endpoint button mini w-6 h-6 bg-smythos-blue-500 text-white rounded';
      inputsControl.appendChild(addInputButton);
      const spanLabel = document.createElement('span');
      spanLabel.innerHTML =
        this.drawSettings.addInputButtonLabel || this.drawSettings.addInputButton;
      inputsControl.appendChild(spanLabel);
      //buttonContainer.appendChild(addInputButton);
      addInputButton.onclick = (event) => {
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.addInputDialog();
      };
    }

    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    div.appendChild(inputContainer);

    const outputsControl = document.createElement('div');
    outputsControl.className = 'ep-control outputs px-2';
    outputsControl.innerHTML = `<span>${
      this.drawSettings.addOutputButtonLabel || this.drawSettings.addOutputButton
    }</span>`;
    div.appendChild(outputsControl);

    if (this.drawSettings.addOutputButton) {
      const addOutputButton = document.createElement('button');
      addOutputButton.innerHTML = '+';
      //addOutputButton.innerHTML = this.drawSettings.addOutputButton;
      outputsControl.innerHTML = '';
      addOutputButton.className =
        'btn-add-endpoint button mini w-6 h-6 bg-smythos-blue-500 text-white rounded';
      outputsControl.appendChild(addOutputButton);

      const spanLabel = document.createElement('span');
      spanLabel.innerHTML =
        this.drawSettings.addOutputButtonLabel || this.drawSettings.addOutputButton;
      outputsControl.appendChild(spanLabel);

      //buttonContainer.appendChild(addOutputButton);
      addOutputButton.onclick = (event) => {
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.addOutputDialog();
      };
    }

    const outputContainer = document.createElement('div');
    outputContainer.className = 'output-container';
    div.appendChild(outputContainer);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container messages-container';
    buttonContainer.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    div.appendChild(buttonContainer);

    const rightSideButtonContainer = document.createElement('div');
    rightSideButtonContainer.className =
      'right-side-button-container absolute right-0 flex transition-opacity opacity-0 group-hover:opacity-100';

    // Add delete button with tooltip
    const deleteButton = document.createElement('button');
    deleteButton.className = 'w-6 h-6 rounded del-btn relative group/delete';
    deleteButton.innerHTML =
      '<i class="fas fa-trash text-[#757575] text-xs hover:text-[#aaa]"></i>';
    deleteButton.onclick = (event) => {
      // Prevent the event from propagating to the component
      event.stopPropagation();
      component.delete(false);
    };
    const deleteTooltip = document.createElement('div');
    deleteTooltip.className =
      'absolute left-[-20px] z-10 inline-block px-3 py-2 w-max text-sm font-medium text-white bg-gray-950 rounded-lg shadow-sm tooltip dark:bg-gray-700 opacity-0 group-hover/delete:opacity-100 transition-opacity duration-300 bottom-full right-0 mb-2 whitespace-nowrap pointer-events-none';
    deleteTooltip.innerText = 'Delete';
    deleteButton.appendChild(deleteTooltip);
    rightSideButtonContainer.appendChild(deleteButton);

    const tplDocPath = component.properties?.template?.templateInfo?.docPath || '/not-set';
    const docUrl = component.properties?.template
      ? component.workspace.serverData.docUrl + tplDocPath
      : component.docUrl;

    // Add help button with tooltip
    const helpButton = document.createElement('button');
    helpButton.className = 'w-6 h-6 rounded action-help relative group/help';
    helpButton.innerHTML =
      '<span class="font-bold text-lg text-[#757575] hover:text-[#aaa]">?</span>';
    helpButton.onclick = (event) => {
      // Prevent the event from propagating to the component
      event.stopPropagation();
      window.open(docUrl, '_blank');
    };
    if (component.properties?.template && !component.properties?.template?.templateInfo?.docPath)
      helpButton.classList.add('hidden');

    const helpTooltip = document.createElement('div');
    helpTooltip.className =
      'absolute left-[-15px] z-10 inline-block px-3 py-2 w-max text-sm font-medium text-white bg-gray-950 rounded-lg shadow-sm tooltip dark:bg-gray-700 opacity-0 group-hover/help:opacity-100 transition-opacity duration-300 bottom-full right-0 mb-2 whitespace-nowrap pointer-events-none';
    helpTooltip.innerText = 'Help';
    helpButton.appendChild(helpTooltip);
    rightSideButtonContainer.appendChild(helpButton);

    // Add settings button with tooltip
    const settingsButton = document.createElement('button');
    settingsButton.className = 'w-6 h-6 rounded relative group/settings';
    settingsButton.innerHTML =
      '<i class="fas fa-cog text-[#757575] text-xs hover:text-[#aaa]"></i>';
    const settingsTooltip = document.createElement('div');
    settingsTooltip.className =
      'absolute left-[-25px] z-10 inline-block px-3 py-2 w-max text-sm font-medium text-white bg-gray-950 rounded-lg shadow-sm tooltip dark:bg-gray-700 opacity-0 group-hover/settings:opacity-100 transition-opacity duration-300 bottom-full right-0 mb-2 whitespace-nowrap pointer-events-none';

    // only show settings button if showSettings is not set to false
    if (this.drawSettings?.showSettings !== false) {
      rightSideButtonContainer.appendChild(settingsButton);
    }
    settingsTooltip.innerText = 'Settings';
    settingsButton.appendChild(settingsTooltip);
    rightSideButtonContainer.appendChild(settingsButton);
    div.appendChild(rightSideButtonContainer);
    const loadingIcon = document.createElement('div');
    loadingIcon.className = 'loading-icon';
    loadingIcon.innerHTML = `
      <svg
        aria-hidden="true"
        class="inline text-gray-200 animate-spin dark:text-gray-600 fill-primary-100 w-8 h-8"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
    `;
    loadingIcon.classList.add('hidden');
    div.appendChild(loadingIcon);
    const overlay = document.createElement('div');
    overlay.className = 'cpt-overlay';
    overlay.innerHTML = `<div class="content"></div><span class="dbg-loader"><svg height="48px" width="64px">
    <polyline id="front" points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"></polyline>
  </svg></span>`;
    div.appendChild(overlay);
    overlay.style.display = 'none';

    const openSettingsSidebar = async (event) => {
      destroyCanvasContextMenu();
      //if (this.workspace?.locked) return false;
      if (this.domElement.classList.contains('dragging')) return;
      if (this.domElement.classList.contains('resizing')) return;
      if (title.hasAttribute('contenteditable') && event.target == title) return;
      if (description.hasAttribute('contenteditable') && event.target == description) return;

      if ((<any>event.target)?.classList?.contains('dbg')) return;
      // if (event.ctrlKey) {
      //     this.domElement.classList.toggle('selected');
      //     event.stopPropagation();
      //     event.stopImmediatePropagation();
      //     return;
      // }

      //if a debug element is visible, ignore component click to prevent conflicting events.
      //this also prevents accidental settings opening if the user is just checking debug outputs
      const dbgInfo = div.querySelector('.debug-info');
      if (!dbgInfo.classList.contains('hidden')) return;
      const dbgElements = [...div.querySelectorAll('.dbg-element')].filter((e) =>
        e.checkVisibility?.(),
      ); // checkVisibility is not available in safari <= 17.3
      if (dbgElements.length > 0) return;

      if (Component.curComponentSettings && Component.curComponentSettings !== this) {
        const hasChanges = Component.curComponentSettings.settingsChanged();
        if (hasChanges) {
          // If another component settings is open with changes, prompt to discard
          const discard = await confirm(
            'You have unsaved changes',
            'Are you sure you want to close this without saving?',
            {
              btnYesLabel: 'Discard Changes',
              btnYesClass: 'rounded-lg px-8',
              btnNoClass: 'hidden',
            },
          );
          if (!discard) return;
        }
      }

      if (this.settingsOpen) {
        this.closeSettings();
      } else {
        this.editSettings();
      }
    };

    div.addEventListener('click', (event) => {
      if (event.target !== settingsButton) {
        if (!event.ctrlKey && !event.metaKey) {
          // Reset all components to default state
          this.workspace.refreshComponentSelection();
          openSettingsSidebar(event);
        }

        this.domElement.classList.toggle('selected');
        this.domElement.classList.remove('unselected');

        // Lower the opacity of all unselected components, to show the selected component prominently
        const unSelectedComponents = document.querySelectorAll(
          '#workspace-container .component:not(.selected)',
        );
        for (let component of unSelectedComponents) {
          component.classList.add('unselected');
        }

        updateDebugControlsOnSelection();
      }
    });

    settingsButton.addEventListener('click', (event) => {
      // Prevent the event from propagating to the component
      event.stopPropagation();
      openSettingsSidebar(event);
      this.workspace.refreshComponentSelection(this.domElement);
    });

    //this.settingsContainer = settingsContainer;
    this.inputContainer = inputContainer;
    this.outputContainer = outputContainer;
    this.buttonContainer = buttonContainer;
    //this.closeButton = deleteButton;
    this.overlay = overlay;
    this.loadingIcon = loadingIcon;

    //deleteButton.onclick = this.delete.bind(this);

    outputEndpoints.forEach((outputEP, i) => {
      this.addOutput(outputContainer, outputEP);
    });

    inputEndpoints.forEach((inputEP, i) => {
      this.addInput(inputContainer, inputEP);
    });

    interact(div)
      .draggable({
        // Use the handle for dragging
        allowFrom: '.component',
        ignoreFrom: '.dbg-element,.debug-info',
        listeners: {
          start(event) {
            if (workspace?.locked) return false;
            component.domElement.classList.add('dragging');
            component.domElement.style.cursor = 'grabbing';
          },
          move(event) {
            if (workspace?.locked) return false;
            if (!event.target) return;
            let targets = [event.target];

            if (!event.target.classList.contains('selected')) {
              document
                .querySelectorAll('.component.selected')
                .forEach((c) => c.classList.remove('selected'));
            } else {
              targets = [...document.querySelectorAll('.component.selected')];
            }

            for (let target of targets) {
              // Get the current top and left values, or default to 0 if they're not set
              const x = (parseFloat(target.style.left) || 0) + event.dx / workspace.scale;
              const y = (parseFloat(target.style.top) || 0) + event.dy / workspace.scale;

              // Update the top and left values
              target.style.left = x + 'px';
              target.style.top = y + 'px';

              target._control.repaint();
            }
          },
          end(event) {
            if (workspace?.locked) return false;

            component.repaint(true);
            component.domElement.style.cursor = '';
            setTimeout(() => {
              component.workspace.saveAgent();
              component.domElement.classList.remove('dragging');
            }, 200);
          },
        },
        modifiers: [
          // Restrict to parent container
          // interact.modifiers.restrict({
          //     restriction: workspace.domElement,
          //     endOnly: true,
          //     elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
          // }),
        ],
        inertia: true,
      })
      .styleCursor(false);

    // $(titleBar.querySelector('.svg-icon')).css('background-color', this.drawSettings.color);
    $(titleBar.querySelector('.svg-icon')).css('background-color', '#000');
    $(titleBar.querySelector('.tpl-fa-icon')).css('color', this.drawSettings.color);

    //$(buttonContainer).css('background-color', this.drawSettings.color);

    this.domElement = div;

    this.workspace.domElement.appendChild(div);

    //prevent event propagation when clicking on the component
    div.addEventListener('mousedown', function (e) {
      e.stopPropagation();
    });
    div.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    interact(div).resizable({
      edges: { left: false, right: true, bottom: false, top: false },
      listeners: {
        start(event) {
          if (workspace?.locked) return false;
          const pinnedElements = [...component.domElement.querySelectorAll('.pinned')];

          if (pinnedElements.length > 0) return false;
          component.domElement.classList.add('resizing');
        },
        move(event) {
          if (workspace?.locked) return false;
          const pinnedElements = [...component.domElement.querySelectorAll('.pinned')];

          if (pinnedElements.length > 0) return false;

          const target = event.target;
          target.style.width = event.rect.width / workspace.scale + 'px';
          component.repaint();
        },
        end(event) {
          if (workspace?.locked) return false;
          const pinnedElements = [...component.domElement.querySelectorAll('.pinned')];

          if (pinnedElements.length > 0) return false;

          component.repaint();
          setTimeout(() => {
            component.workspace.saveAgent();
            component.domElement.classList.remove('resizing');
          }, 200);
        },
      },
      modifiers: [
        // keep the edges inside the parent
        // interact.modifiers.restrictEdges({
        //   outer: 'parent',
        // }),

        // minimum size
        interact.modifiers.restrictSize({
          min: { width: 100, height: 50 },
        }),
      ],

      inertia: false,
    });

    //this.redrawSettings();
    div['_control'] = this;

    this.checkSettings();

    if (triggerSettings) {
      setTimeout(() => {
        this.workspace.saveAgent();
      }, 300);

      if (!this.properties.template && this.drawSettings.showSettings) {
        this.editSettings();
      }
    }

    this.emit('componentCreated', this);

    return div;
  }

  public async delete(force = true, saveAgent = true) {
    const jsPlumbInstance = this.workspace.jsPlumbInstance;
    const domElement = this.domElement;
    const shouldDelete =
      force ||
      (await confirm(
        'Are you sure you want to delete this component?',
        'This action cannot be undone. Deleting will remove the component permanently.',
        {
          btnYesLabel: 'Delete',
          btnNoLabel: 'Cancel',
          // btnYesClass: 'bg-smyth-red-500 border-smyth-red-500 rounded-lg px-8',
          btnYesType: 'danger',
          btnNoClass: 'hidden',
        },
      ));
    if (shouldDelete) {
      if (this.settingsOpen) {
        this.closeSettings(true);
      }
      this.showOverlay('Deleting...');
      this.emit('beforeDelete', this);
      const cleaned = await this.clean();
      if (!cleaned) {
        this.hideOverlay();
        return;
      }
      // Get all connections where this component is the source

      const endpoints = [
        ...domElement.querySelectorAll('.output-endpoint'),
        ...domElement.querySelectorAll('.input-endpoint'),
        ...domElement.querySelectorAll('.agent-card-connection'),
      ]
        .map((e) => jsPlumbInstance.getEndpoints(e))
        .flat();
      const toDelete = [];
      for (let endpoint of endpoints) {
        toDelete.push(endpoint);
      }
      // Detach all connections
      toDelete.forEach((endpoint) => jsPlumbInstance.deleteEndpoint(endpoint));

      // Remove the component
      this.destroy();

      // Remove the debug info box from the workspace
      const dbgBox = document.querySelector(`.debug-box[rel="${this.uid}"]`);

      if (dbgBox) {
        // Delete the connections from the debug box
        const connection = dbgBox['_connection'];
        if (connection) {
          jsPlumbInstance.deleteConnection(connection);
        }
        dbgBox.remove();
      }
      // Reset all components to default state, after deleting the component
      document
        .querySelectorAll('.component')
        .forEach((c) => c.classList.remove('selected', 'unselected'));
      delete ComponentList[this.uid];
      if (saveAgent) this.workspace.saveAgent();
      this.hideOverlay();
    }
  }

  public async addInputDialog() {
    const valConfig: Record<string, any> = {
      name: {
        type: 'text',
        label: 'Input Name',
        class: 'stg-input stg-name',
        value: '',
        required: true,
        validate: 'required custom=isValidInputName',
        validateMessage: 'Name is required and can only contain letters, numbers, and underscores.',
        attributes: { placeholder: 'E.g. Username' },
      },
      ...getTypeFields({ compName: this.constructor.name, values: { type: 'Any' } }),
      additionalOptionsLabel: {
        type: 'div',
        html: '<small class="field-hint">Choose whether this input is mandatory or optional. You can also assign a color label to this input for better organization or categorization.</small>',
        section: 'Advanced_Options',
        formControlCls: 'bg-white',
      },

      /* optional: {
        type: 'checkbox',
        class: 'w-28 pt-8 stg-input stg-optional',
        value: false,
        section: 'Advanced_Options',
      }, */
      color: getColorField(`${WorkspaceDefaults.conEndColor}`),
      optional: getOptionalField(),
      // html: { type: 'div', html: '<hr />' },
    };

    //if (this.drawSettings.hasInputsDescription) valConfig.description = { type: 'textarea', value: '' };
    for (let entry in this.inputSettings) {
      const prop = this.inputSettings[entry];
      if (prop) {
        valConfig[entry] = { ...prop.editConfig, value: prop.editConfig?.defaultVal || '' };
      }
    }

    const dialogTitle =
      this.constructor.name === COMP_NAMES.apiEndpoint
        ? `<span class="text-xl agent-skill-dialog-title">Add Skill Input</span>`
        : '<span class="text-xl">Add Input</span>';

    // Move description inside Advanced Options section
    if (valConfig?.description) {
      valConfig.description.section = 'Advanced_Options';
    }

    const orderedValConfig = getOrderedValConfig(valConfig, [
      'name',
      'type',
      'description',
      'additionalOptionsLabel',
      'optional',
      'color',
    ]);

    //const newValues: any = await editValues({ title: 'Add input', entriesObject: valConfig });
    const newValues: any = await this.inputEditor({
      title: dialogTitle,
      fields: orderedValConfig,
      onDOMReady: (dialog) => {
        const nameElm = dialog.querySelector('#name') as HTMLInputElement;

        const titleElm = dialog.querySelector('.agent-skill-dialog-title') as HTMLSpanElement;
        const buttonElm = document.querySelector('#add-skill-input-info-icon');

        if (titleElm && buttonElm) {
          buttonElm.classList.remove('hidden');
          titleElm.appendChild(buttonElm);
        }

        // requires a tiny delay to make sure the input is focused
        delay(50).then(() => focusField(nameElm));
      },
      contentClasses: 'min-h-[425px]',
      dialogClasses: 'dialog-center rounded-[18px] p-2 pb-3',
      showCloseButton: true,
    });
    if (newValues?.name) {
      const inputDiv: any = await this.addInput(this.inputContainer, newValues.name, newValues);

      if (newValues.optional) {
        inputDiv.setAttribute('smt-optional', newValues.optional);
        if (newValues.optional) inputDiv.classList.add('optional');
        else inputDiv.classList.remove('optional');
      }

      if (inputDiv && newValues.color) {
        inputDiv.setAttribute('smt-color', newValues.color);
        inputDiv.querySelector('.ep').style.backgroundColor =
          newValues.color || `${WorkspaceDefaults.conEndColor}`;

        inputDiv.querySelector('.name').style.borderImage =
          `linear-gradient(90deg, transparent 20%, ${newValues.color}) 1`;

        const endpoint: any = inputDiv.endpoint;
        if (endpoint && endpoint['connections']) {
          for (let connection of endpoint['connections'])
            this.workspace.updateConnectionColors(connection);
        }
      }

      inputDiv?.setAttribute('smt-type', newValues?.type || '');
      inputDiv?.setAttribute('smt-friendly-input-type', newValues?.friendlyInputType || '');
      inputDiv?.setAttribute('smt-core-input-type', newValues?.coreInputType || '');

      for (let entry in this.inputSettings) {
        const prop = this.inputSettings[entry];
        if (inputDiv && prop) {
          const value = inputDiv.getAttribute(`smt-${entry}`);
          if (newValues[entry] !== value && newValues[entry] != undefined) {
            inputDiv.setAttribute(`smt-${entry}`, newValues[entry]);
          }
        }
      }

      this.repaint();
      this.workspace.saveAgent();
    }
  }

  public async addOutputDialog() {
    const valConfig: any = {
      name: {
        type: 'text',
        label: 'Output Name',
        class: 'stg-input stg-name',
        value: '',
        validate: 'required custom=isValidOutputName',
        validateMessage: `Name is required and allow JSON path notation, e.g., Response.text, items[0], data['key'], etc.`,
      },
      //description: null,
      additionalOptionsLabel: {
        type: 'div',
        html: '<small class="field-hint">You can also assign a color label to this input for better organization or categorization.</small>',
        section: 'Advanced_Options',
        formControlCls: 'bg-white',
      },
      color: getColorField(`${WorkspaceDefaults.conStartColor}`),
    };
    //if (this.drawSettings.hasOutputsDescription) valConfig.description = { type: 'textarea', value: '' };
    for (let entry in this.outputSettings) {
      const prop = this.outputSettings[entry];
      if (prop) {
        valConfig[entry] = { ...prop.editConfig, value: prop.editConfig?.defaultVal || '' };
      }
    }

    // Move description inside Advanced Options section
    if (valConfig?.description) {
      valConfig.description.section = 'Advanced_Options';
    }

    const dialogTitle =
      this.constructor.name === COMP_NAMES.apiEndpoint
        ? `<span class="text-xl agent-skill-dialog-title">Add Skill Output</span>`
        : '<span class="text-xl">Add Output</span>';

    const orderedValConfig = getOrderedValConfig(valConfig, [
      'description',
      'expression',
      'additionalOptionsLabel',
      'color',
    ]);

    //const newValues: any = await editValues({ title: 'Add Output', entriesObject: valConfig });
    const newValues: any = await this.inputEditor({
      title: dialogTitle,
      fields: orderedValConfig,
      onDOMReady: (dialog) => {
        const nameElm = dialog.querySelector('#name') as HTMLInputElement;

        const titleElm = dialog.querySelector('.agent-skill-dialog-title') as HTMLSpanElement;
        const buttonElm = document.querySelector('#add-skill-input-info-icon');

        if (titleElm && buttonElm) {
          buttonElm.classList.remove('hidden');
          titleElm.appendChild(buttonElm);
        }

        // requires a tiny delay to make sure the input is focused
        delay(50).then(() => focusField(nameElm));
      },
      contentClasses: 'min-h-[335px]',
      dialogClasses: 'dialog-center rounded-[18px] p-2 pb-3',
      showCloseButton: true,
    });
    if (newValues?.name) {
      const outputDiv: any = await this.addOutput(this.outputContainer, newValues.name, newValues);

      if (outputDiv && newValues.color) {
        outputDiv.setAttribute('smt-color', newValues.color);
        outputDiv.querySelector('.ep').style.backgroundColor =
          newValues.color || `${WorkspaceDefaults.conStartColor}`;
        outputDiv.querySelector('.name').style.borderImage =
          `linear-gradient(90deg, transparent 20%, ${newValues.color}) 1`;
        const endpoint: any = outputDiv.endpoint;
        if (endpoint && endpoint['connections']) {
          for (let connection of endpoint['connections'])
            this.workspace.updateConnectionColors(connection);
        }
      }

      for (let entry in this.outputSettings) {
        const prop = this.outputSettings[entry];
        if (outputDiv && prop) {
          const value = outputDiv.getAttribute(`smt-${entry}`);
          if (newValues[entry] !== value && newValues[entry] != undefined) {
            outputDiv.setAttribute(`smt-${entry}`, newValues[entry]);
          }
        }
      }

      this.repaint();
    }
  }

  public async openDebugDialog(
    event,
    operation: 'step' | 'run' = 'step',
    prefillValues?: Record<string, any>,
  ) {
    PostHog.track('app_debug_inject_click', {});
    event.stopPropagation();
    event.stopImmediatePropagation();
    const debugBtn = this.domElement.querySelector('.btn-debug');
    const inputEndpoints = [...this.domElement.querySelectorAll('.input-endpoint')].map(
      (inputEP: HTMLElement) => ({
        name: inputEP.getAttribute('smt-name'),
        type:
          inputEP.getAttribute('smt-isfile') == 'true' ||
          BINARY_INPUT_TYPES.includes(inputEP.getAttribute('smt-type'))
            ? 'file'
            : 'text',
      }),
    ); // [BINARY INPUT MIGRATION]
    const outputEndpoints = [...this.domElement.querySelectorAll('.output-endpoint')].map(
      (outputEP: HTMLElement) => ({
        name: outputEP.getAttribute('smt-name'),
      }),
    );

    return new Promise((resolve, reject) => {
      this.workspace.debugger.createDebugInjectDialog(
        this,
        inputEndpoints,
        outputEndpoints,
        async (data) => {
          const debugSessionID = this.workspace.debugger.getDebugSessionID();
          if (debugSessionID) return null;

          updateDebugControls({
            step: { enable: false },
            run:
              operation === 'run'
                ? { enable: true, icon: 'mif-pause', tooltipText: 'Pause' }
                : { enable: false },
            stop: { enable: operation === 'run' ? false : true },
            attach: { enable: false },
          });

          const agent = this.workspace.agent;

          try {
            this.workspace.domElement.classList.add('debugging');

            debugBtn.classList.add('active');

            await this.workspace.debugger.injectComponentDebugInfo(agent.id, this._uid, data);
            const stepResponse = await this.workspace.debugger.readDebugStep(agent.id);

            resolve({ status: 'success' });
            return stepResponse;
          } catch (error) {
            if (error) {
              /*
                  We don't get 413 status when the error returns from the proxy server (nginx).
                  Typically fetch request fails due to CORS issue. (The CORS configuration is set up at the application level. Making it work at the nginx level requires additional effort.)
              */
              if (error?.status == 413) errorToast('Payload Too Large');
            }

            errorToast('Something went wrong, please try again later!');
            reject({ status: 'error' });
            return { errorOccurred: true };
          } finally {
            enableAllDebugControls();
          }
        },
        operation,
        prefillValues,
      );
    });
  }

  public exportTemplate() {
    return null;
  }

  public export() {
    const control: Component = this;
    const domComponent = this.domElement;

    return {
      id: domComponent.id,
      name: domComponent.querySelector('.title-bar').getAttribute('smt-name'), // added name to export
      outputs: [...domComponent.querySelectorAll('.output-endpoint')].map(
        (outputDomElement: any, index) => ({
          name: outputDomElement.getAttribute('smt-name'),
          color: outputDomElement.getAttribute('smt-color'),
          //description: c.getAttribute('smt-description'),
          ...workspace.extractComponentOutputProps(domComponent, outputDomElement),
          index,
          uuid: outputDomElement.endpoint?.getUuid(),
          default: control.properties.defaultOutputs.includes(
            outputDomElement.getAttribute('smt-name'),
          ),
        }),
      ),
      inputs: [...domComponent.querySelectorAll('.input-endpoint')].map(
        (inputDomElement: any, index) => ({
          name: inputDomElement.getAttribute('smt-name'),
          type: inputDomElement.getAttribute('smt-type'), // [INPUT DATA TYPE]
          friendlyInputType: inputDomElement.getAttribute('smt-friendly-input-type'),
          coreInputType: inputDomElement.getAttribute('smt-core-input-type'),
          color: inputDomElement.getAttribute('smt-color'),
          //description: r.getAttribute('smt-description'),
          optional: inputDomElement.getAttribute('smt-optional') === 'true' ? true : false,
          ...workspace.extractComponentInputProps(domComponent, inputDomElement),
          index,
          uuid: inputDomElement.endpoint?.getUuid(),
          default: control.properties.defaultInputs.includes(
            inputDomElement.getAttribute('smt-name'),
          ),
        }),
      ),
      data:
        typeof control.data === 'object' ? JSON.parse(JSON.stringify(control.data)) : control.data,
      top: domComponent.style.top,
      left: domComponent.style.left,
      width: domComponent.style.width,
      height: domComponent.style.height,
      displayName: control.drawSettings.displayName,
      title: control.title,
      aiTitle: control.aiTitle,
      description: control.description,
      template:
        typeof control.properties.template === 'object'
          ? JSON.parse(JSON.stringify(control.properties.template))
          : control.properties.template,
    };
  }

  protected async updateTitle() {
    const oldSettings: {
      prompt?: { value: string };
    } = this.settingsEntries;

    const form = document.querySelector('#right-sidebar form');
    const currentValues: {
      prompt?: string;
    } = readFormValues(form, oldSettings);

    const loader = createTypingLoader('Generating Title...');
    const titleElm = this.domElement.querySelector('.title-bar .title') as HTMLElement;
    const titleTextElm = titleElm.querySelector('.text') as HTMLElement;
    const editBtnElm = titleElm.querySelector('.btn-edit-inline') as HTMLElement;

    titleTextElm.style.display = 'none';
    editBtnElm.style.display = 'none';
    titleElm.appendChild(loader);

    try {
      const title = await this.generateTitle(currentValues?.prompt);

      if (title) {
        this.aiTitle = title;

        titleTextElm.textContent = title;
      }
    } finally {
      loader.remove();
      titleTextElm.style.display = 'inline';
      editBtnElm.style.display = 'inline-flex';
    }
  }

  protected async generateTitle(prompt: string) {
    if (!prompt || typeof prompt !== 'string') return;

    try {
      const res = await fetch('/api/page/builder/data/generate-component-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      const resJson = await res.json();

      if (!resJson?.success) throw new Error('Error generating title!');

      const title = resJson?.data;

      return title;
    } catch (error) {
      return '';
    }
  }
}

// TODO: We can move following function to a separate file later

// Reorganize the fields to ensure the fields are rendered in correct order in the form.
function getOrderedValConfig(valConfig: any, fieldsOrder: string[]) {
  const clonedValConfig = { ...valConfig }; // JSON.parse(JSON.stringify(valConfig)) will remove functions inside the events
  let orderedValConfig = {};

  for (let field of fieldsOrder) {
    if (clonedValConfig[field]) {
      orderedValConfig[field] = clonedValConfig[field];
      delete clonedValConfig[field];
    }
  }

  // Field those are absent in the fieldsOrder array are added to the end of the orderedValConfig object.
  orderedValConfig = { ...orderedValConfig, ...clonedValConfig };

  return orderedValConfig;
}

function getFriendlyInputTypeField({ value = '', label = '' }: { value?: string; label?: string }) {
  const options = [
    {
      value: 'Text',
      text: 'Text',
      classes: {
        check: 'svg-icon Text border-0 rounded-none w-6 h-6',
        caption: 'text-base',
      },
    },
    {
      value: 'Image',
      text: 'Image',
      classes: {
        check: 'svg-icon Image border-0 rounded-none w-6 h-6',
        caption: 'text-base',
      },
    },
    {
      value: 'Audio',
      text: 'Audio',
      classes: {
        check: 'svg-icon Audio border-0 rounded-none w-6 h-6',
        caption: 'text-base',
      },
    },
    {
      value: 'Video',
      text: 'Video',
      classes: {
        check: 'svg-icon Video border-0 rounded-none w-6 h-6',
        caption: 'text-base',
      },
    },
    {
      value: 'Others',
      text: 'Others',
      classes: {
        check: 'svg-icon Others border-0 rounded-none w-6 h-6',
        caption: 'text-base',
      },
    },
  ];

  for (let [index, option] of options.entries()) {
    option.classes['radio'] = option.value === value ? 'active' : '';
    options[index] = option;
  }

  delay(100).then(() => {
    if (value === 'Others') {
      const coreInputTypeWrapperElm = document.querySelector(
        `[data-field-name="coreInputType"]`,
      ) as HTMLDivElement;

      const typeElm = document.getElementById('type') as HTMLInputElement;
      coreInputTypeWrapperElm?.classList?.remove('hidden');

      const coreInputTypeElm = document.getElementById('coreInputType') as HTMLSelectElement;
      if (typeElm) typeElm.value = coreInputTypeElm?.value || 'Any';
    }
  });

  return {
    type: 'radio',
    label,
    class: 'stg-input stg-type',
    formControlCls: 'flex justify-between bg-white',
    fieldCls: 'border border-solid border-[#D9D9D9] rounded-lg p-3 h-auto',
    value,
    options,
    events: {
      change: (event) => {
        const target = event.target;
        const value = target.value;

        const coreInputTypeWrapperElm = document.querySelector(
          `[data-field-name="coreInputType"]`,
        ) as HTMLDivElement;

        const typeElm = document.getElementById('type') as HTMLInputElement;

        if (value === 'Others') {
          coreInputTypeWrapperElm?.classList?.remove('hidden');

          const coreInputTypeElm = document.getElementById('coreInputType') as HTMLSelectElement;
          if (typeElm) typeElm.value = coreInputTypeElm?.value || 'Any';
        } else {
          coreInputTypeWrapperElm?.classList?.add('hidden');
          if (typeElm) typeElm.value = value;
        }

        // Handle active state for radio buttons
        const radioElms = target.closest('.form-group').querySelectorAll('.radio');
        radioElms?.forEach((radio) => radio.classList.remove('active'));

        const radioElm = target.closest('.radio');
        if (radioElm) {
          radioElm.classList.add('active');
        }
      },
    },
  };
}

function getCoreInputTypeField({
  value = '',
  label = '',
  classes = '',
}: {
  value?: string;
  label?: string;
  classes?: string;
}) {
  const options = [
    {
      value: 'Any',
      text: 'Any',
    },
    {
      value: 'String',
      text: 'String',
    },
    {
      value: 'Number',
      text: 'Number (can include floating point)',
    },
    {
      value: 'Integer',
      text: 'Integer (without a fraction part)',
    },
    {
      value: 'Boolean',
      text: 'Boolean',
    },
    {
      value: 'Array',
      text: 'Array',
    },
    {
      value: 'Object',
      text: 'Object',
    },
    {
      value: 'Binary',
      text: 'Binary',
    },
    {
      value: 'Date',
      text: 'Date (ISO 8601 Standard)',
    },
  ];

  return {
    type: 'select',
    class: classes,
    label,
    value,
    options,
    events: {
      change: (event) => {
        const target = event.target;
        const value = target.value;
        const typeInputElm = document.getElementById('type') as HTMLInputElement;
        if (typeInputElm) typeInputElm.value = value;
      },
    },
  };
}

function getColorField(value = '') {
  return {
    type: 'color',
    class: 'w-44 stg-input stg-color stg-circle-color-picker',
    value,
    section: 'Advanced_Options',
    fieldsGroup: 'additionalOptions',
  };
}

function getOptionalField(value = false, readonly = false) {
  return {
    type: 'radio',
    label: '',
    value,
    section: 'Advanced_Options',
    class: 'w-2/4 stg-input stg-optional',
    fieldsGroup: 'additionalOptions',
    readonly,
    options: [
      {
        value: false,
        text: 'Required',
      },
      {
        value: true,
        text: 'Optional',
      },
    ],
  };
}

function getTypeFields({
  compName,
  values,
}: {
  compName: string;
  values: { friendlyInputType?: string; coreInputType?: string; type?: string };
}) {
  if (compName === COMP_NAMES.apiEndpoint) {
    return {
      friendlyInputType: getFriendlyInputTypeField({
        value: values.friendlyInputType,
        label: 'Input type',
      }),
      coreInputType: getCoreInputTypeField({
        value: values.coreInputType,
        classes: 'w-full h-12 hidden',
      }),
      type: {
        type: 'hidden',
        class: 'stg-input stg-type',
        value: values.type,
        attributes: { 'data-cls-option': 'option-input-type' },
      },
    };
  } else {
    return {
      coreInputType: getCoreInputTypeField({
        value: values.coreInputType,
        label: 'Input type',
        classes: 'w-full',
      }),
      type: {
        type: 'hidden',
        class: 'stg-input stg-type',
        value: values.type,
        attributes: { 'data-cls-option': 'option-input-type' },
      },
    };
  }
}

function addMissingKey({
  keyName,
  component,
  onSuccess,
  onError,
}: {
  keyName: string;
  component: Component;
  onSuccess: (saveKey: Record<string, any>) => void;
  onError: () => void;
}) {
  const fields = {
    keyName: {
      label: 'Name',
      type: 'text',
      class: 'w-2/5',
      value: keyName,
      readonly: true,
    },
    apiKey: {
      label: 'Key',
      type: 'textarea',
      fieldCls: 'max-h-64 min-h-[34px] h-[34px] px-3 py-1',
      class: 'w-3/5',
      validate: 'required maxlength=10000',
      validateMessage: 'API Key is required',
      value: '',
      autoSize: false,
      attributes: {
        placeholder: `Please enter your Key`,
      },
    },
  };

  const ADD_KEY_BTN_CLASS = '_add_missing_key_submit_btn';
  const MOCK_DATA_BTN_CLASS = '_mock_data_btn';

  const saveKey = async (fieldValues, dialog) => {
    const { keyName, apiKey } = fieldValues;

    const spinner = createSpinner('white', 'mr-2');
    const buttonElm = dialog.querySelector(`.${ADD_KEY_BTN_CLASS}`);
    buttonElm.textContent = 'Adding Key...';
    buttonElm.prepend(spinner);
    buttonElm.disabled = true;

    try {
      const scope = ['All'];
      const saveKey = await fetch(`${config.env.UI_SERVER}/api/page/builder/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyName,
          key: apiKey,
          scope,
        }),
      }).then((res) => res.json());

      closeTwDialog(dialog);

      onSuccess({
        [saveKey?.data?.keyId]: {
          name: keyName,
          scope,
        },
      });
    } catch (e) {
      onError();
    } finally {
      spinner.remove();
      buttonElm.disabled = false;
      buttonElm.textContent = 'Add Key';
    }
  };

  const setMockDataAction = {
    label: 'Skip for now and set mock data',
    cssClass: `underline hover:no-underline text-gray-500 ${MOCK_DATA_BTN_CLASS}`,
    callback: async (fieldValues, dialog) => {
      const getRandomString = (timestamp) =>
        (timestamp + Math.random()).toString(36).replace('.', '');
      const mockKey = `sos-mock-key-${getRandomString(Date.now())}-${getRandomString(123456789)}`;

      const keyField = dialog.querySelector('#apiKey');
      keyField.value = mockKey;

      await saveKey({ ...fieldValues, apiKey: mockKey }, dialog);

      // #region enable mock data
      PostHog.track('app_mock_screen_impression', {
        source: 'skip_and_set_mock_data',
      });
      await saveMockOutputs(component);
      MockDataToggleButtonState.turnOn(component);
      await toggleMockOutputPills(component);
      // #endregion
    },
  };

  const saveAction = {
    label: 'Continue',
    cssClass: `disabled:opacity-50 bg-v2-blue hover:bg-v2-blue/80 text-white cursor-pointer ml-auto mt-2 ${ADD_KEY_BTN_CLASS}`,
    requiresValidation: true,
    callback: saveKey,
  };

  twEditValuesWithCallback(
    {
      title: 'Configure API Key',
      fields,
      content: `<span class="text-xs text-gray-500 block mb-4">The component <span class="font-bold">${
        component?.title || ''
      }</span> requires an API key to function. Please retrieve your API key from the provider and securely store it in the SmythOS vault.</span>`,
      actions: [setMockDataAction, saveAction],
      onCloseClick: (_, dialog) => {
        closeTwDialog(dialog);
      },
      onDOMReady: async (dialog) => {
        // Replace the default width class (w-[340px]) with a custom width (w-40)
        // because the default width cannot be overridden by simply adding a new width class.
        const saveBtnElm = dialog.querySelector(`.${ADD_KEY_BTN_CLASS}`);
        saveBtnElm.classList.remove('w-[340px]');
        saveBtnElm.classList.add('w-40');

        // Override default styles for the mock data button
        const mockDataBtnElm = dialog.querySelector(`.${MOCK_DATA_BTN_CLASS}`);
        mockDataBtnElm?.classList.remove('w-[340px]');
        mockDataBtnElm?.classList.remove('text-white');
        mockDataBtnElm?.classList.remove('hover:opacity-75');
        mockDataBtnElm?.classList.add('auto');

        // Remove the default 'justify-center' class and add 'justify-between'
        const actionsWrapper = dialog.querySelector('.__actions');
        actionsWrapper?.classList.remove('justify-center');
        actionsWrapper?.classList.add('justify-between');
      },
    },
    'auto',
    'auto',
    'none',
    '672px',
    '672px',
  );
}

function formatKeyAsClassName(keyName: string) {
  return '_comp_message_' + keyName.replace(/\+/g, '_').replace(/\s+/g, '_').toLowerCase();
}

//#region Missing Key Click Handler
function missingKeyMessageClickHandler(keyName: string, event: Event) {
  addMissingKey({
    keyName,
    component: this,
    onSuccess: (data: Record<string, { name: string; scope: string[] }>) => {
      successToast('Key saved successfully');
      this?.clearComponentMessage(`.${formatKeyAsClassName(keyName)}`);

      updateVaultDataCache(data);

      // !DEPRECATED: Will be removed
      // this?.addComponentMessage(
      //   `You can manage your key (${keyName}) securely in the <span class="border-solid border-b">SmythOS Vault</span> whenever needed.`,
      //   'info pointer',
      //   () => {
      //     window.open('/vault', '_blank');
      //   },
      //   formatKeyAsClassName(keyName),
      // );

      // #region Find other components using the same key and revalidate the settings
      const componentsWithTheKey = this.workspace?.agent?.data?.components
        .map((comp) => {
          const compData = comp.data;
          const _components: {
            id: string;
            keyName: string;
          }[] = [];

          // Check all data values for key usage
          for (const key in compData) {
            let value = compData[key];
            if (!value) continue;

            // Convert objects to strings to handle special cases like component.data._templateVars
            // This allows us to search for key patterns within nested object structures
            value = typeof value === 'object' ? JSON.stringify(value) : value;

            if (typeof value !== 'string') continue;

            const regex = /{{KEY\(([^}]*)\)}}/g;
            let match;

            while ((match = regex.exec(value)) !== null) {
              if (match[1]) {
                const matchedKey = match[1];
                // Check both original key name and with spaces instead of +
                if (matchedKey === keyName || matchedKey.replace(/\+/g, ' ') === keyName) {
                  _components.push({
                    id: comp.id,
                    keyName: matchedKey,
                  });
                }
              }
            }
          }
          return _components;
        })
        .flat(Infinity)
        .filter((component) => component.id);

      // Notify about other components using this key
      if (componentsWithTheKey.length > 0) {
        componentsWithTheKey.forEach(async ({ id, keyName }) => {
          const comp = ComponentList[id];
          await comp?.checkSettings();
        });
      }
      //#endregion Find other components using the same key and revalidate the settings
    },
    onError: () => {
      errorToast('Error saving key, please try again or contact support.');
    },
  });
}
//#endregion
