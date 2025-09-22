import { PRIMARY_BUTTON_STYLE } from '@src/react/shared/constants/style';
import { plugins, PluginTarget, PluginType } from '@src/react/shared/plugins/Plugins';
import { errorToast, successToast } from '@src/shared/components/toast';
import { EMBODIMENT_DESCRIPTIONS, SMYTHOS_DOCS_URL } from '../../../shared/constants/general';
import { EmbodimentRPCManager } from '../../../shared/services/embodiment_rpc_manager';
import { builderStore } from '../../../shared/state_stores/builder/store';
import { userSettingKeys } from '../../../shared/userSettingKeys';
import { Component } from '../../components/Component.class';
import { PostHog } from '../../services/posthog';
import {
  confirm,
  createEmbodimentSidebar,
  getCurrentSidebarTab,
  hideOverlay,
  modalDialog,
  openEmbodimentSidebar,
  setEmbodimentHandlers,
  showOverlay,
} from '../../ui/dialogs';
import {
  renderAgentSettingsSidebar,
  renderEndpointFormPreviewSidebar,
} from '../../ui/react-injects';
import { rightSidebarTitle } from '../../ui/right-sidebar-title';
import { createSpinner, delay } from '../../utils';
import { Workspace } from '../../workspace/Workspace.class';
import { openLLMEmbodiment } from './llm-embodiment';
declare var Metro, $;
let workspace: Workspace;

// TODO: FULL revamp for handling embodiment dialogs. It is a real mess!!!! (build it in React)

function setupAgentSettingsScripts() {
  renderAgentSettingsSidebar({ rootID: 'agent-settings-root' });
}

export async function setupAgentScripts(_workspace: Workspace) {
  workspace = _workspace;

  handleAgentEvents();
  initializeRecentAgentsDropdown();

  const agentId = await loadAgent();
  handleAgentSettings(agentId);
  setupAgentSettingsScripts();

  // workspace.addEventListener('deploymentsUpdated', (event: CustomEvent) => {
  //   updateProdDomainHandler(event);
  // });
}

function waitWorkspaceServerData() {
  return new Promise((resolve, reject) => {
    let maxTries = 10;
    const itv = setInterval(() => {
      if (workspace.serverData.docUrl) {
        clearInterval(itv);
        resolve(true);
      }

      if (maxTries-- <= 0) {
        clearInterval(itv);
        resolve(false);
      }
    }, 100);
  });
}

