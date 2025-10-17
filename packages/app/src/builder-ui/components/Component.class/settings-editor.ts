import { errorToast, successToast } from '@src/shared/components/toast';
import { Observability } from '@src/shared/observability';
import { Component } from '.';
import { FEATURE_FLAGS } from '../../../shared/constants/featureflags';
import {
  closeRightSidebar,
  confirm,
  readRightSidebarValues,
  sidebarEditValues,
} from '../../ui/dialogs';
import { setReadonlyMode } from '../../ui/dom';
import { readFormValues, syncCompositeValues } from '../../ui/form';
import { delay, dispatchSubmitEvent } from '../../utils';
import { getComponentDocumentation } from './component-documentation';

async function onComponentLoad(sidebar) {
  const component = this;

  const titleElement = sidebar.querySelector('.title');
  const actionElement = sidebar.querySelector('.dialog-actions');
  const titleRightActions = sidebar.querySelector('.title-right-buttons');
  const titleLeftActions = sidebar.querySelector('.title-left-buttons');

  const isIntegrationComponent = !!component.properties?.template;

  // Add component/integration description below title if available
  const componentDoc = isIntegrationComponent
    ? getIntegrationDocumentation(component)
    : getComponentDocumentation(component.constructor.name);
  if (componentDoc) {
    const contentElement = sidebar.querySelector('.dialog-content');
    if (contentElement) {
      const descriptionDiv = document.createElement('div');
      descriptionDiv.className = 'component-description px-4 pb-3 border-b border-gray-100';

      // Split description into sentences and check if it's longer than 2 sentences
      const sentences = componentDoc.description.split(/(?<=[.!?])\s+/);
      const isLongDescription = sentences.length > 2;
      const shortDescription = sentences.slice(0, 2).join(' ');
      const fullDescription = componentDoc.description;

      if (isLongDescription) {
        descriptionDiv.innerHTML = `
          <p class="text-sm text-gray-600 leading-relaxed">
            <span class="description-short">${shortDescription}</span>
            <span class="description-full hidden">${fullDescription}</span>
            <button class="see-more-btn text-blue-600 hover:text-blue-800 text-xs ml-1 cursor-pointer">See more</button>
            <button class="see-less-btn text-blue-600 hover:text-blue-800 text-xs ml-1 cursor-pointer hidden">See less</button>
          </p>
          ${componentDoc.docsLink ? `<a href="${componentDoc.docsLink}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block">View Documentation →</a>` : ''}
        `;

        // Add event listeners for see more/less functionality
        const seeMoreBtn = descriptionDiv.querySelector('.see-more-btn');
        const seeLessBtn = descriptionDiv.querySelector('.see-less-btn');
        const shortSpan = descriptionDiv.querySelector('.description-short');
        const fullSpan = descriptionDiv.querySelector('.description-full');

        seeMoreBtn.addEventListener('click', () => {
          shortSpan.classList.add('hidden');
          fullSpan.classList.remove('hidden');
          seeMoreBtn.classList.add('hidden');
          seeLessBtn.classList.remove('hidden');
        });

        seeLessBtn.addEventListener('click', () => {
          shortSpan.classList.remove('hidden');
          fullSpan.classList.add('hidden');
          seeMoreBtn.classList.remove('hidden');
          seeLessBtn.classList.add('hidden');
        });
      } else {
        descriptionDiv.innerHTML = `
          <p class="text-sm text-gray-600 leading-relaxed">${componentDoc.description}</p>
          ${componentDoc.docsLink ? `<a href="${componentDoc.docsLink}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block">View Documentation →</a>` : ''}
        `;
      }

      contentElement.insertBefore(descriptionDiv, contentElement.firstChild);
    }
  }

  const deleteButton: HTMLButtonElement = actionElement.querySelector('button.del-btn');
  deleteButton.classList.remove('hidden');
  deleteButton.onclick = component.delete.bind(this, false);

  // Add Test with Debug button based on feature flag
  const testWithDebugFeatureFlag = Observability.features.getFeatureFlag(
    FEATURE_FLAGS.TEST_WITH_DEBUG_COMPONENT_SIDEBAR,
  );
  if (testWithDebugFeatureFlag === 'variant_1' && !component.workspace?.locked) {
    const actionContent: HTMLElement = actionElement.querySelector('.action-content');

    // Create Test with Debug button
    const testWithDebugButton = document.createElement('button');
    testWithDebugButton.type = 'button';
    testWithDebugButton.className =
      'ml-2 mt-2 test-with-debug-btn bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 rounded text-sm transition-colors duration-200 flex items-center justify-center';
    testWithDebugButton.style.height = '32px';
    testWithDebugButton.style.alignSelf = 'center';
    testWithDebugButton.textContent = 'Test with Debug';
    testWithDebugButton.setAttribute('aria-label', 'Test with Debug');

    // Add click handler for Test with Debug button
    testWithDebugButton.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        // Check if debug is currently active
        const debugSwitcher = document.querySelector('.debug-switcher');
        const isDebugCurrentlyOn = debugSwitcher && debugSwitcher.classList.contains('active');

        // Fire telemetry event
        Observability.observeInteraction('test_with_debug_component_sidebar_clicked', {
          source: 'component_settings_sidebar',
          componentType: component.constructor.name,
          componentId: component.uid,
          debugWasOn: isDebugCurrentlyOn,
        });

        // Turn on debug if it's not active
        if (!isDebugCurrentlyOn && debugSwitcher) {
          debugSwitcher.dispatchEvent(new Event('click', { bubbles: true }));
        }

        // Handle pre-population based on debug state
        let prefillValues;
        if (isDebugCurrentlyOn) {
          // Debug is on: Pre-populate if previous input exists from previous debug run
          const debugInputs = (window as any).debugInputs || {};
          if (debugInputs[component.uid] && debugInputs[component.uid].inputs) {
            prefillValues = debugInputs[component.uid].inputs;
          }
        } else {
          // Debug is off: Clear auto-population cache and don't pre-populate
          const debugInputs = (window as any).debugInputs || {};
          if (debugInputs[component.uid]) {
            delete debugInputs[component.uid];
          }
          prefillValues = undefined; // Explicitly no pre-population
        }

        // Open debug modal with appropriate pre-population based on debug state
        await component.openDebugDialog(event, 'run', prefillValues);
      } catch (error) {
        console.error('Error opening debug modal from Test with Debug button:', error);
        errorToast('Failed to open debug modal');
      }
    };

    // Insert button at the beginning of action content (left side)
    actionContent.insertBefore(testWithDebugButton, actionContent.firstChild);
  }

  const tplDocPath = component.properties?.template?.templateInfo?.docPath || '/not-set';

  const docUrl = component.properties?.template
    ? component.workspace.serverData.docUrl + tplDocPath
    : component.docUrl;
  const helpBtn: HTMLButtonElement = titleLeftActions.querySelector('.action-help');
  if (helpBtn) {
    helpBtn.onclick = () => {
      window.open(docUrl, '_blank');
    };
    if (component.properties?.template && !component.properties?.template?.templateInfo?.docPath)
      helpBtn.classList.add('hidden');
  }

  if (component.workspace?.locked) {
    setReadonlyMode(sidebar, ['close-btn', 'action-help']);
    sidebar.querySelector('.del-btn')?.classList.add('hidden');
  } else {
    // Always hide the top save button for manual save/cancel flow
    sidebar.querySelector('.del-btn')?.classList.remove('hidden');
    sidebar.querySelector('.close-btn')?.classList.remove('hidden');
  }

  // Keep dynamic draft updates handled by sidebarEditValues(onDraft). Do not write to component data on input/change.

  component.emit('settingsOpened', sidebar, this);
}

