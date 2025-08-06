import { editValuesDialog } from '../ui/tw-dialogs';

window['__GLOBAL_TEMPLATE_VARIABLES__'] = new Map();

export function registerGlobalVars(workspace) {
  const globalVarsButton = document.createElement('button');
  //globalVarsButton.className = 'px-3 py-1 text-white transition-opacity rounded-md w-full text-xs sm:w-auto hover:opacity-75 bg-indigo-400';
  //globalVarsButton.className =
  //('agent-vars-btn w-full px-4 my-6 py-2 text-center text-white transition-colors bg-indigo-400 hover:opacity-75 rounded-lg focus:outline-none');

  globalVarsButton.className =
    'mt-2 w-9 px-3 py-2 hover:opacity-75 relative bg-primary-100 text-white text-sm duration-200 font-bold text-center';
  globalVarsButton.innerHTML = `Manage`;
  const globalVarsTextarea = document.createElement('textarea');
  globalVarsTextarea.className = 'hidden';
  globalVarsTextarea.setAttribute('readonly', 'true');
  globalVarsTextarea.id = 'global-vars-textarea';

  const container = document.createElement('div');
  const leftSidebarContainer = document.getElementById('agent-global-variables-button');
  // container.className = 'relative w-40';
  container.className = 'relative'; // commented out as it is currently hidden and taking space
  container.appendChild(globalVarsTextarea);

  if (leftSidebarContainer) {
    container.appendChild(globalVarsButton);
    leftSidebarContainer.appendChild(globalVarsButton);
    leftSidebarContainer.appendChild(globalVarsTextarea);
  }

  const agentStatus = document.getElementById('agent-status');

  function updateGlobalVars(agent) {
    globalVarsTextarea.value = JSON.stringify(agent.data.variables || {}, null, 2);

    // set global vars initially
    setGlobalVars(agent.data.variables);

    globalVarsButton.onclick = async () => {
      console.log('Agent Loaded : handling global vars', agent);
      const globalVarsValues: any = await editValuesDialog({
        title: `Agent Variables`,
        content:
          '<div class="px-2 py-2">The declared Agent Variables are available to all components</div>',
        fields: {
          _globalVars: {
            type: 'key-value',
            rel: '#global-vars-textarea',
            //attributes: { 'data-template-vars': 'true' },
            keyField: {
              attributes: { placeholder: 'Name' },
            },
            valueField: {
              attributes: { placeholder: 'Value', 'data-vault': 'ALL_NON_GLOBAL_KEYS' },
            },
          },
        },
      });

      if (!globalVarsValues) return;

      console.log('Global Vars : ', globalVarsValues);
      globalVarsTextarea.value = JSON.stringify(globalVarsValues._globalVars, null, 2);

      // clone globalVarsTextarea and globalVarsButton
      //const clonedGlobalVarsTextarea = globalVarsTextarea.cloneNode(true);
      //const clonedGlobalVarsButton = globalVarsButton.cloneNode(true);

      // append clonedGlobalVarsTextarea and clonedGlobalVarsButton to the leftSidebarContainer
      // leftSidebarContainer.appendChild(clonedGlobalVarsTextarea);
      // leftSidebarContainer.appendChild(clonedGlobalVarsButton);

      const variables = globalVarsValues._globalVars;

      agent.data.variables = variables;

      // set global vars when modified
      setGlobalVars(variables);

      workspace.saveAgent();
    };

    agentStatus.appendChild(container);
    // if (agentBehaviorTA) {
    //     agentBehaviorTA.after(container);
    // }
  }

  workspace.addEventListener('AgentLoaded', updateGlobalVars);
  workspace.addEventListener('agentUpdated', updateGlobalVars);
}

function setGlobalVars(variables = {}) {
  window['__GLOBAL_TEMPLATE_VARIABLES__'].clear();
  for (const [key, value] of Object.entries(variables)) {
    window['__GLOBAL_TEMPLATE_VARIABLES__'].set(key, { var: `{{${key}}}`, type: 'global' });
  }
}