function createAgent() {
  return new Promise(async (resolve, reject) => {
    const studio = document.querySelector('#studio') as HTMLElement;
    studio?.classList.add('hidden');

    const params = new URLSearchParams(window.location.search);
    const templateId = params.get('templateId');

    const newAgentModal = document.querySelector('#newAgentModal');
    const agentNameInput = document.querySelector('#newAgentModal .agentName') as HTMLInputElement;
    const agentNameError = document.querySelector('#newAgentModal .name-error') as HTMLElement;
    const agentDescriptionTA = document.querySelector(
      '#newAgentModal .agentDescription',
    ) as HTMLTextAreaElement;
    const agentCreateBtn = document.querySelector('#newAgentModal .btnCreate') as HTMLButtonElement;
    const agentTemplate = document.querySelector(
      '#newAgentModal .agentTemplate',
    ) as HTMLSelectElement;

    if (!templateId) {
      //newAgentModal.classList.add('hidden');
      hideOverlay(false, 100);
    }

    agentNameError.classList.add('hidden');
    // agentNameInput.value = 'My Agent';
    agentNameInput.value = 'Untitled Agent';
    agentDescriptionTA.value = '';
    // newAgentModal.classList.remove('hidden'); // * We'll remove the New Agent creation form

    agentTemplate.innerHTML =
      '<option value="NONE">Select Template</option><option value="NONE">Empty Agent</option>';

    function inputLengthCheck(input, min, max) {
      return input.trim().length >= min && input.trim().length <= max;
    }
    function handleSubmitFormButtonState() {
      agentCreateBtn.disabled = !inputLengthCheck(agentNameInput.value, 3, 60);
    }
    function handleNameChange(skipErrors = false) {
      let agentNameLength = agentNameInput.value.trim().length;
      let isAgentNameInValid = agentNameLength < 3 || agentNameLength > 60;
      if (!skipErrors) {
        agentNameError.innerText =
          agentNameLength < 3
            ? 'Name should be at least 3 characters long.'
            : agentNameLength > 60
              ? 'Name should not be more than 60 characters long.'
              : '';

        agentNameError.classList.toggle('hidden', !isAgentNameInValid);
      }
      handleSubmitFormButtonState();
    }
    handleNameChange(true);

    let templates = await loadAgentTemplatesList();
    if (templates) {
      for (let tplId in templates) {
        const template = templates[tplId];
        const option = document.createElement('option');
        option.value = tplId;
        option.innerText = template.name;
        if (templateId && tplId == templateId) option.setAttribute('selected', '');
        agentTemplate.appendChild(option);
      }
    } else {
      templates = {};
    }

    agentTemplate.onchange = () => {
      const selectedTemplateId = agentTemplate.options[agentTemplate.options.selectedIndex].value;
      const jsonData = templates[selectedTemplateId]?.template;
      if (jsonData) {
        agentDescriptionTA.value = jsonData.description;
        agentNameInput.value = templates[selectedTemplateId]?.name || '';
        handleNameChange();
      }
    };

    //trigger the change event to load the first template
    agentTemplate.dispatchEvent(new Event('change'));
    agentNameInput.oninvalid = (e) => {
      e.preventDefault();
      agentNameInput.setCustomValidity('');
      handleNameChange();
    };

    agentNameInput.oninput = () => {
      agentNameInput.setCustomValidity('');
      handleNameChange();
    };

    agentNameInput.onkeyup = (e) => {
      handleNameChange();
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const createAgentClick = async () => {
      newAgentModal.classList.add('hidden');
      //toast('<b>Initializing Agent ...</b>', '');

      showOverlay('Creating Agent ...');
      const selectedTemplateId = agentTemplate.options[agentTemplate.options.selectedIndex].value;

      let jsonData = templates[selectedTemplateId]?.template;

      let jsonDescription = false;
      if (!jsonData) {
        try {
          jsonData = JSON.parse(agentDescriptionTA.value);
          if (!jsonData?.components || !jsonData?.version) jsonData = null;
          jsonDescription = true;
        } catch {}
      }

      await delay(200);

      const result = await workspace.createAgent(
        agentNameInput.value,
        jsonDescription ? '' : agentDescriptionTA.value,
        (data) => {
          if (jsonData) {
            //import template data
            data.components = jsonData.components;
            data.connections = jsonData.connections;
            data.description = jsonData.description;
            data.version = jsonData.version;
            data.templateInfo = jsonData.templateInfo;
            data.variables = jsonData.variables;
            data.behavior = jsonData.behavior;
          }
        },
      );

      if (result) {
        if (jsonData) {
          //toast('Agent created<br /><b>Importing Template please wait...</b>', '');
          showOverlay('Loading Template Data ...');
          // * hide overlay will be called from workspace.import
        }

        newAgentModal.classList.add('hidden');
        studio?.classList.remove('hidden');

        //Agent created, do we have a chatMessage query param?
        const urlParams = new URLSearchParams(window.location.search);
        const chat = urlParams.get('chat');
        if (chat) {
          localStorage.setItem(
            'chatMessage',
            JSON.stringify({ message: chat, ttl: Date.now() + 1000 * 60 * 3 }),
          );
          setTimeout(
            () => {
              try {
                const item = JSON.parse(localStorage.getItem('chatMessage'));
                if (item.ttl < Date.now()) localStorage.removeItem('chatMessage');
              } catch {}
            },
            1000 * 60 * 3.1,
          );
        }

        resolve(workspace.agent.id);
      } else {
        showOverlay('<span class="text-red-700/70">Could not create agent</span>');
        //toast('Agent Creation failed', 'Info', 'alert');
      }
    };

    // agentCreateBtn.onclick = createAgentClick; // * We'll remove the New Agent creation form
    createAgentClick();

    if (templateId) {
      await delay(100);
      createAgentClick();
    }
  });
}

async function loadAgent(agentId = null) {
  const parts = document.location?.pathname?.split('/');
  if (!agentId) agentId = parts?.length == 3 ? parts?.pop() : null;

  if (!agentId) agentId = await createAgent();

  const serverDataLoaded = await waitWorkspaceServerData();
  await workspace.loadAgent(agentId, { lockAfterFetch: true }).catch((error) => {
    console.log('Error loading agent', error);
    const status = error?.status || 500;
    const message =
      error?.status == 404
        ? "You don't have access to this agent."
        : error?.message || error?.error || 'Operation failed';

    console.log(error);
    // Show popup message
    if (error?.status == 404) {
      if (error?.errorData?.errKey?.includes('DIFFERENT_TEAM')) {
        const dialog = modalDialog(
          'Access Error',
          'You are not authorized to access this agent. Would you like to switch to the correct team?',
          {
            'Switch Team': {
              class: 'text-white bg-v2-blue z-50',
              handler: async () => {
                //Switch Team and refresh page
                const teamId = error?.errorData?.errKey?.split('DIFFERENT_TEAM_')[1];
                if (teamId) {
                  const response = await fetch(
                    `/api/app/user-settings/${userSettingKeys.USER_TEAM}`,
                    {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ value: teamId }),
                    },
                  );
                  window.location.reload();
                } else {
                  window.location.href = '/';
                }
              },
            },
            'Go to Home': {
              class: 'border border-gray-700 hover:opacity-75',
              handler: () => {
                window.location.href = '/';
              },
            },
          },
          null,
          { bringToFront: true },
        );
      } else if (error?.errorData?.errKey?.includes('NOT_ALLOWED_TO_ACCESS_AGENT')) {
        // we don't know if this is an access issue. uncomment if this is certain.
        const dialog = modalDialog(
          'Access Error',
          message,
          {
            'Request Access': {
              class: 'text-white bg-v2-blue z-50',
              handler: () => {
                // Call requestAgentAccess when Request Access is clicked
                requestAgentAccess(agentId, workspace?.userData?.email);
              },
            },
            'Go to Home': {
              class: 'border border-gray-700 hover:opacity-75',
              handler: () => {
                window.location.href = '/';
              },
            },
          },
          null,
          { bringToFront: true },
        );
      } else {
        document.location.href = `/error/${status}?message=${message}`;
      }
    }
  });

  await workspace.loadUserSubscription();

  const watermarkeAgentName = document.querySelector('#watermark-agent-name') as HTMLElement;
  if (watermarkeAgentName) watermarkeAgentName.innerText = workspace.agent.name;

  // update tab title with agent name
  if (workspace.agent?.name) {
    document.title = workspace.agent.name + ' | SmythOS';
  }

  //const pageName = document.location.pathname.startsWith('/builder') ? '/builder/' : '/studio/';
  const pageName = '/builder/';
  history.replaceState(null, '', pageName + agentId);
  return agentId;
}

