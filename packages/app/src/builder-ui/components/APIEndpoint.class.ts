import { debounce } from 'lodash-es';
import { EMBODIMENT_DESCRIPTIONS } from '../../shared/constants/general';
import EventEmitter from '../EventEmitter.class';
import { openEmbodimentDialog } from '../pages/builder/agent-settings';
import { PostHog } from '../services/posthog';
import { confirm } from '../ui/dialogs';
import { renderEndpointFormPreviewSidebar } from '../ui/react-injects';
import { delay } from '../utils';
import { Component } from './Component.class';
declare var Metro;

const getEndpointFinalURL = (url: string) => {
  return `<strong>Internal Name:</strong> <span style="word-break: break-all; font-size: 12px; font-weight: normal; text-transform: none;">${url}</span>`;
};

const getValidEndpoint = (val: string) => {
  return val ? val.trim().replace(/\s+/g, '_') : '';
};

export class APIEndpoint extends Component {
  private isOnAdvancedMode: boolean = false;
  private isNewComponent: boolean = false;
  private cachedAutoFillDataJson: Record<string, unknown> | null = null;
  private formPreviewButton: HTMLElement | null = null;

  protected async init() {
    this.isNewComponent = Object.keys(this.data).length === 0;
    // if it is a new component, it is on easy mode by default otherwise, if the advancedModeEnabled is not set, it is on advanced mode (for retro compatibility)
    this.isOnAdvancedMode = this.isNewComponent
      ? false
      : typeof this.data.advancedModeEnabled === 'boolean'
        ? this.data.advancedModeEnabled
        : true;

    // Store component instance reference for use in event handlers
    const componentInstance = this;

    this.settings = {
      method: {
        type: 'select',
        label: 'Method',
        value: 'POST',
        options: ['POST', 'GET'],
        help: 'Select available methods for this endpoint',
        hintPosition: 'bottom',
        tooltipClasses: 'w-48 ',
        arrowClasses: '-ml-11',
        // readonly: this.isOnAdvancedMode ? false : true,
        //helpUrl: '#',
        //source: () => {},
      },

      endpoint: {
        type: 'input',
        label: 'Skill Name',
        value: '',
        validate: `required maxlength=50 custom=isValidEndpoint`,
        validateMessage: `Provide a valid endpoint that only contains 'a-z', 'A-Z', '0-9', '-', '_' , without leading or trailing spaces. Length should be less than 50 characters.`,
        events: {
          input: (e) => {
            const endpointLabelText = document.querySelector(
              'label[for="endpointLabel"]',
            ) as HTMLLabelElement;
            const endpointLabel = document.querySelector(
              'input[name="endpointLabel"]',
            ) as HTMLInputElement;
            let newVal = getValidEndpoint(e.target.value || '');
            endpointLabelText.style.display =
              e.target.value.trim() && newVal != e.target.value.trim() ? 'flex' : 'none';
            let value = getEndpointFinalURL(newVal);
            if (endpointLabelText) {
              endpointLabelText.innerHTML = value || '';
              endpointLabel.value = newVal;
              e.stopPropagation();
            }
          },
          keyup: (e) => {
            // This event will capture ALL key presses including modifier keys
            const input = e.target as HTMLInputElement;
            if (window['Metro'] && window['Metro'].validator) {
              setTimeout(() => {
                window['Metro'].validator.validate(input);
              }, 100);
            }
            e.stopPropagation();
          },
        },
      },
      endpointLabel: {
        type: 'input',
        label: 'Internal Name',
        value: '',
        events: {
          input: (e) => {
            // Stop propogation to data values do not get written via writeSettings function.
            e.stopPropagation();
          },
        },
        onLoad: (div) => {
          // Get the current endpoint value
          setTimeout(() => {
            const endpointInput = document.querySelector(
              'input[name="endpoint"]',
            ) as HTMLInputElement;
            const endpointLabel = document.querySelector(
              'input[name="endpointLabel"]',
            ) as HTMLInputElement;
            const endpointLabelText = document.querySelector(
              'label[for="endpointLabel"]',
            ) as HTMLLabelElement;
            endpointLabelText.style.marginTop = '-20px';
            endpointLabelText.style.backgroundColor = 'transparent !important';
            endpointLabelText.style.justifyContent = 'flex-start';
            endpointLabelText.style.gap = '8px';
            endpointLabel.parentElement.style.display = 'none';

            let newVal = getValidEndpoint(endpointInput.value || '');
            endpointLabelText.style.display =
              endpointInput.value && newVal != endpointInput.value.trim() ? 'flex' : 'none';
            if (endpointInput.value) {
              let value = getEndpointFinalURL(getValidEndpoint(endpointInput.value));
              endpointLabelText.innerHTML = value;
            }
          }, 100);
        },
      },

      description: {
        type: 'textarea',
        label: 'Instructions',
        value: '',
        help: 'Instructions for AI Agent, Describes how to use this endpoint when exposed to an LLM',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        validate: `maxlength=5000`,
        validateMessage: 'Your text exceeds the 5,000 character limit.',
      },
      ai_exposed: {
        type: 'toggle',
        label: 'Expose to AI',
        value: true,
        help: 'If enabled, the endpoint can be discovered and used as a skill by AI (E.g. ChatGPT, chatbot, AgentLLM ...)',
        tooltipClasses: 'w-64 ',
        arrowClasses: '-ml-11',
        display: 'inline',
        events: {
          change: this.exposeIAChangeHandler.bind(this),
        },
        section: 'Advanced',
      },
      summary: {
        type: 'textarea',
        label: 'Description',
        value: '',
        help: 'Short description of the endpoint, used for documentation',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        validate: `maxlength=1000`,
        validateMessage: 'Your text exceeds the 1,000 character limit.',
        section: 'Advanced',
      },

      advancedModeEnabled: {
        type: 'toggle',
        label: 'Advanced Request Parts',
        value: this.isOnAdvancedMode || false,
        display: 'inline',
        help: 'Enabling this option will permanently expose HTTP headers, request body, and query parameters. This cannot be undone.',
        tooltipClasses: 'w-56 ',
        arrowClasses: '-ml-11',
        section: 'Advanced',
        events: {
          click: async (e) => {
            const newMode = e.target.checked;
            if (this.isOnAdvancedMode == true && newMode == false) {
              e.target.checked = true;
              e.preventDefault();
              return;
            }
          },
          change: async (e) => {
            const newMode = e.target.checked;
            if (this.isOnAdvancedMode == true && newMode == false) {
              e.target.checked = true;
              e.preventDefault();
              return;
            }
            const saveBeforeClose = await confirm(
              'Are you sure?',
              'Enabling Advanced Request Parts will permanently expose headers, body, and query parameters. This setting cannot be disabled once enabled.',
              {
                btnNoLabel: 'Cancel',
                btnYesLabel: 'Enable',
                btnNoClass: 'hidden',
                btnYesClass: 'h-[48px] rounded-lg px-8',
              },
            );
            if (saveBeforeClose) {
              this.isOnAdvancedMode = true;
              this.advancedModeActions(this.isOnAdvancedMode, e);
            } else {
              e.target.checked = false;
              e.preventDefault();
              return;
            }
          },
        },
      },
    };

    this.inputSettings = {
      ...this.inputSettings,
      description: {
        type: 'string',
        label: 'Description',
        class: '',
        default: '',
        editConfig: {
          label: 'Behavior',
          type: 'textarea',
          section: 'Advanced_Options',
          hint: `Describe how this input should be handled. For example, if the input is a user question, specify how to handle long or ambiguous queries (e.g., “summarize if over 10 words”). Clearly state any rules, transformations, or validations the input must follow.`,
          hintPosition: 'after_label',
          attributes: {
            placeholder: `Describe input behavior, formatting (e.g., MM-DD-YY), and requirements`,
          },
        },
      },
    };

    const dataEntries = [
      /*'domain', */
      'method',
      'endpoint',
      'endpointLabel',
      'description',
      'ai_exposed',
      'summary',
      'advancedModeEnabled',
    ];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.showSettings = true;
    this.drawSettings.inputMaxConnections = 0;
    this.drawSettings.shortDescription = 'An API Endpoint with input parameters for your AI agent.';
    // this.drawSettings.displayName = 'Agent Skill';
    if (!this.properties.title) this.properties.title = 'Agent Skill';
    this.drawSettings.color = '#b700f1';
    // this.inputEditor = COMPONENT_INPUT_EDITOR.REACT;
    // this.drawSettings.addOutputButton = 'Request Parts';
    // if (this.isOnAdvancedMode) {
    this.properties.defaultOutputs = ['headers', 'body', 'query'];

    this._ready = true;
  }