function getIntegrationDocumentation(component: Component) {
  const description = component.properties?.template?.templateInfo?.sidebarDescription || '';
  const docsLink = component.properties?.template?.templateInfo?.docPath || '';
  return description
    ? {
        description: description,
        docsLink: docsLink,
      }
    : null;
}

function onTemplateCreateLoad(sidebar) {
  const component = this;
  let creatingTemplate = true;

  //if properties.template is present, it means that we are editing a template,
  //otherwise we are creating a new one
  if (component?.properties?.template) {
    creatingTemplate = false;
  }

  const actionElement = sidebar?.querySelector('.dialog-actions');
  const titleRightActions = sidebar?.querySelector('.title-right-buttons');
  const titleLeftActions = sidebar?.querySelector('.title-left-buttons');

  const closeButton: HTMLButtonElement = titleRightActions?.querySelector('button.close-btn');
  if (closeButton) {
    closeButton.classList.remove('hidden');
  }
  const deleteButton: HTMLButtonElement = actionElement?.querySelector('button.del-btn');
  if (deleteButton) {
    deleteButton.classList.add('hidden');
  }
  //deleteButton.onclick = component.delete.bind(this, false);

  const helpBtn: HTMLButtonElement = titleLeftActions?.querySelector('.action-help');
  if (helpBtn) {
    helpBtn.classList.add('hidden');
  }

  const templateInfo = component?.properties?.template?.templateInfo;
  const settingsForm = sidebar?.querySelector('form.Settings');

  if (settingsForm) {
    const fields = [...settingsForm?.querySelectorAll('.form-box')] as HTMLElement[];

    const fieldChangeCheck = (element, e?) => {
      let regex = /{{([A-Z]+):([\w\s]+):\[(.*?)\]}}/gm;
      let match = regex.exec(element.value);
      const checkboxElement = element
        .closest('.form-box')
        .querySelector('.chk-bind-setting') as HTMLInputElement;
      if (!checkboxElement) return;
      const chkLabel = checkboxElement?.previousElementSibling as HTMLLabelElement;

      if (match) {
        checkboxElement.checked = false;
        checkboxElement.disabled = true;
        checkboxElement.classList.add('hidden');
        chkLabel.innerHTML = 'Override Not allowed With Custom Variables';
      } else {
        checkboxElement.disabled = false;
        checkboxElement.classList.remove('hidden');
        chkLabel.innerText = 'Allow Override';
      }
    };

    // const formObserver = new MutationObserver(function (mutationsList, observer) {
    //     const allUpdatedElements = [];
    //     for (var mutation of mutationsList) {
    //         console.log('Mutation', mutation.target, mutation.type);
    //         // Check for attribute changes in existing inputs/textareas
    //         // if (mutation.type === 'attributes' && (mutation.target.nodeName === 'INPUT' || mutation.target.nodeName === 'TEXTAREA')) {
    //         //     if (!allUpdatedElements.includes(mutation.target)) allUpdatedElements.push(mutation.target);
    //         // }
    //         // Check for changes in text content in existing inputs/textareas
    //         if (mutation.type === 'characterData') {
    //             let parentNode = mutation.target.parentNode;
    //             if (parentNode.nodeName === 'INPUT' || parentNode.nodeName === 'TEXTAREA') {
    //                 //fieldChangeCheck(mutation.target);
    //                 if (!allUpdatedElements.includes(parentNode)) allUpdatedElements.push(parentNode);
    //             }
    //         }
    //     }
    //     allUpdatedElements.forEach((e) => fieldChangeCheck(e));
    // });

    // formObserver.observe(settingsForm, { attributes: true, childList: true, subtree: true, characterData: true });

    for (let field of fields) {
      //add a checkbox to every field element
      const chkContainer = document.createElement('div');
      field.appendChild(chkContainer);

      const inputs = field.querySelectorAll('input, textarea');
      inputs?.forEach((input) => {
        input.addEventListener('change', (e) => {
          console.log('Change Event', e);
          fieldChangeCheck(e.target);
        });
        input.addEventListener('mouseout', (e) => fieldChangeCheck(e.target));
        input.addEventListener('keyup', (e: any) => {
          //check if ctrl+v or cmd+v is pressed
          if (e.ctrlKey || e.metaKey) {
            fieldChangeCheck(e.target);
          }
        });

        setTimeout(() => fieldChangeCheck(input), 1000);
      });
      settingsForm.addEventListener('mouseout', (e) => {
        inputs.forEach((input) => {
          fieldChangeCheck(input);
        });
      });

      // Create a layered structure for proper click handling
      const clickWrapper = document.createElement('div');
      clickWrapper.className = 'float-right inline-block rounded-full';
      clickWrapper.style.pointerEvents = 'auto'; // Enable click events for the wrapper

      // Background element (visual only)
      const background = document.createElement('div');
      background.className = 'bg-gray-300 rounded-full pr-6 pl-2 py-1 absolute inset-0';
      background.style.pointerEvents = 'none'; // Disable interaction with background

      // Interactive elements
      const interactiveLayer = document.createElement('div');
      interactiveLayer.className = 'relative flex items-center gap-2';
      interactiveLayer.style.pointerEvents = 'none'; // Let clicks pass through to checkbox

      const chkLabel = document.createElement('label');
      chkLabel.innerText = 'Allow Override';
      chkLabel.className = 'px-1 cursor-pointer';

      const checkboxElement = document.createElement('input');
      checkboxElement.type = 'checkbox';
      checkboxElement.className =
        'chk-bind-setting w-4 h-4 text-gray-600 focus:outline-none cursor-pointer relative z-10';
      checkboxElement.style.pointerEvents = 'auto'; // Enable clicks on checkbox

      // Associate label with checkbox
      const checkboxId = `chk-${field.getAttribute('data-field-name')}`;
      checkboxElement.id = checkboxId;
      chkLabel.htmlFor = checkboxId;

      // Build structure
      interactiveLayer.appendChild(chkLabel);
      interactiveLayer.appendChild(checkboxElement);
      clickWrapper.appendChild(background);
      clickWrapper.appendChild(interactiveLayer);
      chkContainer.appendChild(clickWrapper);
      const dataFieldName = field.getAttribute('data-field-name');

      checkboxElement.checked =
        dataFieldName && templateInfo?.includedSettings?.includes(dataFieldName);
    }
  }
}