async function handleAgentSettings(agentId) {
  const nameInput = document.getElementById('agent-name-input') as HTMLInputElement;
  const agentBehaviorTA = document.querySelector('#agent-behavior-input') as HTMLTextAreaElement;

  const agentSaveBtn = document.querySelector('#agent-save-btn') as HTMLButtonElement;
  const agentDeleteBtn = document.querySelector('#agent-delete-btn');
  const agentDomainsInput = document.querySelector('#agent-domains-input') as HTMLSelectElement;
  const agentDomainInputLabelLink = document.querySelector(
    'label[for="agent-domains-input"] a.domain',
  ) as HTMLLinkElement;
  const agentDomainInputAPILink = document.querySelector(
    'label[for="agent-domains-input"] a.api',
  ) as HTMLLinkElement;

  // const agentTestDomainInput = document.querySelector('#agent-testdom-input') as HTMLInputElement;
  const agentTestDomainInput = workspace?.serverData?.agent_domain
    ? `${new URL(workspace.serverData.frontUrl).protocol}//${workspace.agent.id}.${
        workspace.serverData.agent_domain
      }`
    : '';
  const agentTestDomainInputLabelLink = document.querySelector(
    'label[for="agent-testdom-input"] a.domain',
  ) as HTMLLinkElement;
  const agentTestDomainInputAPILink = document.querySelector(
    'label[for="agent-testdom-input"] a.api',
  ) as HTMLLinkElement;

  // TODO: uncomment when we have a tooltip
  // const agentTestDomainTooltip = document.querySelector('#agent-testdom-tooltip') as HTMLElement;
  const agentMenuOverlays = document.querySelectorAll('.agent-menu-loading-overlay');

  await workspace.waitServerData();
  //agentDescriptionTA.value = workspace.agent.description || '';
  // agentTestDomainInput.value = workspace.serverData?.agent_domain
  //   ? `${agentId}.${workspace.serverData.agent_domain}`
  //   : '';

  // TODO: uncomment when we have a tooltip
  // agentTestDomainTooltip.innerText = agentTestDomainInput;
  if (agentTestDomainInputLabelLink && agentTestDomainInputAPILink) {
    agentTestDomainInputLabelLink.href = `${agentTestDomainInput}`;
    agentTestDomainInputAPILink.href = `${agentTestDomainInput}/swagger`;
  }

  if (agentDomainsInput) {
    let selectedDomain = agentDomainsInput.options[agentDomainsInput.options.selectedIndex]?.value;
    if (agentDomainInputLabelLink && agentDomainInputAPILink) {
      if (selectedDomain !== '[None]') {
        agentDomainInputLabelLink.href = `https://${selectedDomain}`;
        agentDomainInputAPILink.href = `https://${selectedDomain}/swagger`;
        agentDomainInputLabelLink.classList.remove('hidden');
        agentDomainInputAPILink.classList.remove('hidden');
      } else {
        agentDomainInputLabelLink.href = '#';
        agentDomainInputAPILink.href = '#';
        agentDomainInputLabelLink.classList.add('hidden');
        agentDomainInputAPILink.classList.add('hidden');
      }
    }

    agentDomainsInput.onchange = () => {
      const selectedDomain =
        agentDomainsInput.options[agentDomainsInput.options.selectedIndex].value;
      if (selectedDomain !== '[None]') {
        agentDomainInputLabelLink.href = `https://${selectedDomain}`;
        agentDomainInputAPILink.href = `https://${selectedDomain}/swagger`;
        agentDomainInputLabelLink.classList.remove('hidden');
        agentDomainInputAPILink.classList.remove('hidden');
      } else {
        agentDomainInputLabelLink.href = '#';
        agentDomainInputAPILink.href = '#';
        agentDomainInputLabelLink.classList.add('hidden');
        agentDomainInputAPILink.classList.add('hidden');
      }
    };

    const domains: any = await loadAgentDomainsList();
    agentDomainsInput.innerHTML = '';
    for (let domain of domains) {
      const option = document.createElement('option');
      option.value = domain == '[None]' ? '' : domain;
      option.innerText = domain;
      if (workspace.agent.domain == domain) option.setAttribute('selected', '');
      agentDomainsInput.appendChild(option);
    }

    await delay(200);

    agentMenuOverlays.forEach((e) => e.classList.add('hidden'));
    agentDeleteBtn.classList.remove('hidden');

    agentDomainsInput.dispatchEvent(new Event('change'));
  }

  agentSaveBtn?.addEventListener('click', async () => {
    const spinner = createSpinner();
    agentSaveBtn.disabled = true;
    agentSaveBtn.prepend(spinner);

    const idInput = document.getElementById('agent-id-input') as HTMLInputElement;

    const name = nameInput.value;
    const behavior = agentBehaviorTA.value;
    workspace.agent.name = name;

    workspace.agent.behavior = behavior;
    const data = await workspace.export();
    const id = workspace.agent.id || idInput.value;

    const curDomain = workspace.agent.domain;
    const selectedDomain = agentDomainsInput.options[agentDomainsInput.options.selectedIndex].value;

    let updateDomain = curDomain != selectedDomain;
    if (curDomain && curDomain != selectedDomain) {
      if (curDomain === '') {
        console.log('Domain Set', selectedDomain);
      } else {
        if (selectedDomain === '') {
          console.log('Domain Unset', curDomain);
        } else {
          console.log('Domain Updated ', curDomain, selectedDomain);
        }
      }
    }

    const result = await workspace.saveAgent(name, selectedDomain, data, id);

    if (result) {
      idInput.value = workspace.agent.id;
      nameInput.value = workspace.agent.name;
      const watermarkeAgentName = document.querySelector('#watermark-agent-name') as HTMLElement;
      if (watermarkeAgentName) watermarkeAgentName.innerText = workspace.agent.name;
      successToast('Agent saved');
    } else {
      errorToast('Save failed');
    }

    if (updateDomain) {
      //now let's save the domain
      const domResult = await fetch('/api/page/builder/updateDomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: workspace.agent.id, curDomain, domain: selectedDomain }),
      })
        .then((response) => {
          if (response.ok) {
            successToast('Domain Updated');
            workspace.agent.domain = selectedDomain;
            updateDeploymentDomainField(selectedDomain);
          } else {
            //throw new Error('Something went wrong');
            errorToast('Domain Update failed');
          }
        })
        .catch((error) => {
          console.log(error);
          errorToast('Domain Update failed');
        });
    }

    agentSaveBtn.disabled = false;
    spinner.remove();

    return false;
  });

  function updateDeploymentDomainField(domain) {
    const deploymentDomainField = document.querySelector(
      '#deploy-agent-domain',
    ) as HTMLInputElement;
    if (deploymentDomainField) {
      deploymentDomainField.value = domain;
      // emit event "input" to trigger validation
      deploymentDomainField.dispatchEvent(new Event('input'));
    }
  }

  agentDeleteBtn?.addEventListener('click', async () => {
    const shouldDelete = await confirm('Are you sure you want to delete this agent ?', '', {
      btnNoLabel: 'No, Cancel',
      btnYesLabel: "Yes, I'm sure",
      btnYesClass: 'bg-smyth-red-500 border-smyth-red-500',
    });
    if (!shouldDelete) return;

    const id = workspace.agent.id;
    const result = await workspace.deleteAgent(id);
    if (result) {
      successToast('Agent deleted');
      await delay(1000);
      document.location.href = '/agents';
    } else {
      errorToast('Delete failed');
    }
  });

  // Initialize tooltip
  // const tooltipManager = createAgentTestDomainTooltip(agentTestDomainInput, agentTestDomainTooltip);

  // Optional: Clean up tooltip when needed (e.g., when component unmounts)
  // tooltipManager.cleanup();
}

async function loadAgentDomainsList() {
  const data = await fetch('/api/page/builder/domains', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        //throw new Error('Something went wrong');
        return { error: 'Failed to load domains' };
      }
    })
    .catch((error) => {
      console.log(error);
    });

  if (data.error) {
    console.log('data.error', data.error);
    return false;
  }
  const allDomains = data.map((item) => item.name);
  //We only show domains that are not associated with any agent
  const availableDomains = data
    .filter((d) => d.aiAgent == null || d.aiAgent.id == workspace.agent.id)
    .map((item) => item.name);

  const domains = [
    '[None]',
    `${workspace.agent.id}.${workspace.serverData.prod_agent_domain}`,
    ...new Set(availableDomains),
  ];
  return domains;
}

async function loadAgentTemplatesList() {
  const pluginMenuItems = plugins.getPluginsByTarget(
    PluginTarget.BuilderLoadAgentTemplates,
    PluginType.Function,
  ) as {
    function: () => Promise<any>;
  }[];

  const templatesPromises = pluginMenuItems.map((item) => item.function());
  // a teamplate plugin will output = {"key": "value{any}""}
  const templateOutputs = await Promise.all(templatesPromises);
  const mergedTemplates = templateOutputs.reduce((acc, curr) => {
    return { ...acc, ...curr };
  }, {});

  console.log('mergedTemplates', mergedTemplates);
  return mergedTemplates;
}