  private async exposeIAChangeHandler(e) {
    const form = e.target.closest('form');
    if (!form) return;
    const description = form.querySelector('.form-box[data-field-name="description"]');
    if (!description) return;

    if (e.target.checked) {
      description.classList.remove('hidden');
    } else {
      description.classList.add('hidden');
    }
  }

  private updateFormPreviewButton() {
    const messagesContainer = this.domElement.querySelector('.messages-container');
    if (messagesContainer) {
      const existingButton = messagesContainer.querySelector('.form-preview-button');
      if (existingButton) {
        existingButton.closest('.message')?.remove();
        this.formPreviewButton = null;
      }
    }

    let requiredSettings = [];
    for (let settingId in this.settings) {
      const setting = this.settings[settingId];
      if (setting.validate?.includes('required')) {
        requiredSettings.push({ id: settingId, name: setting.label || settingId });
      }
    }

    const missingSettings = requiredSettings.filter((setting) => !this.data[setting.id]);
    if (missingSettings.length === 0 && this.properties?.inputProps?.length > 0) {
      PostHog.track('app_form_preview_impression', {});
      this.formPreviewButton = this.addComponentButton(
        `<div class="fa-solid fa-play" id="form-preview-button-icon"></div><p class="ml-2 font-semibold">Form Preview</p>`,
        ' ',
        {
          class: 'form-preview-button',
          customStyle: 'secondary',
        },
        async (e) => {
          this.workspace.refreshComponentSelection(this.domElement);
          await this.handleFormPreviewBtnClick();
        },
      );
    }
  }