async function onSave(values) {
  if (!values) {
    //if the form is invalid, values will be null
    console.log('Invalid form');
    return;
  }
  const component = this;
  //console.log('onSave', values);
  const settingsValues = values.Settings;
  component.emit('settingsSaving', settingsValues);

  /* If the component has a prompt, that means we can auto-update the title
       by comparing the title with displayName | aiTitle, we can make sure that user has not changed the title manually */
  if (
    settingsValues?.prompt &&
    (component.title === component.displayName || component.aiTitle === component.title)
  ) {
    const oldSettings: {
      prompt?: { value: string };
    } = component.settingsEntries;

    if (settingsValues?.prompt && settingsValues?.prompt !== oldSettings?.prompt?.value) {
      // Need to await to update title before saving
      await component.updateTitle();
    }
  }

  const saved = await component.save(settingsValues);
  if (!saved) {
    errorToast('Error saving settings');
    return;
  }

  //Write the new values to the component data
  if (!component.properties.template) {
    for (let name in component.settings) {
      component.data[name] = settingsValues[name];
    }
  } else {
    //if it's a template we match template variables to their respective values ==> they will be replaced in the backend
    const tplSettings = component.templateSettings;
    const templateData = component.data._templateVars;

    const includedSettings = component.properties?.template?.templateInfo?.includedSettings || [];
    for (let name of includedSettings) {
      component.data[name] = settingsValues[name];
    }

    component.data._templateVars = {};
    for (let name in tplSettings) {
      component.data._templateVars[name] = settingsValues[name];
    }
  }

  //console.log('new settings', component.settings);

  component.emit('settingsSaved', settingsValues);

  // Also dispatch a global event for tracking
  document.dispatchEvent(
    new CustomEvent('componentSettingsSaved', {
      detail: { componentId: component.uid, settings: settingsValues },
    }),
  );

  component.emit('settingsClosed');
  //component.redrawSettings();
  component.domElement.classList.remove('active');

  await delay(100);
  component.workspace.saveAgent();

  component.unsetTemplateEditMode();
}

async function onDraft(values) {
  const component = this;
  const settingsValues = values.Settings;
  let preparedValues = {};

  for (let name in settingsValues) {
    preparedValues[name] = settingsValues[name]?.value || '';
  }
  component.emit('settingsDraftUpdated', preparedValues);
}

function isSettingsChanged() {
  const component = this;
  const changed = component.settingsChanged();
  return changed;
}

const templateHelpSection = {
  html1: {
    type: 'div',
    classOverride: 'all-initial p-2 px-4',
    html: `
<h1 class="text-lg font-bold text-emerald-600 mt-6">Component Template Builder Help</h1>

<div class="bg-gray-200 p-4 rounded-md" ><b>Note : </b> This help section explains the usage of custom template variables, this is an MVP implementation, a <b>Visual Editor</b> will replace it later</div>

<p class="mt-4">You can use the following annotations inside text inputs in order to generate additional fields in the new component : </p>
<ul>
<li><b class="w-8"> * Select</b> : {{<span class="font-bold text-indigo-700">SELECT</span>:<span class="font-bold text-emerald-700">Select label</span>:<span class="font-bold text-blue-700">["value1", "value2", "value3"]</span>}}</li>
<li><b class="w-8"> * Range</b> : {{<span class="font-bold text-indigo-700">RANGE</span>:<span class="font-bold text-emerald-700">Range label</span>:<span class="font-bold text-blue-700">{"min":0,"max":10,"step":1,"value":5}</span>}}</li>
<li><b class="w-8"> * Key-Value</b> : {{<span class="font-bold text-indigo-700">KVJSON</span>:<span class="font-bold text-emerald-700">KV label</span>:<span class="font-bold text-blue-700">{"field1":"value1","field2":10,"field3":""}</span>}}</li>
<li><b class="w-8"> * Text Input</b> : {{<span class="font-bold text-indigo-700">INPUT</span>:<span class="font-bold text-emerald-700">Input label</span>:<span class="font-bold text-blue-700">[""]</span>}} </li>
<li><b class="w-8"> * Text Area</b> : {{<span class="font-bold text-indigo-700">TEXTAREA</span>:<span class="font-bold text-emerald-700">Input label</span>:<span class="font-bold text-blue-700">[""]</span>}}</li>
<li><b class="w-8"> * Password</b> : {{<span class="font-bold text-indigo-700">PASSWORD</span>:<span class="font-bold text-emerald-700">Input label</span>:<span class="font-bold text-blue-700">[""]</span>}}</li>
</ul>


<p class="mt-4">

The <span class="font-bold text-indigo-700">first field</span> (in CAPITAL letters) is the field type, it should always be one of the following : SELECT, INPUT, TEXTAREA, PASSWORD.<br/>
you can use variant annotations like : <br />
 - VARINPUT, VARTEXTAREA for an text inputs that accepts variables<br />
 - VAULTPASSWORD for a password field that can be managed using the vault <br />
</p>

<p class="mt-4">
The <span class="font-bold text-emerald-700">second field</span> is the label that will be displayed in the component settings, this is a free text, but keep it short.
</p>

<p class="mt-4">
The <span class="font-bold text-blue-700">last field</span> should be an array of possible values for SELECT input, or an empty element [""].<br/>
<b>It's important to use the empty element [""] even if no value is configured.</b>
</p>

        `,
  },
};