function updateWorkspaceEmbodiments(agent) {
  let visibleEmbodimentsCount = 0;
  const btnChatbot: HTMLButtonElement = document.querySelector('#btn-emb-chatbot');
  const btnAPI: HTMLButtonElement = document.querySelector('#btn-emb-api');
  const btnPostman: HTMLButtonElement = document.querySelector('#btn-emb-postman');
  const btnChatGPT: HTMLButtonElement = document.querySelector('#btn-emb-chatgpt');
  const btnVideoTutorial: HTMLButtonElement = document.querySelector('#btn-emb-video-tutorial');
  const btnDocs: HTMLButtonElement = document.querySelector('#btn-emb-doc');
  const btnAgentLLM: HTMLButtonElement = document.querySelector('#btn-emb-agentllm');
  const btnSkillPreview: HTMLButtonElement = document.querySelector('#btn-emb-skill-preview');
  const btnAlexa: HTMLButtonElement = document.querySelector('#btn-emb-alexa');
  const btnMCP: HTMLButtonElement = document.querySelector('#btn-emb-mcp');

  if (btnChatbot) {
    btnChatbot.onclick = openChatbotEmbodiment;
    if (agent.description.length > 10 || agent.hasAPIEndpoints()) {
      btnChatbot.classList.remove('opacity-30');
      btnChatbot.disabled = false;
      visibleEmbodimentsCount++;
    } else {
      btnChatbot.classList.add('opacity-30');
      btnChatbot.disabled = true;
    }
  }

  if (btnAgentLLM) {
    btnAgentLLM.onclick = () => {
      // PostHog.track('agentLLM_embodiment_click', {
      //   position: 'top right of builder inside dropdown',
      // });
      openLLMEmbodiment(workspace, openEmbodimentDialog);
    };

    if (agent.hasAPIEndpoints()) {
      btnAgentLLM.classList.remove('opacity-30');
      btnAgentLLM.disabled = false;
      visibleEmbodimentsCount++;
    } else {
      btnAgentLLM.classList.add('opacity-30');
      btnAgentLLM.disabled = true;
    }
  }

  if (btnAPI) {
    btnAPI.onclick = openAPIEmbodiment;
    if (agent.hasAPIEndpoints()) {
      btnAPI.classList.remove('opacity-30');
      btnAPI.disabled = false;
      visibleEmbodimentsCount++;
    } else {
      btnAPI.classList.add('opacity-30');
      btnAPI.disabled = true;
    }
  }

  // if (btnSkillPreview) {
  //   btnSkillPreview.onclick = openSkillPreviewEmbodiment;
  //   if (agent.hasAPIEndpoints()) {
  //     btnSkillPreview.classList.remove('opacity-30');
  //     btnSkillPreview.disabled = false;
  //     visibleEmbodimentsCount++;
  //   } else {
  //     btnSkillPreview.classList.add('opacity-30');
  //     btnSkillPreview.disabled = true;
  //   }
  // }

  if (btnPostman) {
    btnPostman.onclick = openPostmanEmbodiment;
    if (agent.hasAPIEndpoints()) {
      btnPostman.classList.remove('opacity-30');
      btnPostman.disabled = false;
      visibleEmbodimentsCount++;
    } else {
      btnPostman.classList.add('opacity-30');
      btnPostman.disabled = true;
    }
  }

  if (btnAlexa) {
    btnAlexa.onclick = openAlexaEmbodiment;
    if (agent.hasAPIEndpoints()) {
      btnAlexa.classList.remove('opacity-30');
      btnAlexa.disabled = false;
      visibleEmbodimentsCount++;
    } else {
      btnAlexa.classList.add('opacity-30');
      btnAlexa.disabled = true;
    }
  }

  if (btnMCP) {
    console.log('btnMCP', 'Clicked');
    btnMCP.onclick = openMCPEmbodiment;
    if (agent.hasAPIEndpoints()) {
      btnMCP.classList.remove('opacity-30');
      btnMCP.disabled = false;
      visibleEmbodimentsCount++;
    } else {
      btnMCP.classList.add('opacity-30');
      btnMCP.disabled = true;
    }
  }

  if (btnChatGPT) {
    btnChatGPT.onclick = openChatGPTEmbodiment;
    if (agent.description.length > 10 || agent.hasAPIEndpoints()) {
      btnChatGPT.classList.remove('opacity-30');
      btnChatGPT.disabled = false;
      visibleEmbodimentsCount++;
    } else {
      btnChatGPT.classList.add('opacity-30');
      btnChatGPT.disabled = true;
    }
  }

  if (btnVideoTutorial) {
    const videoLink = agent?.data?.templateInfo?.videoLink;
    btnVideoTutorial.onclick = openVideoTutorialDialog.bind(this, videoLink);
    if (videoLink) {
      btnVideoTutorial.classList.remove('opacity-30');
      btnVideoTutorial.disabled = false;
    } else {
      btnVideoTutorial.classList.add('opacity-30');
      btnVideoTutorial.disabled = true;
    }
  }
  if (btnDocs) {
    const docLink = agent?.data?.templateInfo?.docLink;
    btnDocs.onclick = () => window.open(docLink, '_blank');
    if (docLink) {
      btnDocs.classList.remove('opacity-30');
      btnDocs.disabled = false;
    } else {
      btnDocs.classList.add('opacity-30');
      btnDocs.disabled = true;
    }
  }
}

function handleAgentEvents() {
  if (!workspace || !workspace.agent) return;

  workspace.addEventListener('AgentSaved', updateWorkspaceEmbodiments);
  workspace.addEventListener('AgentLoaded', updateWorkspaceEmbodiments);
}

export async function openEmbodimentDialog(content, actions = {}, title, tooltipText?) {
  // Remove setting icon selection, when embodiment sidebar is opened
  window.dispatchEvent(
    new CustomEvent('sidebarStateChanged', {
      detail: {
        rightSidebarOpen: false,
        isSidebarOpen: window?.localStorage?.getItem('sidebarOpen') === 'true', // Keep the left sidebar open, on embodiment toggle
        currentSidebarTab:
          getCurrentSidebarTab() || window?.localStorage?.getItem('currentSidebarTab'),
      },
    }),
  );

  if (Component.curComponentSettings) {
    await Component.curComponentSettings.closeSettings();
  }
  const debugEnabled = workspace.domElement.classList.contains('debug-enabled');

  const embodimentSidebar = document.querySelector('#embodiment-sidebar');
  const sidebarTitle = embodimentSidebar.querySelector('.title');
  // await closeRightSidebar();
  let sidebar: HTMLElement;
  if (content) {
    sidebar = await createEmbodimentSidebar(title, content, actions, tooltipText);
  } else {
    sidebar = (await openEmbodimentSidebar()) as HTMLElement;
    const titleHTML = rightSidebarTitle(title, tooltipText);
    sidebarTitle.innerHTML = titleHTML;
  }
  const closeBtn = sidebar.querySelector('button.close-btn');
  closeBtn?.classList?.remove('hidden');
}