  public async checkSettings() {
    await super.checkSettings();
    this.updateFormPreviewButton();
  }

  protected async run(): Promise<any> {
    this.addEventListener('settingsOpened', async (sidebar) => {
      await delay(50);
      const description = sidebar.querySelector('.form-box[data-field-name="description"]');
      if (!description) return;
      if (this.data.ai_exposed) {
        description.classList.remove('hidden');
      } else {
        description.classList.add('hidden');
      }

      const methodSelect = sidebar.querySelector('.form-box[data-field-name="method"]');
      if (!methodSelect) return;
      if (this.isOnAdvancedMode) {
        methodSelect.classList.remove('hidden');
      } else {
        methodSelect.classList.add('hidden');
      }
    });

    this.addEventListener('settingsSaved', (settingsValues) => {
      // Ensure endpoint value is properly formatted
      if (settingsValues.endpoint) {
        // Format according to validation rules (trim and replace spaces with underscores)
        this.data.endpoint = getValidEndpoint(settingsValues.endpoint);

        // Also update endpointLabel to match
        this.data.endpointLabel = this.data.endpoint;

        // Update endpointLabel to match the formatted endpoint value
        const endpointLabel = document.querySelector(
          'div[name="endpointLabel"]',
        ) as HTMLInputElement;
        if (endpointLabel) {
          const value = getEndpointFinalURL(this.data.endpoint);
          endpointLabel.innerHTML = value;
        }

        // Trigger workspace save to propagate changes
        setTimeout(() => {
          this.workspace.saveAgent();
        }, 100);
      }
    });

    this.addEventListener('endpointChanged', (prop, endPoint, oldName, newName) => {
      if (this.isOnAdvancedMode) return;
      if (prop != 'name') return;

      const inputDiv: any = endPoint.classList.contains('input-endpoint')
        ? endPoint
        : endPoint._inputDivElement;
      const outputDiv: any = endPoint.classList.contains('output-endpoint')
        ? endPoint
        : endPoint._outputDivElement;

      const inputName = inputDiv.getAttribute('smt-name');
      const outputName = outputDiv.getAttribute('smt-name');

      if (inputName != newName) {
        inputDiv.setAttribute('smt-name', newName);
        inputDiv.querySelector('.name').innerText = newName;
      }

      if (outputName != newName) {
        outputDiv.setAttribute('smt-name', newName);
        outputDiv.querySelector('.name').innerText = newName;

        // Update the expression attribute to use the new name
        if (outputDiv?.hasAttribute('smt-expression')) {
          const oldExpression = outputDiv?.getAttribute('smt-expression');
          // If the expression follows the pattern body.oldName, update it to body.newName
          if (oldExpression === `body.${oldName}`) {
            const newExpression = `body.${newName}`;
            outputDiv.setAttribute('smt-expression', newExpression);
          }
        }
      }
    });

    await delay(50);
    this.advancedModeActions(this.isOnAdvancedMode);
  }

