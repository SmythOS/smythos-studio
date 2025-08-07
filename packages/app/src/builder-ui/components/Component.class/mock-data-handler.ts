import { Component } from '../Component.class';
import { twEditValuesWithCallback, closeTwDialog } from '../../ui/tw-dialogs';
import { parseJson } from '../../utils/data.utils';
import { JsonFieldSynchronizer } from '../../lib/JsonFieldSynchronizer.class';
import { JSON_FIELD_CLASS } from '../../constants';
import { PostHog } from '../../services/posthog';
import { lsCache } from '../../../shared/Cache.class';
import { Workspace } from '../../workspace/Workspace.class';
import { MOCK_DATA_CACHE_KEY } from '../../../shared/constants/general';

declare var workspace: Workspace;

// #region Mock data storage

// TODO: apply proper clean up strategy when component/agent is removed.

export async function isMockDataEnabled(componentId: string) {
  const mockData = await getMockData(componentId);
  return mockData?.enabled === true;
}

export async function getMockData(componentId: string) {
  const allMockData = lsCache.get(MOCK_DATA_CACHE_KEY) || {};
  let data = allMockData?.[componentId];

  if (!data) {
    try {
      const agentId = workspace?.agent?.id;
      const res = await fetch(`/api/page/builder/mock-data/${agentId}/${componentId}`);
      const resJson = await res.json();
      data = resJson?.data;

      lsCache.set(MOCK_DATA_CACHE_KEY, { ...allMockData, [componentId]: data });
    } catch (error) {
      console.warn('Failed to fetch mock data:');
    }
  }

  return data || {};
}