export async function writeSettings(component: Component) {
  const sidebar = component.getSettingsSidebar();
  if (!sidebar) return;

  const values: any = await readRightSidebarValues(sidebar);
  if (!values) return;

  const settingsValues = values.Settings; //Settings tab

  if (!component.properties.template) {
    for (let name in component.settings) {
      if (!settingsValues[name]) continue;
      if (!settingsValues[name].valid) continue; //ignore invalid values

      //write valid values
      component.data[name] = settingsValues[name].value;
    }
  }
  //console.log('component settings updated');
  component.checkSettings();
}

export async function closeSettings(component: Component, force = false) {
  const changed = component.settingsChanged();
  if (!force && changed) {
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
    await delay(100);
  }

  await closeRightSidebar();
  Component.curComponentSettings = null;
  component.domElement.classList.remove('active');
}
export async function editSettings(component: Component) {
  Component.curComponentSettings = component;
  component.workspace.domElement
    .querySelectorAll('.component.active')
    .forEach((component: HTMLElement) => {
      component.classList.remove('active');
    });

  component.domElement.classList.add('active');

  const componentSettingsEntries = {};
  for (let name in component.settings) {
    const setting = component.settings[name];
    const entry = { ...setting, value: component.data[name] };
    if (setting?.type === 'composite') {
      componentSettingsEntries[name] = syncCompositeValues(entry);
    } else {
      componentSettingsEntries[name] = entry;
    }
  }

  let templateSettingsEntries = null;
  if (component.properties.template) {
    templateSettingsEntries = {};
    const includedSettings = component.properties?.template?.templateInfo?.includedSettings || [];
    for (let name of includedSettings) {
      templateSettingsEntries[name] = component.settings[name];
      templateSettingsEntries[name].value = component.data[name];
    }

    const templateData = component.data._templateVars;
    for (let name in component.templateSettings) {
      const setting = component.templateSettings[name];
      const entry = { ...setting, value: templateData[name] || setting.value || '' };

      if (setting?.type === 'composite') {
        templateSettingsEntries[name] = syncCompositeValues(entry);
      } else {
        templateSettingsEntries[name] = entry;
      }
    }
  }

  component.settingsEntries = component.properties.template
    ? templateSettingsEntries
    : componentSettingsEntries;

  //const displayName = component.properties?.template?.name || component.drawSettings.displayName;
  const templateName = component.properties?.template?.templateInfo?.name || component.title || '';

  // Separate cancel handlers for template vs component settings flows
  const onBeforeCancelTemplate = async (_sidebar?: any): Promise<boolean> => {
    // Keep template flow as-is (legacy behavior)
    const _ = await component.confirmSaveSettings();
    return true;
  };

  const onBeforeCancelSettings = async (_sidebar?: any): Promise<boolean> => {
    // Prompt to discard if there are unsaved changes
    const changed = component.settingsChanged();
    if (!changed) return true;

    const discard = await confirm(
      'You have unsaved changes',
      'Are you sure you want to close this without saving?',
      {
        btnYesLabel: 'Discard Changes',
        btnYesClass: 'rounded-lg px-8',
        btnNoClass: 'hidden',
      },
    );

    return !!discard;
  };

  const onCancel = () => {
    Component.curComponentSettings = null;
    component.emit('settingsClosed');
    component.domElement.classList.remove('active');
    component.unsetTemplateEditMode();
  };

  const iconUpdate = (e) => {
    const iconValue = e.target.value;
    //if the value looks like "<i class="fa-brands fa-staylinked"></i>", replace it with the class values
    const match = iconValue.match(/<i class="([^"]+)"/);
    const iconClass = match ? match[1] : iconValue;
    e.target.value = iconClass;

    const formBox = e.target.closest('.form-box');
    if (formBox) {
      let iconPreview = formBox.querySelector('.tpl-icon-preview');
      if (!iconPreview) {
        iconPreview = document.createElement('div');
        iconPreview.classList.add(
          'tpl-icon-preview',
          'absolute',
          'bottom-0',
          'right-0',
          'w-12',
          'h-12',
        );

        formBox.appendChild(iconPreview);
      }
      if (iconClass.startsWith('fa')) {
        iconPreview.innerHTML = `<i class="icon tpl-fa-icon ${iconClass}"></i>`;
      } else {
        iconPreview.innerHTML = `<div class="w-8 h-8">${iconClass}</div>`;
      }
    }
  };
  collectionsCache = null;

  // Add this function to create and add a new collection
  async function addNewCollection(name: string, color: string = '#000000', icon: string = '') {
    try {
      const response = await fetch('/api/page/collection/create-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color, icon }),
      });

      if (!response.ok) {
        throw new Error('Failed to add new collection');
      }

      const result = await response.json();

      if (result.error) {
        errorToast('Error adding new collection');
        return null;
      }

      // For adding newely added collection to the dropdown we will add that logic here
      return result;
    } catch (error) {
      errorToast('Error adding new collection');
      return null;
    }
  }

  // Modify the templateInfoSettings object
  const templateInfoSettings = {
    name: {
      type: 'input',
      label: 'Name',
      value: component.properties?.template?.templateInfo?.name || component.title || '',
    },
    description: {
      type: 'textarea',
      label: 'Description',
      value:
        component.properties?.template?.templateInfo?.description || component.description || '',
    },
    sidebarDescription: {
      type: 'textarea',
      label: 'Sidebar Description',
      value: component.properties?.template?.templateInfo?.sidebarDescription || '',
    },
    icon: {
      type: 'textarea',
      label: 'Font Awesome Class or SVG',
      value: component.properties?.template?.templateInfo?.icon || '',
      events: {
        change: iconUpdate,
        mouseup: iconUpdate,
        keyup: (e) => {
          //detect Ctrl+V or Cmd+V and trigger change event
          if (e.ctrlKey || e.metaKey) {
            iconUpdate(e);
          }
        },
      },
    },
    color: {
      type: 'color',

      value: component.properties?.template?.templateInfo?.color || '#000000',
    },
    docPath: {
      type: 'input',
      label: 'Documentation Path',
      value: component.properties?.template?.templateInfo?.docPath || '',
    },
    ytLink: {
      type: 'input',
      label: 'Youtube Tutorial Link',
      value: component.properties?.template?.templateInfo?.ytLink || '',
    },
    newCollectionCheckbox: {
      type: 'checkbox',
      label: 'Do you want to create a new collection?',
      value: false, // Ensures the checkbox is unchecked initially
      events: {
        change: (e) => {
          const newCollectionInput = document.querySelector(
            '[data-field-name="newCollectionInput"]',
          );
          const newCollectionButton = document.querySelector(
            '[data-field-name="newCollectionButton"]',
          );

          if (e.target.checked) {
            newCollectionInput.classList.remove('invisible', 'hidden');
            newCollectionInput.classList.add('block', 'visible');

            newCollectionButton.classList.remove('invisible', 'hidden');
            newCollectionButton.classList.add('inline-block', 'visible');
          } else {
            newCollectionInput.classList.remove('block', 'visible');
            newCollectionInput.classList.add('invisible', 'hidden');

            newCollectionButton.classList.remove('inline-block', 'visible');
            newCollectionButton.classList.add('invisible', 'hidden');
          }
        },
      },
    },
    newCollectionInput: {
      type: 'input',
      label: 'New Collection Name',
      value: '',
      class: 'invisible hidden',
    },
    newCollectionButton: {
      type: 'button',
      label: 'Add Collection',
      class: 'invisible hidden',
      attributes: {},
      events: {
        click: async (event) => {
          const button = event.target as HTMLButtonElement;
          const originalContent = button.innerHTML;

          const newCollectionInput = document.querySelector(
            '[data-field-name="newCollectionInput"]',
          ) as HTMLInputElement;

          const collectionName = newCollectionInput.querySelector('input').value.trim();

          const newCollectionColor = document.getElementById('color') as HTMLInputElement;
          const collectionColor = newCollectionColor.value.trim();

          const newCollectionIcon = document.getElementById('icon') as HTMLInputElement;
          const collectionIcon = newCollectionIcon.value.trim();

          if (collectionName) {
            // Add spinner
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;

            const newCollection = await addNewCollection(
              collectionName,
              collectionColor,
              collectionIcon,
            );

            button.innerHTML = originalContent;
            button.disabled = false;

            if (newCollection) {
              newCollectionInput.querySelector('input').value = '';

              const newCollectionCheckbox = document.getElementById(
                'newCollectionCheckbox',
              ) as HTMLInputElement;
              newCollectionCheckbox.checked = false;

              const newCollectionButton = document.querySelector(
                '[data-field-name="newCollectionButton"]',
              );

              newCollectionInput.classList.remove('block', 'visible');
              newCollectionInput.classList.add('invisible', 'hidden');

              newCollectionButton.classList.remove('inline-block', 'visible');
              newCollectionButton.classList.add('invisible', 'hidden');

              successToast('New collection added');
            }
          } else {
            errorToast('Please enter a collection name');
          }
        },
      },
    },

    collection: {
      type: 'select',
      label: 'Collection',
      value: component.properties?.template?.templateInfo?.collection || '',
      options: getComponentsCollections.bind(component),
      events: {
        change: (e) => {
          const collection = collectionsCache.find((c) => c.value === e.target.value);
          const icon: HTMLTextAreaElement = document.querySelector(
            '.form-box[data-field-name="icon"] #icon',
          );
          const curIcon = component.properties?.template?.templateInfo?.icon || '';
          const curColor = component.properties?.template?.templateInfo?.color || '#000000';

          if ((icon && !curIcon) || !icon?.value) icon.value = collection.icon;

          const color: HTMLInputElement = document.querySelector(
            '.form-box[data-field-name="color"] #color',
          );
          if (!curColor || curColor == '#000000' || color.value == '#000000') {
            color.value = collection.color;
            color.setAttribute('value', collection.color);
            const clrField: HTMLElement = color.closest('.clr-field');
            if (clrField) clrField.style.color = collection.color;
          }
        },
      },
    },
    version: {
      type: 'input',
      label: 'Version',
      validate: `custom=isValidSemVer`,
      validateMessage: `Invalid version number. Must be in the format x.x.x`,
      value: component.properties?.template?.templateInfo?.version || '1.0.0',
    },
    published: {
      type: 'checkbox',
      class: 'w-32',
      label: 'Published',
      value: component.properties?.template?.templateInfo?.published || false,
    },
  };

  //Logic for showing the template editor button
  const templatesEnabled =
    component?.templateSupport &&
    component.workspace?.userData?.acl?.['/templates'] == 'rw' &&
    component.workspace?.userData?.isSmythStaff;

  const sidebarActions = !templatesEnabled
    ? null
    : {
        //Switch the sidebar to template Edit Mode
        template: {
          type: 'button',
          label: component.properties.template
            ? '<i class="fa-solid fa-pen-to-square"></i>'
            : '<i class="fa-solid fa-screwdriver-wrench"></i>',
          icon: '',
          hint: component.properties.template ? 'Edit This Template' : 'Create Template Component',
          hintPosition: 'right',
          class: 'bg-transparent font-semibold text-base hover:bg-gray-300 hover:text-emerald-600',
          click: async () => {
            let creatingTemplate = true;

            //if properties.template is present, it means that we are editing a template,
            //otherwise we are creating a new one
            if (component.properties.template) {
              creatingTemplate = false;
              component.settingsEntries = componentSettingsEntries;
            }
            const createTemplateEntries = {
              Info: templateInfoSettings,
              Settings: component.settingsEntries,
              Help: templateHelpSection,
            };

            const createTemplateActions = {
              template: {
                type: 'button',
                label: '<i class="fa-regular fa-floppy-disk"></i>',
                icon: '',
                hint: 'Save Template Component',
                hintPosition: 'right',
                class:
                  'bg-transparent font-semibold text-base hover:bg-gray-300 hover:text-emerald-600',
                click: async (e: any) => {
                  console.log('collecting settings data');
                  const sidebar = e.target.closest('.right-sidebar');
                  const settingsForm = sidebar?.querySelector('form.Settings');
                  let includedSettings = {};
                  if (settingsForm) {
                    includedSettings = [...settingsForm.querySelectorAll('.chk-bind-setting')]
                      .filter((chk) => chk.checked)
                      .map((chk) => chk.closest('.form-box').getAttribute('data-field-name'));
                    console.log(includedSettings);
                  }

                  const result = {};
                  for (let tab in createTemplateEntries) {
                    const form = document.querySelector(
                      `#right-sidebar form.${tab}`,
                    ) as HTMLFormElement;
                    const formFields = createTemplateEntries[tab];
                    dispatchSubmitEvent(form); // to trigger validation

                    await delay(30);
                    const invalid = form.querySelector('.invalid') as HTMLFormElement;
                    if (invalid) return;

                    const values = readFormValues(form, formFields);
                    result[tab] = values;
                  }

                  const settingsValues = result['Settings'];
                  component.emit('settingsSaving', settingsValues);
                  const saved = await component.save(settingsValues);
                  if (!saved) {
                    errorToast('Error saving settings');
                    return;
                  }

                  //Write the new values to the component data
                  if (!component.properties.template || !creatingTemplate) {
                    for (let name in component.settings) {
                      component.data[name] = settingsValues[name];
                    }
                  } else {
                    //if it's a template we match template variables to their respective values ==> they will be replaced in the backend
                    const tplSettings = component.templateSettings;
                    const templateData = component.data._templateVars;

                    const includedSettings =
                      component.properties?.template?.templateInfo?.includedSettings || [];
                    for (let name of includedSettings) {
                      component.data[name] = settingsValues[name];
                    }

                    for (let name in tplSettings) {
                      //const setting = tplSettings[name];
                      templateData[name] = settingsValues[name];
                    }
                    //component.data._templateData = JSON.stringify(templateData);
                  }

                  console.log('template save settings', component.settings);

                  const templateData = component.exportTemplate();

                  //preserve unchanged templateInfo values
                  templateData.templateInfo = {
                    ...component.properties.template?.templateInfo,
                    ...result['Info'],
                    ...{ includedSettings },
                  };

                  //update templateData with new settings
                  templateData.data = { ...templateData.data, ...component.data };

                  if (!templateData.templateInfo.icon) {
                    //TODO: if no icon is set, use the collection icon
                  }

                  component.emit('settingsSaved', settingsValues);

                  let templateId = creatingTemplate ? null : templateData?.templateInfo?.id; //set id if updating existing template

                  try {
                    const collection = collectionsCache.find(
                      (c) => c.value === templateData.templateInfo.collection,
                    );

                    let icon = templateData.templateInfo.icon || '';
                    if (!icon) {
                      templateData.templateInfo.icon = collection ? collection.icon : icon;
                    }

                    let color = templateData.templateInfo.color || '#000000';
                    if (color === '#000000') {
                      templateData.templateInfo.color = collection ? collection.color : color;
                    }

                    const tplSave: any = await saveComponentTemplate(
                      templateId,
                      templateData,
                      templateData.templateInfo?.published || false,
                    ).catch((error) => ({ error }));
                    if (tplSave.error) {
                      console.log('error saving template', tplSave.error);
                      errorToast(
                        tplSave.error?.error?.message || 'Cannot save component',
                        'Error Saving template',
                      );
                      return;
                    }

                    templateData.templateInfo.id = tplSave.component.id;
                    component.properties.template = templateData; //update component properties with new template data

                    //Resync the edited component behavior with the new template
                    component.title = templateData.templateInfo.name;
                    component.description = templateData.templateInfo.description;

                    component.domElement.querySelector('.internal-name').textContent =
                      `T: ${templateData.templateInfo.name}`;
                    const titleBar = component.domElement.querySelector('.title-bar');
                    if (titleBar) {
                      titleBar.querySelector('.title .text').textContent =
                        templateData.templateInfo.name;
                      titleBar.querySelector('.description .text').textContent =
                        templateData.templateInfo.description;
                      const collection = collectionsCache.find(
                        (c) => c.value === templateData.templateInfo.collection,
                      );
                      const iconElement = titleBar.querySelector('.icon') as HTMLElement;
                      let icon = templateData.templateInfo.icon || '';
                      let color = templateData.templateInfo.color || '#000000';
                      if (icon.startsWith('<svg')) {
                        iconElement.className = `icon w-6 h-6`;

                        const svg = icon.replace(/<path/g, `<path`);
                        iconElement.innerHTML = `${svg}`;

                        const allPathes = iconElement.querySelectorAll('path');
                        const pathFill = [...allPathes].find(
                          (p) => p.getAttribute('fill') && p.getAttribute('fill') !== 'none',
                        );
                        if (!pathFill) {
                          allPathes.forEach((p) => p.setAttribute('fill', color));
                        }
                      } else {
                        iconElement.className = `icon tpl-fa-icon ${icon}`;
                        iconElement.innerHTML = '';
                        iconElement.style.backgroundColor = '';
                        iconElement.style.color = color;
                      }
                    }

                    if (creatingTemplate) {
                      //if this is a template creation from original component, the current component is now a template
                      //we need to set the settings appropriately, in order to have a consistent behavior
                      component.data._templateVars = component.data._templateVars || {};

                      let templateSettingsEntries = null;
                      if (component.properties.template) {
                        templateSettingsEntries = {};

                        const templateData = component.data._templateVars;
                        for (let name in component.templateSettings) {
                          const setting = component.templateSettings[name];
                          const entry = { ...setting, value: templateData[name] };
                          if (setting?.type === 'composite') {
                            templateSettingsEntries[name] = syncCompositeValues(entry);
                          } else {
                            templateSettingsEntries[name] = entry;
                          }
                        }
                      }
                      component.settingsEntries = templateSettingsEntries;
                    }

                    creatingTemplate = false;
                    component.workspace.saveAgent();
                    if (creatingTemplate) successToast('Component Template Created');
                    else successToast('Component Template Updated');
                  } catch (error) {
                    console.log('error saving template', error);
                    errorToast('Error saving template');
                  }
                },
              },
            };

            component.setTemplateEditMode();
            sidebarEditValues({
              title: `Template Editor : ${templateName}`,
              entriesObject: createTemplateEntries,
              features: { templateVars: true },
              actions: createTemplateActions,
              onSave: onSave.bind(component),
              onBeforeCancel: onBeforeCancelTemplate,
              onCancel,
              onLoad: onTemplateCreateLoad.bind(component),
              component,
            });
          },
        },
      };

  // Generate the sidebar title HTML using the new function
  const sidebarTitleHTML = generateSidebarTitleHTML(component);
  const componentClass = component.constructor.name;
  let helpTooltip = '';
  switch (componentClass) {
    case 'ServerlessCode':
      helpTooltip =
        'Run scalable, cloud-based code. This option supports npm packages and third-party libraries, making it perfect for more complex, enterprise-level workflows.';
      break;
    case 'Code':
      helpTooltip =
        'Execute pure JavaScript in a secure, sandboxed environment—ideal for lightweight tasks.';
      break;
    default:
      helpTooltip = '';
  }
  //show settings
  // Remove bottom Save/Cancel actions; saving will be handled by the close 'x' button

  sidebarEditValues({
    title: sidebarTitleHTML,
    entriesObject: { Settings: component.settingsEntries },
    features: { templateVars: true },
    actions: sidebarActions || null,
    onSave: onSave.bind(component),
    onDraft: async function (values) {
      await onDraft.apply(component, [values]);
    },
    onBeforeCancel: onBeforeCancelSettings,
    onCancel,
    onLoad: onComponentLoad.bind(component),
    helpTooltip: helpTooltip,
    isSettingsChanged: isSettingsChanged.bind(component),
    component: component,
  });

  component.emit('settingsOpened', component.getSettingsSidebar());
}