  public async addInput(parent: any, name: any, inputProperties: any = {}): Promise<any> {
    if (this.isOnAdvancedMode) {
      const result = await super.addInput(parent, name, inputProperties);
      this.updateFormPreviewButton();
      return result;
    }
    if (this.properties.defaultOutputs.includes(name)) return super.addInput(parent, name);

    const inputDiv: any = await super.addInput(parent, name, inputProperties);
    const outputParent = parent.parentElement.querySelector('.output-container');
    const inputProps = this.properties.inputProps?.find((c) => c.name === name);

    const outputDiv: any = await super.addOutput(
      outputParent,
      name,
      {
        expression: `body.${name}`,
      },
      {
        onEditBtnClick: (event) => {
          if (this.isOnAdvancedMode) return true;
          // if the user clicked on outputDiv edit button, we should open the inputDiv edit button since the output is not editable in easy mode
          const outputEditButton = outputDiv.querySelector('.btn-edit-endpoint');
          if (outputEditButton) {
            const inputEditButton = inputDiv.querySelector('.btn-edit-endpoint');
            if (inputEditButton) {
              inputEditButton.click();
            }
          }

          return false;
        },
      },
    );

    if (inputProperties?.optional) {
      outputDiv.classList.add('marked-optional');
    } else {
      outputDiv.classList.remove('marked-optional');
    }

    inputDiv.querySelector('.ep').setAttribute('smt-con-thickness', '8');
    inputDiv.querySelector('.ep').setAttribute('smt-con-hide-overlays', 'true');

    inputDiv._outputDivElement = outputDiv;
    outputDiv._inputDivElement = inputDiv;

    this.repaint();
    this.updateFormPreviewButton();

    // Update visual state based on current mode after adding input/output
    await delay(10);
    this.advancedModeActions(this.isOnAdvancedMode);

    return inputDiv;
  }

  public async addOutput(parent: any, name: any, outputProperties: any = {}): Promise<any> {
    if (this.isOnAdvancedMode) return super.addOutput(parent, name, outputProperties);
    if (this.properties.defaultOutputs.includes(name))
      return super.addOutput(parent, name, outputProperties);

    return null;
  }