async function insertOrUpdateMockData(componentId: string, mockData: Record<string, any>) {
  const _mockData = {
    ...mockData,
    updatedAt: new Date().toISOString(), // We can use updatedAt field to clear old mock data if needed
  };
  try {
    const agentId = workspace?.agent?.id;
    const saveMockData = await fetch(`/api/page/builder/mock-data/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [componentId]: _mockData }),
    });

    if (saveMockData.ok) {
      // Update local storage
      const allMockData = lsCache.get(MOCK_DATA_CACHE_KEY) || {};
      const existingMockData = allMockData?.[componentId] || {};

      const newMockData = { ...existingMockData, ..._mockData };
      allMockData[componentId] = newMockData;

      lsCache.set(MOCK_DATA_CACHE_KEY, allMockData);
    }
  } catch {
    console.warn('Failed to save Mock Data');
  }
}
// #endregion Mock data storage

// #region Mock data configuration dialog
type MockDataButtonState = {
  icon: string;
  label: string;
  color: string;
};

export const MOCK_DATA_BTN_CONFIG: Record<string, string> = {
  BUTTON_CLASS: '_mock_data_toggle_btn',
  SAVE_BTN_CLASS: '_mock_data_save_btn',
  SAVE_BTN_LABEL_CLASS: '_mock_data_save_btn__label',
  LABEL_CLASS: '_btn_label',
  ICON_CLASS: '_btn_icon',
};
const MOCK_DATA_BTN_STATE: Record<'ENABLED' | 'DISABLED', MockDataButtonState> = {
  ENABLED: {
    icon: 'fa-toggle-on',
    label: 'Mock Data Enabled',
    color: 'text-[#3C89F9]',
  },
  DISABLED: {
    icon: 'fa-toggle-off',
    label: 'Use Mock Data',
    color: 'text-grey-600',
  },
};
export function saveMockOutputs(component: Component) {
  return new Promise(async (resolve, reject) => {
    const createInputList = async (array, type) => {
      // #region[mock_data] get mock data
      const mockData = await getMockData(component.uid);
      const existingOutputs = mockData?.data?.outputs || {};
      // #endregion

      return array
        .map((el, index) => {
          // #region[mock_data] get value from mock data
          let value: string = existingOutputs?.[el?.name] ?? '';

          value = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          // #endregion[mock_data]

          const fieldClasses = el?.fieldClasses || '';
          const attributes = Object.entries(el?.attributes || {})
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');

          if (el.type === 'file') {
            return `
              <div class="flex mb-5">
                <span class="inline-flex w-40 items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600 break-all">
                  ${el.name}
                </span>
                <input type="file" name="${el.name}" id="${type}-input-${index}" class="${type}-input input
                  block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4 file:rounded-md
                  file:border-0 file:text-sm file:font-semibold
                  file:bg-gray-200 file:text-gray-900
                  hover:file:bg-gray-300 pl-5
                " multiple>
              </div>`;
          } else {
            return `
              <div class="flex mb-5">
                <span class="inline-flex w-40 items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600 break-all">
                  ${el.name}
                </span>
                <textarea id="${type}-input-${index}" name="${el.name}" class="${type}-input input block p-1 w-full text-sm text-gray-900 bg-gray-50 rounded-e-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${fieldClasses}" style="min-height:44px; height: 44px;" ${attributes}>${value}</textarea>
              </div>`;
          }
        })
        .join('');
    };

    const outputEndpoints = [...component.domElement.querySelectorAll('.output-endpoint')].map(
      (outputEP: HTMLElement) => {
        const name = outputEP.getAttribute('smt-name');
        const expression = outputEP.getAttribute('smt-expression') || name;

        return {
          name,
          expression,
          fieldClasses: JSON_FIELD_CLASS,
          attributes: {
            'data-expression': expression,
          },
        };
      },
    );

    const outputsContent = await createInputList(outputEndpoints, 'outputs');

    twEditValuesWithCallback({
      title: 'Configure Mock Output Data',
      content: `
        <div class="mb-4">
          <p class="text-xs text-gray-500">
            Mock output data allows you to test your component without requiring actual API keys or credentials. 
            Configure sample responses below to simulate the component's behavior.
          </p>
        </div>
        ${outputsContent}
      `,
      actions: [
        {
          label: `<span class="flex items-center gap-2">
                  <span class="fa-solid fa-save"></span>
                  <span class="!text-[#3b82f6] group-hover:!text-white ${MOCK_DATA_BTN_CONFIG.SAVE_BTN_LABEL_CLASS}">Save</span>
                </span>`,
          cssClass: `border border-[#3b82f6] bg-white hover:bg-[#3b82f6] group transition-all duration-200 !text-[#3b82f6] hover:!text-white ${MOCK_DATA_BTN_CONFIG.SAVE_BTN_CLASS}`,
          callback: async (_, dialog) => {
            const saveBtn = dialog.querySelector(`.${MOCK_DATA_BTN_CONFIG.SAVE_BTN_CLASS}`);
            const btnLabel = saveBtn.querySelector(`.${MOCK_DATA_BTN_CONFIG.SAVE_BTN_LABEL_CLASS}`);

            saveBtn.disabled = true;
            saveBtn?.classList.add('cursor-not-allowed');
            btnLabel.textContent = 'Saving...';

            const outputFileValue = {};
            const outputs = Array.from(dialog.querySelectorAll('.outputs-input.input')).reduce(
              (obj, el: any, index) => {
                let val;
                try {
                  if (outputFileValue[index]) {
                    val = outputFileValue[index].value;
                  } else {
                    val = parseJson(el.value) || el.value;
                  }
                } catch (e) {
                  val = el.value;
                }
                obj[outputEndpoints[index].name] = val;
                return obj;
              },
              {},
            );

            try {
              await insertOrUpdateMockData(component.uid, { enabled: true, data: { outputs } });

              PostHog.track('app_set_mock_data');

              resolve('saved');
            } finally {
              saveBtn.disabled = false;
              saveBtn?.classList.remove('cursor-not-allowed');
              btnLabel.textContent = 'Save';

              closeTwDialog(dialog);
            }
          },
        },
      ],
      onCloseClick: (_, dialog) => {
        reject('close'); // Need to reject on close to reset mock data toggle button loading state
        closeTwDialog(dialog);
      },
      onDOMReady: function (dialog) {
        const synchronizer = new JsonFieldSynchronizer(dialog.querySelector('.__content'), {
          jsonFieldClass: JSON_FIELD_CLASS,
        });

        // Align actions to the right
        const actionsWrapper = dialog.querySelector('.__actions');
        actionsWrapper.classList.remove('justify-center');
        actionsWrapper.classList.add('justify-end');
      },
    });
  });
}
// #endregion  Mock data configuration dialog