export async function openChatGPTEmbodiment() {
  // PostHog.track('chatgpt_embodiment_click', { position: 'top right of builder inside dropdown' });
  const { dev: testDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;

  if (!testDomain && !prodDomain) {
    const content =
      '<div class="p-4">Agent domain is not set. Cannot provide chatGPT configuration</div>';
    openEmbodimentDialog(content, {}, 'ChatGPT deployment instructions');
    return;
  }

  const content = `<div class="emb-instructions p-4">
        <div class="flex items-center gap-2 mb-4">
          <p class="text-gray-700">${EMBODIMENT_DESCRIPTIONS.chatgpt.description}</p>
        </div>
        <p>In order to create a custom GPT using your agent</p>
        &nbsp;<br />
        <ul class="steps">
            <li><a href="https://chatgpt.com/gpts" target="_blank">Click Here</a> to Create a custom GPT from chatGPT interface.</li>
            <li>Click on "Configure" tab</li>
            <li>Enter your Custom GPT information: We recommend to copy the content of SmythOS Agent behavior inside "Instructions" area in order to have a consistent behavior</li>
            <li>Scroll down and Click on "Create new action" button.<br />
            ${
              testDomain
                ? '<li>- Click Import URL and enter the following URL if you want to use your test agent: ' +
                  `<b>${scheme}://${testDomain}/api-docs/openapi-gpt.json</b></li>`
                : ''
            }
            ${
              prodDomain
                ? '<li> - Click Import URL and enter the following URL if you want to use your production agent: ' +
                  `<b>${scheme}://${prodDomain}/api-docs/openapi-gpt.json</b></li>`
                : ''
            }
            </li>
            <li>Click on "Create" button on the top right</li>
            <li>Your custom GPT is ready, you can keep customizing it or just start using it</li>
        </ul>
        &nbsp;<br />
        <hr />
        &nbsp;<br />
        <p>
        <b>Note :</b> If you use the test url, your Custom GPT will use the current edited agent. When debug mode is enabled, the agent will not respond until you attach the debugger and run the workflow, this allows you to capture incoming requests to your agent in test mode and test them.
        </p>
        </div>
    `;

  const actions = {};
  openEmbodimentDialog(
    content,
    actions,
    EMBODIMENT_DESCRIPTIONS.chatgpt.title,
    EMBODIMENT_DESCRIPTIONS.chatgpt.tooltipTitle,
  );
}

export async function openPostmanEmbodiment() {
  // PostHog.track('postman_embodiment_click', { position: 'top right of builder inside dropdown' });

  const { dev: testDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;

  if (!testDomain && !prodDomain) {
    const content =
      '<div class="p-4">Agent domain is not set. Cannot provide Postman features</div>';
    openEmbodimentDialog(
      content,
      {},
      EMBODIMENT_DESCRIPTIONS.api.title,
      EMBODIMENT_DESCRIPTIONS.api.tooltipTitle,
    );
    return;
  }

  const testUrl = testDomain ? `${scheme}://${testDomain}/postman` : '';
  const prodUrl = prodDomain ? `${scheme}://${prodDomain}/postman` : '';

  const testBtn = testUrl
    ? `<div><a href="${testUrl}" target="_blank" class="flex items-center justify-center text-sm font-normal border border-solid text-base px-4 py-2 leading-none text-center rounded transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none ${PRIMARY_BUTTON_STYLE}">Export Test Endpoints</a></div>`
    : '';
  const prodBtn = prodUrl
    ? `<div><a href="${prodUrl}" target="_blank" class="flex items-center justify-center text-sm font-normal border border-solid text-base px-4 py-2 leading-none text-center rounded transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none ${PRIMARY_BUTTON_STYLE}">Export Prod Endpoints</a></div>`
    : '';

  const content = `<div class="emb-instructions p-4 flex-row">
        <div class="flex items-center gap-2 mb-5">
          <p class="text-gray-700">Test your agent using Postman or import Postman collections to your agent workspace. Includes tools for exporting and debugging API calls.</p>
        </div>
        <h2>Exporting Agent to Postman Collection</h2>
        <div class="flex space-x-3 justify-between mt-5">
        ${testBtn}

        ${prodBtn}
        </div>
        &nbsp;<br />
        <p>
        When you use the test agent, you can enable the debug mode to capture incoming requests to your agent, in this case, the request will remain stuck until you attach the debugger and run the workflow from SmythOS builder.<a href="${SMYTHOS_DOCS_URL}/agent-studio/build-agents/debugging" target="_blank"> Learn more</a>
        </p>
        &nbsp;<br />
        <h2>Importing Postman Collection to Agent</h2>
        <p>You can import a postman collection to your agent by dragging the collection .json file to the agent workspace.</p>
        &nbsp;<br />
        <hr />
        </div>
    `;

  const actions = {};
  openEmbodimentDialog(
    content,
    actions,
    EMBODIMENT_DESCRIPTIONS.postman.title,
    EMBODIMENT_DESCRIPTIONS.postman.tooltipTitle,
  );
}

