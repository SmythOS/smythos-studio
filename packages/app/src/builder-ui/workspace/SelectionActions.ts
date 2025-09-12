import { confirm } from '../ui/dialogs';
import { delay } from '../utils';
import { Workspace } from './Workspace.class';

let deleteConfirmationActive = false;

export function isEditableHover(workspace: Workspace): boolean {
  const el = workspace.hoveredElement;
  if (!el) return false;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true;
  if (el.classList.contains('dbg') || el.closest('.dbg')) return true;
  return false;
}

export function isInteractionContextOK(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return true; // safety
  if (active === document.body) return true; // same as before
  // if focus is inside our context-menu consider it OK
  return !!active.closest('[data-context-menu="true"]');
}

export function isOverDebugOutput(): boolean {
  const active = document.activeElement as HTMLElement | null;

  // Check if the active element is inside a debug textarea
  if (active && active.closest('.dbg-element .dbg-textarea')) {
    return true;
  }

  // Also check if the current selection is within a debug textarea
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement;
    if (element && element.closest('.dbg-textarea')) {
      return true;
    }
  }

  return false;
}

export function hasSelectedText(): boolean {
  const text = window.getSelection()?.toString();
  return !!text;
}

export function isSelectionInEditable(): boolean {
  const selection = window.getSelection();
  const selectedText = selection?.toString();
  const isEditableElement = (node: Node): boolean => {
    const element = node instanceof Element ? node : node?.parentElement;
    return (
      element instanceof HTMLElement &&
      (element.isContentEditable || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
    );
  };
  if (
    selectedText &&
    (isEditableElement(selection.anchorNode) || isEditableElement(selection.focusNode))
  ) {
    return true;
  }
  return false;
}

export function hasComponentSelection(): boolean {
  return document.querySelectorAll('#workspace-container .component.selected').length > 0;
}

export function canCopy(workspace: Workspace): boolean {
  if (workspace.locked) return false;

  // Priority 1: If text is selected in the debug output (hover windows), allow copying
  if (isOverDebugOutput() && hasSelectedText()) return true;

  if (!isInteractionContextOK()) return false;

  // Priority 2: Don't block copying if we're over debug output (hover windows)
  // This fixes the issue where Ctrl+C didn't work in hover windows
  if (isEditableHover(workspace) && !isOverDebugOutput()) return false;

  if (hasSelectedText()) return false;
  if (!hasComponentSelection()) return false;
  return true;
}

export function copySelection(workspace: Workspace): void {
  // If text is selected in the debug output, copy it to the clipboard
  if (isOverDebugOutput() && hasSelectedText()) {
    // Copy selected text to clipboard
    const selectedText = window.getSelection()?.toString();
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).catch((err) => {
        console.error('Failed to copy text to clipboard:', err);
      });
    }
    return;
  }

  // Fall back to component copying
  const data = workspace.clipboard.copySelection();
  if (data) workspace.clipboard.write(data);
}

export async function canPaste(workspace: Workspace): Promise<boolean> {
  if (workspace.locked) return false;
  if (!isInteractionContextOK()) return false;
  if (isEditableHover(workspace)) return false;
  try {
    const text = await workspace.clipboard.read();
    return !!(text && text.trim().length > 0);
  } catch (e) {
    return false;
  }
}

export async function pasteFromClipboard(
  workspace: Workspace,
  pasteX?: number,
  pasteY?: number,
): Promise<void> {
  // Unselect current selection
  document.querySelectorAll('.component.selected').forEach((c) => c.classList.remove('selected'));

  const text = await workspace.clipboard.read();
  if (pasteX !== undefined && pasteY !== undefined) {
    await workspace.clipboard.pasteSelection(text, pasteX, pasteY);
  } else {
    await workspace.clipboard.pasteSelection(text);
  }
  workspace.redraw();
}

export function canDelete(workspace: Workspace): boolean {
  if (workspace.locked) return false;
  if (deleteConfirmationActive) return false;
  // If user selected text in an editable element, don't delete components
  if (isSelectionInEditable()) return false;
  if (!hasComponentSelection()) return false;
  return true;
}

export async function deleteSelectionWithConfirm(workspace: Workspace): Promise<boolean> {
  if (!canDelete(workspace)) return false;
  const list = [...document.querySelectorAll('.component.selected')];
  if (list.length <= 0) return false;
  const components = list.map((c: any) => c._control);
  deleteConfirmationActive = true;
  try {
    const confirmText = list.length === 1 ? 'component' : 'components';
    const shouldDelete = await confirm(
      `Are you sure you want to delete selected ${confirmText}?`,
      `This action cannot be undone. Deleting will remove the ${confirmText} permanently.`,
      {
        btnYesLabel: 'Delete',
        btnNoLabel: 'Cancel',
        btnNoClass: 'hidden',
        btnYesType: 'danger',
      },
    );
    if (!shouldDelete) return false;
    const promises: Promise<void>[] = [];
    components.forEach((c) => promises.push(c.delete(true, false)));
    await Promise.all(promises);
    await delay(200);
    workspace.saveAgent();
    return true;
  } finally {
    deleteConfirmationActive = false;
  }
}
