import { Workspace } from '@src/builder-ui/workspace/Workspace.class';

import { autoResizeTextarea, runChatUI } from './ChatUI.helper';

declare var workspace: Workspace;

export async function setupAgentBuilderScripts(_workspace: Workspace) {
  workspace = _workspace;
  const agentBuilderEnabled = isAgentBuilderEnabled(workspace?.userData);

  const toggleBtnElm = document.getElementById('left-sidebar-agentBuilder-btn');
  const settingsSectionElm = document.getElementById('agentBuilder-sidebar');

  if (!agentBuilderEnabled) {
    toggleBtnElm?.remove();
    settingsSectionElm?.remove();
    return;
  }
  toggleBtnElm?.classList?.remove('hidden');

  console.log('setupAgentBuilderScripts');

  runChatUI();
  autoResizeTextarea();
  // enableAlphaFeatures(workspace?.userData);
}

function isAgentBuilderEnabled(userData) {
  return true;
  // return userData?.isSmythStaff || userData?.isSmythAlpha;
}

// function enableAlphaFeatures(userData) {
// if (!userData?.isSmythStaff) return;
// const agentAttachButton = document.getElementById('agentAttachButton');
// agentAttachButton.classList.remove('hidden');
// }
