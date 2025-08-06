import {
  renderAgentModals,
  renderConfirmDialogModals,
  renderDebugLogContainer,
} from '../../../ui/react-injects';

let workspace;
export async function setupModals(_workspace) {
  workspace = _workspace;

  // Ensure the container exists before rendering
  const container = document.getElementById('builder-modals-container');
  if (!container) {
    console.error('Modal container not found');
    return;
  }

  renderAgentModals({ rootID: 'builder-modals-container' });
  // Ensure the container exists before rendering
  const simpleModalContainer = document.getElementById('self-contained-builder-modals');
  if (!simpleModalContainer) {
    console.error('Modal container not found');
    return;
  }

  renderConfirmDialogModals({ rootID: 'self-contained-builder-modals' });
}

export function handleBuilderReactInjects() {
  renderDebugLogContainer({ rootID: 'debug-log-container-root' });
}