// #region  UI status management

/**
 * Utility for managing debug/mock data Debug Inject output fields
 */
export const DebugInjectOutputFields = {
  /**
   * Gets all output fields from the dialog and returns them with their attributes
   * @param dialog - The HTML dialog element containing output fields
   * @returns Array of output fields with their attributes
   */
  getOutputFields(dialog: HTMLElement): Array<HTMLTextAreaElement> {
    const outputFields = dialog.querySelectorAll(
      '.outputs-input.input',
    ) as NodeListOf<HTMLTextAreaElement>;

    return Array.from(outputFields);
  },

  /**
   * Sets mock data values to output fields in the dialog
   * @param componentId - ID of the component
   * @param dialog - Dialog HTML element
   */
  async setMockData(componentId: string, dialog: HTMLElement): Promise<void> {
    try {
      const mockData = await getMockData(componentId);
      const mockedOutputs = mockData?.data?.outputs || {};

      this.getOutputFields(dialog).forEach((field) => {
        // Set field value from mock data
        const fieldName = field.getAttribute('name') || '';
        let value: string = mockedOutputs[fieldName] ?? '';
        value = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

        field.value = value;
      });
    } catch (error) {
      console.error('Failed to set mock data:', error);
    }
  },

  /**
   * Applies JSON field synchronizer to output fields
   * @param dialog - Dialog HTML element
   */
  applyJsonFieldSynchronizer(dialog: HTMLElement): void {
    try {
      this.getOutputFields(dialog).forEach((field) => {
        const name = field.getAttribute('name') || '';
        const expression = field.getAttribute('smt-expression') || name;

        field.classList.add(JSON_FIELD_CLASS);
        field.setAttribute('data-expression', expression);
      });

      const outputsContainer = dialog.querySelector('#outputs');
      if (!outputsContainer) return;

      new JsonFieldSynchronizer(outputsContainer, {
        jsonFieldClass: JSON_FIELD_CLASS,
      });
    } catch (error) {
      console.error('Failed to apply JSON field synchronizer:');
    }
  },
};

export async function toggleMockOutputPills(component: Component) {
  const outputEndpoints = [...component.domElement.querySelectorAll('.output-endpoint')];

  const mockDataEnabled = await isMockDataEnabled(component.uid);

  if (mockDataEnabled) {
    const mockData = await getMockData(component.uid);

    for (const endpoint of outputEndpoints) {
      const name = endpoint.getAttribute('smt-name');
      let value = mockData?.data?.outputs?.[name];
      if (value) {
        endpoint.setAttribute(
          'smt-mock-data',
          typeof value === 'object' ? JSON.stringify(value) : value,
        );
      }
    }
  } else {
    outputEndpoints.forEach((ep) => {
      ep.removeAttribute('smt-mock-data');
    });
  }
}