export async function openAlexaEmbodiment() {
  PostHog.track('alexa_embodiment_click', { position: 'top right of builder inside dropdown' });
  const { dev: testDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;
  const wrapContent = (content) => `<div id="alexa-embodiment-wrapper">${content}</div>`;

  if (!testDomain && !prodDomain) {
    const content = wrapContent(
      '<div class="p-4">Agent domain is not set. Cannot provide Alexa features</div>',
    );
    openEmbodimentDialog(
      content,
      {},
      EMBODIMENT_DESCRIPTIONS.alexa.title,
      EMBODIMENT_DESCRIPTIONS.alexa.tooltipTitle,
    );
    return;
  }

  const voiceUrl = testDomain ? `${scheme}://${testDomain}/emb/voice` : '';
  const testUrl = testDomain ? `${scheme}://${testDomain}/alexa` : '';
  const prodUrl = prodDomain ? `${scheme}://${prodDomain}/alexa` : 'Agent is not deployed yet';

  // Update the close and cancel buttons to also reset the publish button
  const closeModalCode = `(() => {
    document.getElementById('alexa-access-token').value = '';
    document.getElementById('alexa-vendor-id').value = '';
    document.querySelector('#alexa-publish-modal .publish-btn').innerHTML = 'Publish';
    document.querySelector('#alexa-publish-modal .publish-btn').disabled = false;
    document.getElementById('alexa-publish-modal').classList.add('hidden');
  })()`;

  // Add class to publish button for easier selection
  const publishButton = `<button onclick="(async () => {
    const btn = event.target;
    try {
      // Show loading state
      const spinner = document.createElement('div');
      spinner.className = 'inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2';
      btn.innerHTML = '';
      btn.appendChild(spinner);
      btn.appendChild(document.createTextNode('Publishing...'));
      btn.disabled = true;

      const accessToken = document.getElementById('alexa-access-token').value;
      const vendorId = document.getElementById('alexa-vendor-id').value;

      const response = await fetch('${testUrl}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken,
          vendorId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to publish');
      }

      // Show success state
      document.getElementById('alexa-publish-modal').classList.add('hidden');
      successToast('Alexa Skill published successfully');

    } catch (error) {
      console.error(error);
      btn.innerHTML = 'Failed to Publish';
      errorToast('Failed to publish Alexa Skill');
      
      // Reset button after delay
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = 'Publish';
      }, 2000);
    }
  })()"
    class="publish-btn px-4 py-2 text-sm text-white bg-v2-blue rounded-md hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
    Publish
  </button>`;

  const content = wrapContent(`<div class="emb-instructions p-4 flex-row">
        <div>
           <div class="flex items-center justify-between">
           <label class="block text-sm font-medium text-gray-700 mb-1">Talk to Agent</label>
           <a href="${voiceUrl}" target="_blank" rel="noopener noreferrer">
            <div class="text-[#3C89F9] text-[13px] font-medium cursor-pointer flex items-center gap-1">Start Voice Chat
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6.74674 2.3335H5.34389C3.49341 2.3335 2.33301 3.64376 2.33301 5.49802V10.5023C2.33301 12.3566 3.48775 13.6668 5.34389 13.6668H10.6542C12.5109 13.6668 13.6663 12.3566 13.6663 10.5023V9.4061" stroke="#3C89F9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13.6668 5.38279V2.3335M13.6668 2.3335H10.6176M13.6668 2.3335L8.91309 7.08723" stroke="#3C89F9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
           </a>
           </div>
           <p class="text-gray-700 font-normal">Starts a live voice session with the agent.</p>
        </div>
        <hr class="my-4"/>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Alexa Integration</label>
          <p class="text-gray-700 font-normal">Publish as an Alexa Skill or deploy across managed Echo devices</p>
        </div>
        <div class="space-x-3 justify-between">
         <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Alexa Dev Endpoint</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input type="text" 
                id="alexa-dev-url" 
                value="${testUrl}"
                readonly 
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 overflow-hidden text-ellipsis"
                style="text-overflow: ellipsis; white-space: nowrap;"
              />
              <button onclick="(function(){ 
                  navigator.clipboard.writeText('${testUrl}');
                  successToast('URL copied to clipboard', 'Info');
                })()" 
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy URL">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Alexa Prod Endpoint</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input type="text" 
                id="alexa-prod-url" 
                value="${prodUrl}"
                readonly 
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 overflow-hidden text-ellipsis"
                style="text-overflow: ellipsis; white-space: nowrap;"
              />
              <button onclick="(function(){ 
                  navigator.clipboard.writeText('${prodUrl}');
                  successToast('URL copied to clipboard', 'Info');
                })()" 
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy URL">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
        </div>
        &nbsp;<br />

        <!-- Modal -->
        <div id="alexa-publish-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div class="bg-white rounded-lg p-6 w-[500px] max-w-[90%]">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-semibold">Publish Alexa Skill</h3>
              <button onclick="${closeModalCode}" class="text-gray-500 hover:text-gray-700">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                <input type="text" id="alexa-access-token" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter Access Token">
              </div>


              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
                <input type="text" id="alexa-vendor-id" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter Vendor ID">
              </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
              <button onclick="${closeModalCode}" class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              ${publishButton}
            </div>
          </div>
        </div>
    </div>`);

  const actions = {};
  openEmbodimentDialog(
    content,
    actions,
    EMBODIMENT_DESCRIPTIONS.alexa.title,
    EMBODIMENT_DESCRIPTIONS.alexa.tooltipTitle,
  );

  // on prod domain change, update the url
  builderStore.subscribe(
    (state) => [state.agentDomains.prod, state.agentDomains.scheme],
    ([prodDomain, scheme]) => {
      const prodUrl = prodDomain ? `${scheme}://${prodDomain}/alexa` : 'Agent is not deployed yet';
      const prodUrlElement = document.querySelector(
        '#alexa-embodiment-wrapper #alexa-prod-url',
      ) as HTMLInputElement;
      if (prodUrlElement) {
        prodUrlElement.value = prodUrl;

        //update copy button
        const alexaCopyButton = prodUrlElement.nextElementSibling as HTMLButtonElement;
        if (alexaCopyButton) {
          alexaCopyButton.setAttribute(
            'onclick',
            `(function(){ navigator.clipboard.writeText('${prodUrl}'); successToast('URL copied to clipboard', 'Info'); })()`,
          );
        }
      }
    },
  );
}

export async function openChatbotEmbodiment() {
  // PostHog.track('chatbot_embodiment_click', { position: 'top right of builder inside dropdown' });
  const { dev: testDomain, scheme } = builderStore.getState().agentDomains;

  const modalBox: HTMLElement = document.querySelector('.modalBox');
  if (modalBox) {
    modalBox.style.width = '600px';
  }

  let iframe = document.querySelector('#chatbot-iframe') as HTMLIFrameElement;
  let content;
  let actions = {};
  const url = `${scheme || 'https'}://${testDomain}/chatBot?allowAttachments=true`;
  const spinnerId = `chatbot-spinner-${Date.now()}`;

  // Define icons that will be reused
  const refreshIcon = `<span class="mif-refresh text-[#757575] hover:text-[#374151] cursor-pointer flex items-center justify-center w-4 h-4"></span>`;
  const spinnerIcon = `<svg class="w-4 h-4 animate-spin cursor-default flex items-center justify-center" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#0366d6" stroke-width="4" fill="none"></circle>
    <path fill="none" stroke="white" stroke-width="4" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>`;

  if (!iframe || iframe.src != url) {
    //only recreate the iframe if it doesn't exist
    content = `
      <div class="p-4 h-full">
        <div class="flex items-center gap-2">
          <p class="text-gray-700">${EMBODIMENT_DESCRIPTIONS.chat.description}</p>
        </div>
        <div id="${spinnerId}" class="flex items-center justify-center" style="height: calc(100% - 3rem);">
        <div role="status">
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#0366d6" stroke-width="4" fill="none"></circle>
            <path  fill="none" stroke="white" stroke-width="4" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="sr-only">Loading...</span>
        </div>
      </div>
        <iframe src="${url}" id="chatbot-iframe" frameborder="0" style="width:100%;height:calc(100% - 2rem);"></iframe>
      </div>
    `;
    actions = {
      Refresh: {
        click: async (div) => {
          const refreshBtnContainer = document.querySelector('.refresh-chat-btn') as HTMLElement;
          const iframe = document.querySelector('#chatbot-iframe') as HTMLIFrameElement;
          // Check if refresh is already in progress
          if (iframe && refreshBtnContainer && !refreshBtnContainer.classList.contains('loading')) {
            // Add loading state
            refreshBtnContainer.classList.add('loading');
            refreshBtnContainer.style.pointerEvents = 'none';
            refreshBtnContainer.style.opacity = '0.7';

            // Show spinner
            refreshBtnContainer.innerHTML = spinnerIcon;

            // Add load event listener before changing src
            const onLoad = () => {
              // Restore refresh icon and enable clicking
              refreshBtnContainer.innerHTML = refreshIcon;
              refreshBtnContainer.classList.remove('loading');
              refreshBtnContainer.style.pointerEvents = 'auto';
              refreshBtnContainer.style.opacity = '1';
              iframe.removeEventListener('load', onLoad);
            };
            iframe.addEventListener('load', onLoad);

            // Force refresh
            iframe.src += '';
          }
        },
        label: `<span class="refresh-chat-btn loading flex items-center justify-center w-4 h-4" style="pointer-events: none; opacity: 0.7;">${spinnerIcon}</span>`, // Start with disabled spinner for initial load
        tooltip: 'Refresh chat session',
        tooltipPlacement: 'left',
      },
    };
  }
  await openEmbodimentDialog(
    content,
    actions,
    EMBODIMENT_DESCRIPTIONS.chat.title,
    EMBODIMENT_DESCRIPTIONS.chat.tooltipTitle,
  );

  iframe = document.querySelector('#chatbot-iframe') as HTMLIFrameElement;
  const spinnerContainer = document.getElementById(spinnerId);
  if (iframe) {
    // Attach the event listener for the 'load' event
    iframe.addEventListener('load', async () => {
      // Hide spinner and show iframe
      if (spinnerContainer) {
        spinnerContainer.style.setProperty('display', 'none', 'important');
      }
      iframe.style.display = 'block';

      // Also update the refresh button to show refresh icon and enable it
      const refreshBtnContainer = document.querySelector('.refresh-chat-btn') as HTMLElement;
      if (refreshBtnContainer) {
        refreshBtnContainer.innerHTML = refreshIcon;
        refreshBtnContainer.classList.remove('loading');
        refreshBtnContainer.style.pointerEvents = 'auto';
        refreshBtnContainer.style.opacity = '1';
      }

      await delay(200);
      workspace.debugger.stopDebugSession();

      EmbodimentRPCManager.send(
        {
          function: 'attachHeaders',
          args: [{ 'X-MONITOR-ID': (window as any).currentMonitorId }],
        },
        ['chatbot'],
      );
    });
  }
}

export async function openAPIEmbodiment() {
  // PostHog.track('api_embodiment_click', { position: 'top right of builder inside dropdown' });
  const { dev: testDomain, scheme } = builderStore.getState().agentDomains;
  console.log('test domain found,', testDomain, 'Store:', builderStore.getState());
  const modalBox: HTMLElement = document.querySelector('.modalBox');
  if (modalBox) {
    modalBox.style.width = '800px';
  }

  const functions = {
    writeToClipboard: async (data) => {
      workspace.clipboard.write(data);
    },
  };

  let url = `${scheme || 'https'}://${testDomain}/swagger`;

  // Create a unique ID for the spinner container
  const spinnerId = `swagger-spinner-${Date.now()}`;

  const content = `
    <div class="p-4 h-full">
      <div class="flex items-center gap-2 mb-4">
        <p class="text-gray-700">${EMBODIMENT_DESCRIPTIONS.api.description}</p>
      </div>
      <div id="${spinnerId}" class="flex items-center justify-center" style="height: calc(100% - 3rem);">
        <div role="status">
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#0366d6" stroke-width="4" fill="none"></circle>
            <path  fill="none" stroke="white" stroke-width="4" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="sr-only">Loading...</span>
        </div>
      </div>
      <iframe src="${url}" id="swagger-iframe" frameborder="0" style="width:100%;height:calc(100% - 3rem);display:none;"></iframe>
    </div>
  `;
  await openEmbodimentDialog(
    content,
    {},
    EMBODIMENT_DESCRIPTIONS.api.title,
    EMBODIMENT_DESCRIPTIONS.api.tooltipTitle,
  );

  const iframe = document.querySelector('#swagger-iframe') as HTMLIFrameElement;
  const spinnerContainer = document.getElementById(spinnerId);

  if (iframe) {
    iframe.addEventListener('load', async () => {
      // Hide spinner and show iframe
      if (spinnerContainer) {
        spinnerContainer.style.setProperty('display', 'none', 'important');
      }
      iframe.style.display = 'block';

      await delay(200);

      EmbodimentRPCManager.send(
        {
          function: 'attachHeaders',
          args: [{ 'X-MONITOR-ID': (window as any).currentMonitorId }],
        },
        ['swagger'],
      );
    });
  }
}

export async function openMCPEmbodiment() {
  PostHog.track('mcp_embodiment_click', { position: 'top right of builder inside dropdown' });
  const { dev: testDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;
  const wrapContent = (content) => `<div id="mcp-embodiment-wrapper">${content}</div>`;

  if (!testDomain) {
    const content = wrapContent(
      '<div class="p-4">Agent domain is not set. Cannot provide MCP features</div>',
    );
    openEmbodimentDialog(
      content,
      {},
      EMBODIMENT_DESCRIPTIONS.mcp.title,
      EMBODIMENT_DESCRIPTIONS.mcp.tooltipTitle,
    );
    return;
  }

  const mcpDevUrl = `${scheme}://${testDomain}/emb/mcp/sse`;
  let mcpProdUrl = `Agent is not deployed yet`;
  if (prodDomain) {
    mcpProdUrl = `${scheme}://${prodDomain}/emb/mcp/sse`;
  }
  const content = wrapContent(`
    <div class="emb-instructions p-4 flex-row">
      <div class="flex items-center gap-2 mb-4">
        <p class="text-gray-700">Turn your agents into an MCP server, ready to integrate and ship with one click.</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">MCP Dev URL</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input type="text" 
                id="mcp-dev-url" 
                value="${mcpDevUrl}"
                readonly 
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 overflow-hidden text-ellipsis"
                style="text-overflow: ellipsis; white-space: nowrap;"
              />
              <button onclick="(function(){ 
                  navigator.clipboard.writeText('${mcpDevUrl}');
                  successToast('URL copied to clipboard', 'Info');
                })()" 
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy URL">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">MCP Prod URL</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input type="text" 
                id="mcp-prod-url" 
                value="${mcpProdUrl}"
                readonly 
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 overflow-hidden text-ellipsis"
                style="text-overflow: ellipsis; white-space: nowrap;"
              />
              <button onclick="(function(){ 
                  navigator.clipboard.writeText('${mcpProdUrl}');
                  successToast('URL copied to clipboard', 'Info');
                })()" 
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy URL">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  const actions = {};
  openEmbodimentDialog(
    content,
    actions,
    EMBODIMENT_DESCRIPTIONS.mcp.title,
    EMBODIMENT_DESCRIPTIONS.mcp.tooltipTitle,
  );

  builderStore.subscribe(
    (state) => [state.agentDomains.prod, state.agentDomains.scheme],
    ([prodDomain, scheme]) => {
      const mcpProdUrl = `${scheme}://${prodDomain}/emb/mcp/sse`;
      const mcpProdUrlInput = document.querySelector(
        '#mcp-embodiment-wrapper #mcp-prod-url',
      ) as HTMLInputElement;
      if (mcpProdUrlInput) {
        mcpProdUrlInput.value = mcpProdUrl;

        //update copy button
        const copyButton = mcpProdUrlInput.nextElementSibling as HTMLButtonElement;
        if (copyButton) {
          copyButton.setAttribute(
            'onclick',
            `(function(){ navigator.clipboard.writeText('${mcpProdUrl}'); successToast('URL copied to clipboard', 'Info'); })()`,
          );
        }
      }
    },
  );
}

async function openFormPreviewEmbodiment() {
  // PostHog.track('form_preview_embodiment_click', { position: 'top right of builder inside dropdown' });
  const modalBox: HTMLElement = document.querySelector('.modalBox');
  if (modalBox) {
    modalBox.style.width = '800px';
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

  renderEndpointFormPreviewSidebar({ rootID });
}

function openVideoTutorialDialog(videoLink: string) {
  const videoId = new URL(videoLink).searchParams.get('v');
  const videoUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : videoLink;

  const content = `
        <iframe width="100%" height="320" src="${videoUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        `;

  modalDialog('', content, {
    Close: {
      class: 'border border-gray-700 hover:opacity-75',
      handler: () => {},
    },
    'Open in new tab': {
      class: 'text-white bg-v2-blue',
      handler: () => {
        window.open(videoLink, '_blank');
      },
    },
  });
}

export function updateBuilderTopbarAgentName(name: string) {
  if (!name) return;
  const builderTopbarAgentNameElements = document.querySelectorAll('.builder-topbar-agent-name');
  builderTopbarAgentNameElements?.forEach((element) => {
    element.textContent = name;
  });
}
/**
 * Updates the agent avatar in the builder topbar
 * @param avatar - The avatar string to display, defaults to 'A'
 */
export function updateBuilderTopbarAgentAvatar(avatar: string = 'A'): void {
  const agentAvatarPlaceholderTopbarElements = document.querySelectorAll(
    '.agent-avatar-placeholder-topbar',
  );
  agentAvatarPlaceholderTopbarElements?.forEach((element) => {
    element.textContent = avatar?.charAt(0)?.toLocaleUpperCase() || 'A';
  });
}

async function fetchRecentAgents() {
  const queryParams = new URLSearchParams({
    page: '1',
    limit: '30',
    sortField: 'createdAt',
    order: 'desc',
    search: '',
  });

  try {
    const response = await fetch(`/api/page/agents/agents?${queryParams.toString()}`);
    const { agents } = await response.json();

    return agents.filter(
      (agent) => agent?.id !== workspace?.agent?.id && !agent?.id.startsWith('model-'),
    );
  } catch (error) {
    console.error('Error fetching recent agents:', error);
    return [];
  }
}

function initializeRecentAgentsDropdown() {
  const dropdownTrigger = document.querySelector('.new-agent-btn');
  let isInitialized = false;

  dropdownTrigger?.addEventListener('mouseenter', async () => {
    if (isInitialized) return;

    const dropdownContent = document.getElementById('recent-agents-dropdown');
    if (!dropdownContent) return;

    const agents = await fetchRecentAgents();

    if (agents.length === 0) {
      dropdownContent.innerHTML = `
        <div class="text-sm text-gray-500 text-center py-2">
          No recent agents found
        </div>
      `;
      return;
    }

    const getAgentAvatar = (agent: any) => {
      return agent.aiAgentSettings?.find((setting: any) => setting.key === 'avatar')?.value;
    };

    const agentsHTML = agents
      .map(
        (agent) => `
      <a href="/builder/${
        agent.id
      }" target="_blank" class="block p-2 hover:bg-gray-200 rounded-lg transition-colors bg-gray-50 border border-solid border-gray-200">
        <div class="flex items-center gap-2">
          ${
            getAgentAvatar(agent)
              ? `<img src="${getAgentAvatar(agent)}" alt="${
                  agent.name
                }" class="w-8 h-8 rounded-full">`
              : `<div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-medium">
                ${agent.name?.charAt(0)?.toUpperCase()}
              </div>`
          }
          <div class="min-w-0 flex-1">
            <div class="text-gray-900 truncate max-w-[200px]" title="${agent.name}">${
              agent.name
            }</div>
            <div class="text-xs text-gray-500 truncate max-w-[200px]" ${(() => {
              const userName = agent.contributors?.[0]?.user?.name;
              const userEmail = agent.contributors?.[0]?.user?.email;
              const displayName = userName || userEmail || 'Unknown';
              const shortDisplayName = displayName.includes('@')
                ? displayName.split('@')[0]
                : displayName;

              return `title="${displayName}">by ${shortDisplayName}`;
            })()}</div>
          </div>
        </div>
      </a>
    `,
      )
      .join('');

    dropdownContent.innerHTML = agentsHTML;
    isInitialized = true;
  });
}

async function requestAgentAccess(agentId: string, email: string) {
  try {
    const response = await fetch('/api/agent/request-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agentId, email }),
    });

    if (!response.ok) {
      throw new Error('Failed to request access. Please try again later.');
    }

    // Success - redirect to home page
    window.location.href = '/';
  } catch (error) {
    // Re-throw error to be handled by the modal's error handling
    throw new Error(error.message || 'An error occurred requesting access');
  }
}

// Set up the handlers
setEmbodimentHandlers({
  openEmbodimentDialog,
  openChatGPTEmbodiment,
  openPostmanEmbodiment,
  openChatbotEmbodiment,
  openAPIEmbodiment,
  openFormPreviewEmbodiment,
  openAlexaEmbodiment,
  openMCPEmbodiment,
});
