import { CanvasSearchHelper } from '../helpers/canvasSearch.helper';
import { canCopy, canPaste, copySelection, deleteSelectionWithConfirm } from './SelectionActions';
import { Workspace } from './Workspace.class';

type MenuState = {
  container: HTMLElement;
  menuEl: HTMLElement | null;
  closeHandler: ((e: MouseEvent) => void) | null;
};

const state: MenuState = {
  container: null,
  menuEl: null,
  closeHandler: null,
};

// Platform-specific keyboard shortcuts
const getPlatformShortcuts = () => {
  const isMac = navigator.userAgent.includes('Mac');

  return {
    copy: isMac ? '⌘C' : 'Ctrl+C',
    paste: isMac ? '⌘V' : 'Ctrl+V',
    delete: isMac ? '⌫' : 'Del',
    export: isMac ? '⌘⇧E' : 'Ctrl+Shift+E',
    search: isMac ? '⌘P' : 'Ctrl+P',
  };
};

export function destroyMenu() {
  if (state.menuEl && state.menuEl.parentElement) {
    state.menuEl.parentElement.removeChild(state.menuEl);
  }
  state.menuEl = null;
  if (state.closeHandler) {
    document.removeEventListener('mousedown', state.closeHandler);
    state.closeHandler = null;
  }
}

function buildMenuItem(
  label: string,
  onClick: () => void,
  disabled = false,
  shortcut?: string,
): HTMLElement {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = `w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
    disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
  }`;

  // Create label container
  const labelContainer = document.createElement('div');
  labelContainer.className = 'flex justify-between items-center';

  // Create label text
  const labelText = document.createElement('span');
  labelText.textContent = label;

  // Create shortcut text
  const shortcutText = document.createElement('span');
  shortcutText.className = 'text-xs text-gray-500 ml-2';
  shortcutText.textContent = shortcut || '';

  labelContainer.appendChild(labelText);
  if (shortcut) {
    labelContainer.appendChild(shortcutText);
  }

  item.appendChild(labelContainer);

  if (!disabled) {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        onClick();
      } finally {
        destroyMenu();
      }
    });
  }
  return item;
}

/**
 * Find the component element that was right-clicked
 */
function findClickedComponent(event: MouseEvent): HTMLElement | null {
  // If there's already a selection, don't try to select a component
  if (document.querySelectorAll('.component.selected').length > 1) return;

  const target = event.target as HTMLElement;
  // Check if the target is a component or is inside a component
  const component = target.closest('.component') as HTMLElement;
  return component;
}

/**
 * Select a component and update the workspace selection
 */
function selectComponent(workspace: Workspace, component: HTMLElement): void {
  // Clear any existing selection
  document.querySelectorAll('.component.selected').forEach((c) => c.classList.remove('selected'));

  // Select the clicked component
  component.classList.add('selected');

  // Update workspace selection state
  workspace.refreshComponentSelection(component);
}

async function createAndShowMenu(event: MouseEvent, workspace: Workspace) {
  destroyMenu();

  // Find if we clicked on a component
  const clickedComponent = findClickedComponent(event);

  // If we clicked on a component, select it
  if (clickedComponent) {
    selectComponent(workspace, clickedComponent);
  }

  const containerRect = workspace.container.getBoundingClientRect();
  const workspaceRect = workspace.domElement.getBoundingClientRect();

  // Position menu relative to container
  let x = event.clientX - containerRect.left;
  let y = event.clientY - containerRect.top;

  // Compute paste position in workspace coordinates
  const pasteX = Math.round((event.clientX - workspaceRect.left) / workspace.scale);
  const pasteY = Math.round((event.clientY - workspaceRect.top) / workspace.scale);

  // Determine disabled states using shared helpers
  const copyEnabled = canCopy(workspace);
  const pasteEnabled = await canPaste(workspace);

  const menu = document.createElement('div');
  menu.setAttribute('data-context-menu', 'true');
  menu.className =
    'absolute z-50 bg-white border border-gray-200 rounded-md shadow-md w-52 select-none';

  const shortcuts = getPlatformShortcuts();

  // Build items
  const copyItem = buildMenuItem(
    'Copy',
    () => {
      const canCopyComponents = canCopy(workspace);
      if (!canCopyComponents) return;
      copySelection(workspace);
    },
    !copyEnabled,
    shortcuts.copy,
  );

  const pasteItem = buildMenuItem(
    'Paste',
    async () => {
      try {
        if (!(await canPaste(workspace))) return;
        // Unselect current selection and paste at position
        document
          .querySelectorAll('.component.selected')
          .forEach((c) => c.classList.remove('selected'));
        const text = await workspace.clipboard.read();
        await workspace.clipboard.pasteSelection(text, pasteX, pasteY);
        workspace.redraw();
      } catch (e) {
        // noop
      }
    },
    !pasteEnabled,
    shortcuts.paste,
  );

  const deleteItem = buildMenuItem(
    'Delete',
    async () => {
      await deleteSelectionWithConfirm(workspace);
    },
    !document.querySelector('#workspace-container .component.selected'),
    shortcuts.delete,
  );

  const exportItem = buildMenuItem(
    'Export agent',
    async () => {
      await workspace.exportTemplate();
    },
    false,
    shortcuts.export,
  );

  const searchItem = buildMenuItem(
    'Search',
    () => {
      const searchHelper = CanvasSearchHelper.getInstance();
      searchHelper.openSearch(workspace);
    },
    false,
    shortcuts.search,
  );

  // Append items with small separators
  const group = document.createElement('div');
  group.className = 'py-1';
  group.appendChild(copyItem);
  group.appendChild(pasteItem);
  group.appendChild(deleteItem);

  const group2 = document.createElement('div');
  group2.className = 'py-1 border-t border-gray-100';
  group2.appendChild(exportItem);
  group2.appendChild(searchItem);

  menu.appendChild(group);
  menu.appendChild(group2);

  workspace.container.appendChild(menu);

  // Keep within bounds after mount
  const maxX = containerRect.width - menu.offsetWidth - 4;
  const maxY = containerRect.height - menu.offsetHeight - 4;
  x = Math.max(4, Math.min(x, maxX));
  y = Math.max(4, Math.min(y, maxY));
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  state.menuEl = menu;
  state.container = workspace.container;

  // Close on outside click
  state.closeHandler = (e: MouseEvent) => {
    const target = e.target as Node;
    if (state.menuEl && !state.menuEl.contains(target)) {
      destroyMenu();
    }
  };
  document.addEventListener('mousedown', state.closeHandler);
}

export function registerCanvasContextMenu(workspace: Workspace) {
  const handler = async (e: MouseEvent) => {
    // Only handle right-clicks
    if (e.button !== 2) return;
    // Restrict to inside the workspace container
    if (!workspace.container.contains(e.target as Node)) return;

    e.preventDefault();
    e.stopPropagation();
    await createAndShowMenu(e, workspace);
  };

  // Attach to container so it works over components/inputs/agent card
  workspace.container.addEventListener('contextmenu', handler);
}