let collectionsCache;
async function getComponentsCollections() {
  if (collectionsCache) return collectionsCache;
  console.log('getComponentsCollections');
  const result = await fetch('/api/page/builder/app-config/collections')
    .then((res) => res.json())
    .catch((err) => []); // for backward compatibility with CE
  if (result.error) {
    errorToast('Error fetching collections');
    return [];
  }
  console.log('collectionResult', result);
  const collectionResult = result?.collections || [];

  collectionsCache = collectionResult.map((c) => ({
    value: c.id,
    text: c.name,
    color: c.color || '#000000',
    icon: c.icon,
  }));
  return collectionsCache;
}
async function saveComponentTemplate(id: any | null, data: any, publish = false) {
  let url = '/api/page/builder/app-config/components';
  if (id) url += `/${id}`;

  const name = data?.templateInfo?.name || data.name;
  const collectionId = data?.templateInfo?.collection || null;
  const body = { name, data: JSON.stringify(data), collectionId, visible: publish };
  const result = await fetch(url, {
    method: id ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then((res) => res.json());
  return result;
}

/**
 * Generates the HTML string for the component's title display in the settings sidebar.
 * Includes the component icon and its name.
 * Prioritizes logoUrl if available and is a valid string.
 * Otherwise, uses iconCSSClass to render Font Awesome, inline SVG, or CSS class-based icons.
 * For CSS class icons, a base color is applied, potentially overridden by specific CSS rules (using !important where needed).
 * Allows for conditional sizing based on specific CSS classes.
 * @param component - The Component instance.
 * @returns {string} HTML string for the sidebar title.
 */
function generateSidebarTitleHTML(component: Component): string {
  // Get the base name for the title, preferring template info if available
  const templateName: string =
    component.properties?.template?.templateInfo?.name || component.title || '';

  // Attempt to get logoUrl from component data or component itself
  // @ts-ignore
  let logoUrl: string | undefined | null = component.data?.logoUrl || component?.logoUrl;

  let iconHTML = ''; // Initialize icon HTML string

  // Define classes that require larger dimensions
  // *** YOU NEED TO ADD THE ACTUAL CLASS NAMES HERE ***
  const increaseSizeClasses: string[] = [
    'LogicAND',
    'LogicOR',
    'LogicXOR',
    'LogicAtLeast',
    'LogicAtMost',
    'Await',
    'MultimodalLLM',
    'LLMAssistant',
  ];

  // Define classes whose original CSS color should be forced (!important)
  const retainOriginalColorClasses: string[] = [
    'APIEndpoint',
    'GenAILLM',
    'ImageGenerator',
    'Classifier',
    'Note',
    'APIOutput',
    // Add any other class names here if needed
  ];

  // Determine default and potentially larger size class
  let sizeClass = 'w-6 h-6'; // Default size (24px)
  let iconCSSClassForSizing: string = ''; // Will hold the relevant class string for size check

  // **Priority 1: Use logoUrl if it's a valid, non-empty string**
  if (!logoUrl && component?.drawSettings?.iconCSSClass === 'svg-icon HuggingFace') {
    logoUrl = 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg';
  }

  if (typeof logoUrl === 'string' && logoUrl.trim() !== '') {
    // Check if logoUrl related components might need larger size (using templateName as a proxy, adjust if needed)
    if (increaseSizeClasses.some((cls) => templateName.includes(cls))) {
      // Simple check, adjust logic if needed
      sizeClass = 'w-8 h-8'; // Larger size (32px)
    }
    // Use an img tag for the logo URL, applying determined styling for alignment and size
    iconHTML = `<img src="${logoUrl}" alt="${templateName} icon" class="inline-block align-middle ${sizeClass} object-contain rounded">`;
  } else {
    // **Priority 2: Use iconCSSClass logic if logoUrl is not available or invalid**
    let iconCSSClass: string = component.drawSettings.iconCSSClass || ''; // Get CSS class, default to empty string
    iconCSSClassForSizing = iconCSSClass; // Use this class string for size check
    const forcedIconColor = '#242424'; // Base color for icons unless overridden by specific CSS

    // Check if any specified class requires a larger size
    if (increaseSizeClasses.some((cls) => iconCSSClassForSizing.includes(cls))) {
      sizeClass = 'w-8 h-8'; // Set larger size
    }

    // Handle Font Awesome icons (prefixed with 'fa')
    if (iconCSSClass.startsWith('fa')) {
      const faClass = iconCSSClass.includes('tpl-fa-icon')
        ? iconCSSClass
        : `tpl-fa-icon ${iconCSSClass}`;
      // Apply forced color and size/alignment via inline style for Font Awesome
      // Note: FA size is controlled by font-size, Tailwind w/h classes might not directly apply here, adjust style if needed.
      // Using vertical-align: middle helps align it with text. Font-size is slightly increased for visibility.
      iconHTML = `<i class="${faClass} inline-block align-middle" style="color: ${forcedIconColor}; font-size: 1.5rem; vertical-align: middle;"></i>`; // 1.5rem ~ 24px

      // Handle inline SVG markup (starts with '<svg')
    } else if (iconCSSClass.trim().startsWith('<svg')) {
      let svgContent: string = iconCSSClass;

      // Remove existing fill attributes from path and svg elements to allow applying the forced color
      svgContent = svgContent.replace(/<path[^>]*?\sfill="[^"]*"[^>]*>/g, (match) => {
        return match.replace(/\sfill="[^"]*"/, ''); // Remove from <path>
      });
      svgContent = svgContent.replace(/<svg[^>]*?\sfill="[^"]*"[^>]*>/g, (match) => {
        return match.replace(/\sfill="[^"]*"/, ''); // Remove from <svg>
      });

      // Add the forced fill color and ensure standard width/height classes are present
      if (!svgContent.includes('class="')) {
        // If no class attribute exists, add one with fill and sizing
        svgContent = svgContent.replace(
          '<svg',
          `<svg fill="${forcedIconColor}" class="w-full h-full"`,
        );
      } else {
        // If class attribute exists, add fill attribute and ensure sizing classes
        svgContent = svgContent.replace('<svg', `<svg fill="${forcedIconColor}"`);
        if (!svgContent.includes('w-full')) {
          svgContent = svgContent.replace(/class="([^"]*)"/, `class="$1 w-full"`);
        }
        if (!svgContent.includes('h-full')) {
          svgContent = svgContent.replace(/class="([^"]*)"/, `class="$1 h-full"`);
        }
      }

      // Wrap the modified SVG in a span with the determined size class for consistent sizing and alignment
      iconHTML = `<span class="inline-block align-middle ${sizeClass}">${svgContent}</span>`;

      // Handle CSS Class Icons (e.g., 'svg-icon GenAILLM')
    } else if (iconCSSClass) {
      // Ensure the base 'svg-icon' class is present
      if (!iconCSSClass.includes('svg-icon')) {
        iconCSSClass = `svg-icon ${iconCSSClass}`;
      }

      // Determine if the current icon class is in the list to retain original color (force !important)
      const retainColor = retainOriginalColorClasses.some((cls) => iconCSSClass.includes(cls));

      // Conditionally apply !important based on whether the color should be retained or just have a base
      const styleAttribute = `background-color: ${forcedIconColor}${
        retainColor ? ' !important' : ''
      };`;

      // Create the span element with the necessary classes (including size) and the style
      iconHTML = `<span class="${iconCSSClass} ${sizeClass} inline-block align-middle" style="${styleAttribute}"></span>`;
    }
    // If none of the conditions match (no logoUrl, no valid/known iconCSSClass), iconHTML remains an empty string ''.
  }

  // Combine the generated icon HTML (if any) and the title text into the final sidebar title structure
  const sidebarTitleHTML = `
    <div class="inline-flex items-center gap-2 max-w-full min-w-0">
      <span class="shrink-0 inline-flex items-center">${iconHTML}</span>
      <span class="relative min-w-0 max-w-full flex-1">
        <span class="truncate block min-w-0 max-w-full leading-tight">${templateName}</span>
        <div
          role="tooltip"
          class="absolute left-0 top-full mt-1 z-50 inline-block text-sm w-max bg-black shadow-lg text-white py-2 px-4 rounded-lg opacity-0 invisible tooltip whitespace-normal break-words text-left max-w-full pointer-events-none"
        >
          ${templateName}
        </div>
      </span>
    </div>
  `;

  return sidebarTitleHTML;
}