  // check this
  public async deleteEndpoint(endpointElement) {
    if (this.isOnAdvancedMode) {
      const result = await super.deleteEndpoint(endpointElement);
      this.updateFormPreviewButton();
      return result;
    }

    super.deleteEndpoint(endpointElement);
    const otherEntry = endpointElement._outputDivElement || endpointElement._inputDivElement;

    if (endpointElement._outputDivElement) endpointElement.outputDivElement = null;
    if (endpointElement._inputDivElement) endpointElement.inputDivElement = null;

    if (otherEntry) {
      super.deleteEndpoint(otherEntry);
    }
    this.updateFormPreviewButton();
  }

  private advancedModeActions(isOnAdvanceMode: boolean, changeEvent: any = null) {
    const inputsHolder = document.querySelector(`#${this.uid} .input-container`);
    const outputAddBtnHolder = document.querySelector(`#${this.uid} .ep-control.outputs`);
    const defaultOutputs = document.querySelectorAll(
      `#${this.uid} .output-container .output-endpoint.default`,
    );
    const advancedItems = [inputsHolder, outputAddBtnHolder, ...defaultOutputs].filter(
      (item) => item != null,
    );
    if (isOnAdvanceMode) {
      // make sure the inputs holder is visible
      advancedItems.forEach((item) => item.classList.remove('hidden'));
      // In advanced mode, all outputs should show as full circles (remove optional visual state)
      const optionalOutputs = document.querySelectorAll(
        `#${this.uid} .output-container .output-endpoint.marked-optional`,
      );
      optionalOutputs.forEach((output) => output.classList.remove('marked-optional'));
      // this.settings.method.readonly = false;
    } else {
      advancedItems.forEach((item) => item.classList.add('hidden'));
      // In simple mode, restore optional visual state for outputs from optional inputs
      const outputContainer = document.querySelector(`#${this.uid} .output-container`);
      if (outputContainer) {
        const outputEndpoints = outputContainer.querySelectorAll('.output-endpoint');
        outputEndpoints.forEach((outputDiv: HTMLElement) => {
          const linkedInputDiv = outputDiv['_inputDivElement'];
          if (linkedInputDiv) {
            const inputProps = this.properties.inputProps?.find(
              (prop) => prop.name === linkedInputDiv.getAttribute('smt-name'),
            );
            if (inputProps?.optional) {
              outputDiv.classList.add('marked-optional');
            }
          }
        });
      }
      // this.settings.method.readonly = true;
    }

    // Handle method setting visibility for both initial setup and toggle changes
    if (changeEvent) {
      const form = changeEvent.target.closest('form');
      if (!form) return;
      const settingsAdvancedElements = [
        form.querySelector('.form-box[data-field-name="method"]'),
      ].filter((item) => item != null);
      settingsAdvancedElements.forEach((item) => {
        if (!item) return;

        if (changeEvent.target.checked) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    } else {
      // Handle initial setup - look for method setting in the current settings form
      const methodSelect = document.querySelector('.form-box[data-field-name="method"]');
      if (methodSelect) {
        if (isOnAdvanceMode) {
          methodSelect.classList.remove('hidden');
        } else {
          methodSelect.classList.add('hidden');
        }
      }
    }
  }

  private async handleFormPreviewBtnClick() {
    PostHog.track('app_form_preview_click', {});
    let autoFillDataJson = this.cachedAutoFillDataJson;

    const formPreviewButton = this.domElement.querySelector(
      '.form-preview-button',
    ) as HTMLButtonElement;
    const formPreviewButtonIcon = this.domElement.querySelector(
      '#form-preview-button-icon',
    ) as HTMLDivElement;
    if (formPreviewButtonIcon && formPreviewButton) {
      formPreviewButton.disabled = true;
      formPreviewButton.classList.add('disabled');
      formPreviewButtonIcon.classList.remove('fa-play');
      formPreviewButtonIcon.classList.add('fa-circle-notch');
      formPreviewButtonIcon.classList.add('animate-spin');
    }

    if (!autoFillDataJson) {
      const response = await fetch('/api/page/builder/data/generate-form-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: this.workspace.agent.id, componentId: this.uid }),
      }).catch((error) => {
        console.error('Error generating form data:', error);
        return null;
      });
      if (response && response.ok) {
        const json = await response.json();

        if (!json.success) {
          console.error('Error generating form data:', json.error);
        }

        autoFillDataJson = json.data;
        if (typeof autoFillDataJson !== 'object') {
          autoFillDataJson = {};
        }
        // this.cachedAutoFillDataJson = autoFillDataJson;
      }
    }

    const rootID = 'skill-preview-sidebar-root';
    const content = `
      <div class="p-4 h-full">
        <div id="${rootID}"></div>
      </div>`;
    await openEmbodimentDialog(
      content,
      {},
      EMBODIMENT_DESCRIPTIONS.agent_skill.title,
      EMBODIMENT_DESCRIPTIONS.agent_skill.tooltipTitle,
    );

    const skillErrors = this.getSkillErrors();

    // this.workspace.

    setTimeout(() => {
      renderEndpointFormPreviewSidebar({
        rootID,
        skill: {
          skillId: this.uid,
          details: {
            name: this.title,
            description: this.data.description,
            endpoint: this.data.endpoint,
            method: this.data.method,
            skillErrors,
          },
          inputsTypes: this.properties.inputProps,
          autoFillDataJson,
        },
      });
    }, 1000);

    if (formPreviewButtonIcon) {
      formPreviewButton.disabled = false;
      formPreviewButton.classList.remove('disabled');
      formPreviewButtonIcon.classList.remove('fa-circle-notch');
      formPreviewButtonIcon.classList.remove('animate-spin');
      formPreviewButtonIcon.classList.add('fa-play');
    }
  }

  private getSkillErrors() {
    type SkillErrorType = {
      error_slug: 'missing_connection' | 'connected_components_settings_err';
      error_message: string;
    };
    class SkillError extends EventEmitter {
      public errors: SkillErrorType[] = [];

      constructor() {
        super();
        this.errors = [];
      }

      public setErrors(errors: SkillErrorType[]) {
        this.errors = errors;
        this.emit('changed', this.errors);
      }

      public addError(error: SkillErrorType) {
        // check if the error is already in the list, if so, update the error message
        const existingError = this.errors.find((e) => e.error_slug === error.error_slug);
        if (existingError) {
          existingError.error_message = error.error_message;
        } else {
          this.errors.push(error);
        }
        this.emit('changed', this.errors);
      }

      public removeError(errorSlug: SkillErrorType['error_slug']) {
        let newErrors = this.errors.filter((error) => error.error_slug !== errorSlug);
        this.errors = newErrors;
        this.emit('changed', this.errors);
      }
    }

    const skillErrors = new SkillError();
    const checkConnections = () => {
      let connections = this.workspace.jsPlumbInstance
        .getAllConnections()
        .map((connection) => {
          const source = connection.source;
          const target = connection.target;
          const sourceComponent = source.closest('.component');
          const targetComponent = target.closest('.component');

          if (!sourceComponent || !targetComponent) return null; //exclude connections that are not connected to components, these can be used for other visual stuff
          return {
            sourceId: source.closest('.component').id,
            sourceIndex: [...source.parentElement.querySelectorAll('.output-endpoint')].findIndex(
              (c) => c === source,
            ),
            targetId: target.closest('.component').id,
            targetIndex: [...target.parentElement.querySelectorAll('.input-endpoint')].findIndex(
              (r) => r === target,
            ),
          };
        })
        .filter((c) => c);
      const sourceConnections = connections.filter((c) => c.sourceId === this.uid);

      // if no connections, then we need to add a default connection
      if (sourceConnections.length === 0) {
        skillErrors.addError({
          error_slug: 'missing_connection',
          error_message:
            'Tip: Add or connect components to bring your workflow to life. Components work together seamlessly to create a powerful, intuitive agent experience.',
        });
      } else {
        skillErrors.removeError('missing_connection');
      }
    };
    this.workspace.jsPlumbInstance.bind('connection', debounce(checkConnections, 100));
    this.workspace.jsPlumbInstance.bind('connectionDetached', debounce(checkConnections, 100));

    checkConnections();

    const checkSettingsErr = () => {
      let connections = this.workspace.jsPlumbInstance
        .getAllConnections()
        .map((connection) => {
          const source = connection.source;
          const target = connection.target;
          const sourceComponent = source.closest('.component');
          const targetComponent = target.closest('.component');

          if (!sourceComponent || !targetComponent) return null; //exclude connections that are not connected to components, these can be used for other visual stuff
          return {
            sourceId: source.closest('.component').id,
            sourceIndex: [...source.parentElement.querySelectorAll('.output-endpoint')].findIndex(
              (c) => c === source,
            ),
            targetId: target.closest('.component').id,
            targetIndex: [...target.parentElement.querySelectorAll('.input-endpoint')].findIndex(
              (r) => r === target,
            ),
          };
        })
        .filter((c) => c);

      // BFS to see if any node has an err
      let hasError = false;
      let compsToVisit = [this.uid];
      let visited = [];
      while (compsToVisit.length > 0) {
        let cId = compsToVisit.shift();
        visited.push(cId);

        const cmpCtrl = (document.querySelector(`.component#${cId}`) as any)?._control;
        if (!cmpCtrl) continue;

        // check settings
        let requiredSettings = [];
        for (let settingId in cmpCtrl.settings) {
          const setting = cmpCtrl.settings[settingId];
          if (setting.validate?.includes('required')) {
            requiredSettings.push({ id: settingId, name: setting.label || settingId });
          }
        }

        const missingSettings = requiredSettings.filter((setting) => !cmpCtrl.data[setting.id]);

        if (missingSettings.length > 0) {
          hasError = true;
          // if there an error, listen on cmp settingsSaved event to re-trigger the check
          const listener = () => {
            checkSettingsErr();
            cmpCtrl.off('settingsSaved', listener);
          };
          cmpCtrl.on('settingsSaved', listener);
          break;
        }

        // add connected
        const connectedCmpIds = connections
          .filter((c) => c.sourceId === cId && !visited.includes(c.targetId))
          .map((c) => c.targetId);
        compsToVisit.push(...connectedCmpIds);
      }

      if (hasError) {
        skillErrors.addError({
          error_slug: 'connected_components_settings_err',
          error_message:
            'Tip: resolve missing information from components (the red boxes) first, otherwise the agent will get stuck at that step and not return anything useful.',
        });
      } else {
        skillErrors.removeError('connected_components_settings_err');
      }
    };

    checkSettingsErr();

    return skillErrors;
  }

  public redraw(triggerSettings?: boolean): any {
    super.redraw(triggerSettings);

    // add new connection endpoint
    const titleWrapper = this.domElement.querySelector('.title-bar-top');

    // place new jsplumb endpoint before titleWrapper
    const newEndpoint = this.workspace.jsPlumbInstance.addEndpoint(titleWrapper, {
      endpoint: ['Rectangle', { height: 10, width: 40 }],
      anchor: 'Left',
      isTarget: true,
      maxConnections: -1,
      cssClass: 'exclude-panzoom',
    });
    titleWrapper.classList.add('agent-card-connection');
    // @ts-ignore
    titleWrapper.endpoint = newEndpoint;
    newEndpoint['_domElement'] = titleWrapper;

    const endpointBall = document.createElement('span');

    // Translating CSS to Tailwind classes
    endpointBall.className =
      'block absolute ep w-[15px] h-[15px] rounded-full -left-[17px] float-left border-0 top-1/2 -translate-y-1/2';
    // Note: Some styles like specific colors and custom values need to be applied directly
    // as they don't have direct Tailwind equivalents
    endpointBall.style.backgroundColor = 'rgb(60, 137, 249)';

    titleWrapper.appendChild(endpointBall);
  }
}