export const MockDataToggleButtonState = {
  elements(component: Component) {
    return {
      button: component.domElement.querySelector(`.${MOCK_DATA_BTN_CONFIG.BUTTON_CLASS}`),
      label: component.domElement.querySelector(`.${MOCK_DATA_BTN_CONFIG.LABEL_CLASS}`),
      icon: component.domElement.querySelector(`.${MOCK_DATA_BTN_CONFIG.ICON_CLASS}`),
    };
  },
  turnOn(component: Component) {
    const { button, label, icon } = this.elements(component);

    button.classList.remove(MOCK_DATA_BTN_STATE.DISABLED.color);
    button.classList.add(MOCK_DATA_BTN_STATE.ENABLED.color);

    label.textContent = MOCK_DATA_BTN_STATE.ENABLED.label;

    icon.classList.remove(MOCK_DATA_BTN_STATE.DISABLED.icon);
    icon.classList.add(MOCK_DATA_BTN_STATE.ENABLED.icon);
  },

  turnOff(component: Component) {
    const { button, label, icon } = this.elements(component);

    button.classList.remove(MOCK_DATA_BTN_STATE.ENABLED.color);
    button.classList.add(MOCK_DATA_BTN_STATE.DISABLED.color);

    label.textContent = MOCK_DATA_BTN_STATE.DISABLED.label;

    icon.classList.remove(MOCK_DATA_BTN_STATE.ENABLED.icon);
    icon.classList.add(MOCK_DATA_BTN_STATE.DISABLED.icon);
  },

  /**
   * Enters loading state for the toggle button
   * @param component - Target component instance
   */
  setLoadingState(component: Component) {
    const { button } = this.elements(component);

    if (button.classList.contains('text-[#3C89F9]')) {
      button.classList.remove('text-[#3C89F9]');
    }

    button.disabled = true;
    button.classList.add('cursor-not-allowed');
  },

  /**
   * Exits loading state for the toggle button
   * @param component - Target component instance
   */
  clearLoadingState(component: Component) {
    const { button } = this.elements(component);
    button.disabled = false;
    button.classList.remove('cursor-not-allowed');
  },
};

const pendingButtonOps = new Set<string>();

export async function addMockDataToggleButton(component: Component) {
  const componentId = component.uid;

  /**
   * Prevents concurrent executions of addMockDataToggleButton for the same component.
   *
   * This protection mechanism is necessary because the parent checkSettings function
   * is often called without awaiting its promise, which means addMockDataToggleButton
   * could be invoked multiple times for the same component, leading to:
   * 1. Race conditions in UI updates (e.g., duplicate toggle buttons)
   * 2. Inconsistent component state
   *
   * The pattern works by:
   * - Adding the component's UID to the pendingButtonOps Set at the start
   * - Returning early if the UID is already in the Set
   * - Removing the UID from the Set once processing completes (or if an error occurs)
   */
  if (pendingButtonOps.has(componentId)) return;
  pendingButtonOps.add(componentId);

  try {
    const mockDataEnabled = await isMockDataEnabled(componentId);
    const mockDataState = mockDataEnabled ? 'ENABLED' : 'DISABLED';

    let btnLabel = MOCK_DATA_BTN_STATE[mockDataState].label;
    let btnIcon = MOCK_DATA_BTN_STATE[mockDataState].icon;
    let btnColor = MOCK_DATA_BTN_STATE[mockDataState].color;

    component.addComponentButton(
      `<div class="fa-solid ${btnIcon} text-base _btn_icon"></div>
       <span class="ml-2 font-semibold _btn_label">${btnLabel}</span>`,
      ' ',
      {
        class: `${MOCK_DATA_BTN_CONFIG.BUTTON_CLASS} ${btnColor} transition-opacity duration-300`,
        customStyle: 'toggle',
        position: 'top',
      },
      async () => {
        try {
          const toggleMockData = async () => {
            const mockDataEnabled = await isMockDataEnabled(componentId);

            if (mockDataEnabled) {
              await insertOrUpdateMockData(component.uid, { enabled: false });
              MockDataToggleButtonState.turnOff(component);
            } else {
              PostHog.track('app_mock_screen_impression', {
                source: 'use_mock_data_button',
              });
              await saveMockOutputs(component);
              MockDataToggleButtonState.turnOn(component);
            }
          };

          MockDataToggleButtonState.setLoadingState(component);

          await toggleMockData();
          await toggleMockOutputPills(component);
        } catch (error) {
          console.error('Failed to toggle mock data');
        } finally {
          MockDataToggleButtonState.clearLoadingState(component);
        }
      },
    );
  } finally {
    // Always remove from pending set when done, regardless of success or failure
    pendingButtonOps.delete(componentId);
  }
}
// #endregion UI status management
