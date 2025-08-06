import { errorToast, successToast } from '@src/shared/components/toast';
import { createSpinner, generateAgentTemplateId } from '../../utils';
import { Workspace } from '../../workspace/Workspace.class';

export async function setupAgentTemplateScripts(workspace: Workspace) {
  const templateEnabled = isTemplateEnabled(workspace?.userData);

  const toggleBtnElm = document.getElementById('left-sidebar-template-btn');
  const settingsSectionElm = document.getElementById('agent-template');

  if (!templateEnabled) {
    toggleBtnElm?.remove();
    settingsSectionElm?.remove();
    return;
  }
  toggleBtnElm?.classList?.remove('hidden');

  setTemplateInfo(workspace);

  initEvents(workspace);
}

function initEvents(workspace: Workspace) {
  // Save Template
  const saveBtn = document.getElementById('agent-template-save-btn');

  saveBtn?.addEventListener('click', async (event) => {
    const target = event.target as HTMLButtonElement;
    const spinner = createSpinner('white', 'mr-2 mt-[-3px]');
    target.disabled = true;
    target.textContent = 'Saving...';
    target.prepend(spinner);

    try {
      await workspace.saveTemplate();
      setTemplateInfo(workspace);

      successToast('Template saved');
    } catch {
      errorToast('Error saving template');
    } finally {
      target.disabled = false;
      spinner.remove();
      target.textContent = 'Save Template';
    }
  });

  // Export Template only [No need to set template info, as we're not saving the template info to the agent]
  const exportBtn = document.getElementById('agent-template-export-btn');

  exportBtn?.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      await workspace.exportTemplate();
    } catch {
      errorToast('Error exporting template');
    }
  });

  window['Coloris']({
    el: '.coloris input',
    theme: 'pill',
    //formatToggle: true,
    closeButton: true,
    //clearButton: true,
    swatches: [
      '#264653',
      '#2a9d8f',
      '#e9c46a',
      '#f4a261',
      '#e76f51',
      '#d62828',
      '#023e8a',
      '#0077b6',
      '#0096c7',
      '#00b4d8',
      '#48cae4',
    ],
  });
}

function setTemplateInfo(workspace) {
  const templateInfo = workspace.agent.data?.templateInfo || {};

  if (Object.keys(templateInfo).length) {
    const templateIdElm = document.getElementById('agent-template-id-input') as HTMLInputElement;
    const templateNameElm = document.getElementById(
      'agent-template-name-input',
    ) as HTMLInputElement;
    const templateDescElm = document.getElementById(
      'agent-template-description-input',
    ) as HTMLInputElement;
    const templateIconElm = document.getElementById(
      'agent-template-icon-input',
    ) as HTMLInputElement;
    const templateCategoryElm = document.getElementById(
      'agent-template-category-input',
    ) as HTMLInputElement;
    const publishElm = document.getElementById('agent-template-publish-input') as HTMLInputElement;
    const colorElm = document.getElementById('agent-template-color-input') as HTMLInputElement;
    const imageUrlElm = document.getElementById(
      'agent-template-image-url-input',
    ) as HTMLInputElement;
    const docLinkElm = document.getElementById('agent-template-doc-link-input') as HTMLInputElement;
    const videoLinkElm = document.getElementById(
      'agent-template-video-link-input',
    ) as HTMLInputElement;
    const valuePropositionElm = document.getElementById(
      'agent-template-value-proposition-input',
    ) as HTMLInputElement;

    const name = templateInfo.name;

    templateIdElm.value = templateInfo?.id || generateAgentTemplateId(name);
    templateNameElm.value = templateInfo?.name || '';
    templateDescElm.value = templateInfo?.description || '';
    templateIconElm.value = templateInfo?.icon || '';
    templateCategoryElm.value = templateInfo.category || '';
    publishElm.checked = templateInfo?.publish || false;
    colorElm.value = templateInfo?.color || '#000000';

    imageUrlElm.value = templateInfo?.imageUrl || '';
    docLinkElm.value = templateInfo?.docLink || '';
    videoLinkElm.value = templateInfo?.videoLink || '';
    valuePropositionElm.value = templateInfo?.valueProposition || '';
  }
}

type UserData = {
  acl: Record<string, string>;
  isSmythStaff: boolean;
  email: string;
};

function isTemplateEnabled(userData: UserData) {
  return userData?.acl?.['/templates'] == 'rw' && userData?.isSmythStaff;
}
