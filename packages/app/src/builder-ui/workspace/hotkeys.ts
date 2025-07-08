import hotkeys from 'hotkeys-js';
import { Component } from '../components/Component.class';
import { confirm, runUIEnterKey } from '../ui/dialogs';
import { delay } from '../utils';
import { sortAgent } from './ComponentSort';
import { Workspace } from './Workspace.class';

export function registerHotkeys(workspace: Workspace) {
  // Check if the user is using a Mac or Windows
  const isMac = navigator.userAgent.includes('Mac');
  // Engine based keys otherwise mac ends up with multiple keys combinations for the same action
  // e.g: command+shift+e and ctrl+shift+e both can trigger the export action
  const keys = {
    save: isMac ? 'command+s' : 'ctrl+s',
    copy: isMac ? 'command+c' : 'ctrl+c',
    paste: isMac ? 'command+v' : 'ctrl+v',
    undo: isMac ? 'command+z' : 'ctrl+z',
    redo: isMac ? 'command+shift+z' : 'ctrl+shift+z',
    selectAll: isMac ? 'command+a' : 'ctrl+a',
    sort: isMac ? 'command+option+a' : 'ctrl+alt+a',
    export: isMac ? 'command+shift+e' : 'ctrl+shift+e',
    componentPriorityUp: isMac ? 'command+shift+]' : 'ctrl+shift+]',
    componentPriorityDown: isMac ? 'command+shift+[' : 'ctrl+shift+[',
  };
  const hotkey: any = hotkeys.noConflict();
  const deleteHotkeys = 'del, backspace';
  let deleteConfirmationActive = false; // Flag to prevent multiple modals
  hotkey(deleteHotkeys, async (event, handler) => {
    if (workspace.locked) return false;
    if (deleteConfirmationActive) return false; // Prevent additional modals

    const selection = window.getSelection();
    const selectedText = selection.toString();

    // Check if the selection is within an editable element
    const isEditableElement = (node: Node): boolean => {
      const element = node instanceof Element ? node : node.parentElement;
      return (
        element instanceof HTMLElement &&
        (element.isContentEditable || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
      );
    };

    if (
      selectedText &&
      (isEditableElement(selection.anchorNode) || isEditableElement(selection.focusNode))
    ) {
      return false; // Don't proceed with component deletion if text is selected in an editable element
    }

    const list = [...document.querySelectorAll('.component.selected')];
    if (list.length <= 0) return false;
    const components = list.map((c: any) => c._control);
    deleteConfirmationActive = true; // Set flag when modal is about to show
    const confirmText = list.length === 1 ? 'component' : 'components';
    const shouldDelete = await confirm(
      '',
      `Are you sure you want to delete selected ${confirmText}?`,
      {
        icon: '',
        btnNoLabel: 'No, Cancel',
        btnYesLabel: "Yes, I'm sure",
        btnYesClass: 'bg-smyth-red-500 border-smyth-red-500',
      },
    );
    deleteConfirmationActive = false; // Reset flag after modal interaction
    if (!shouldDelete) return;
    const promises = [];
    components.forEach((c: Component) => {
      promises.push(c.delete(true, false));
    });

    await Promise.all(promises);
    await delay(200);
    workspace.saveAgent();
  });
  hotkey(keys.save, (event, handler) => {
    if (workspace.locked) return false;
    //workspace.saveAgent();
  });
  hotkey(keys.copy, (event, handler) => {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      return;
      //copy selected text
      // workspace.writeToClipboard(selectedText);
      // return true;
    }
    if (workspace.locked) return false;
    if (
      workspace.hoveredElement.tagName == 'TEXTAREA' ||
      workspace.hoveredElement.tagName == 'INPUT' ||
      workspace.hoveredElement.classList.contains('dbg') ||
      workspace.hoveredElement.closest('.dbg')
    )
      return;
    if (document.activeElement != document.body) return;
    //console.log('copy pressed');
    const selectionData = workspace.clipboard.copySelection();
    workspace.clipboard.write(selectionData);
  });
  hotkey(keys.paste, async (event, handler) => {
    if (workspace.locked) return false;
    if (
      workspace.hoveredElement.tagName == 'TEXTAREA' ||
      workspace.hoveredElement.tagName == 'INPUT' ||
      workspace.hoveredElement.classList.contains('dbg') ||
      workspace.hoveredElement.closest('.dbg')
    )
      return;
    if (document.activeElement != document.body) return;
    //console.log('paste pressed');
    //unselect all components
    document.querySelectorAll('.component.selected').forEach((c) => c.classList.remove('selected'));

    const text = await workspace.clipboard.read();

    workspace.clipboard.pasteSelection(text);

    workspace.redraw();
  });
  hotkey(keys.undo, (event, handler) => {
    if (workspace.locked) return false;
    try {
      workspace.stateManager.undo();
    } catch (error) {
      console.error('Error during undo', error);
    }
    //console.log('undo pressed');
  });
  hotkey(keys.redo, (event, handler) => {
    if (workspace.locked) return false;
    try {
      workspace.stateManager.redo();
    } catch (error) {
      console.error('Error during redo', error);
    }
    //console.log('redo pressed');
  });
  hotkey(keys.selectAll, (event, handler) => {
    if (workspace.locked) return false;
    if (
      workspace.hoveredElement.classList.contains('dbg') ||
      workspace.hoveredElement.closest('.dbg')
    ) {
      const dbgElement = workspace.hoveredElement.classList.contains('dbg')
        ? workspace.hoveredElement
        : workspace.hoveredElement.closest('.dbg');
      window.getSelection().selectAllChildren(dbgElement);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      return;
    }
    if (
      workspace.hoveredElement.tagName == 'TEXTAREA' ||
      workspace.hoveredElement.tagName == 'INPUT'
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    //Select all components
    const selectedComponents = document.querySelectorAll(
      '#workspace-container .component.selected',
    );
    const allComponents = document.querySelectorAll('#workspace-container .component');
    if (selectedComponents.length === allComponents.length) {
      allComponents.forEach((c) => c.classList.remove('selected', 'unselected'));
    } else {
      // Show all components prominently, along with the selection
      allComponents.forEach((c) => {
        c.classList.add('selected');
        c.classList.remove('unselected');
      });
    }
  });
  hotkey('esc', (event, handler) => {
    if (workspace.locked) return false;
    //deselect all components
    //console.log('esc pressed');
  });
  hotkey('enter', (event, handler) => {
    if (workspace.locked) return false;
    //console.log('enter pressed');
    runUIEnterKey();
  });
  hotkey(keys.sort, async (event, handler) => {
    console.log('Sorting agent ...');
    await sortAgent();
    console.log('Agent sorted');
  });
  hotkey(keys.export, async (event, handler) => {
    await workspace.exportTemplate();
  });

  // hotkey('ctrl+alt+t,command+alt.t', async (event, handler) => {
  //     if (workspace.locked) return false;
  //     console.log('exporting component template');
  //     const elements = document.querySelectorAll('.component.selected, .component.active');
  //     if (elements.length <= 0 || elements.length > 1) return;

  //     const activeElement: any = elements[0];
  //     const component = activeElement?._control;
  //     if (!component) return;
  //     const templateData = component.exportTemplate();
  //     if (!templateData) return;
  //     //let templateName = await prompt('Template name', 'Enter a name for the template');
  //     //if (!templateName) templateName = component.constructor.name + ' template';
  //     //templateData.name = templateName;
  //     let textConfig = JSON.stringify(templateData);

  //     workspace.writeToClipboard(textConfig);
  //     toast('Component template copied to clipboard');
  // });

  hotkey(keys.componentPriorityUp, (event, handler) => {
    if (workspace.locked) return false;
    if (
      workspace.hoveredElement.tagName === 'TEXTAREA' ||
      workspace.hoveredElement.tagName === 'INPUT' ||
      workspace.hoveredElement.classList.contains('dbg') ||
      workspace.hoveredElement.closest('.dbg')
    )
      return;

    // Find all selected components
    const selectedComponents = document.querySelectorAll('.component.selected');
    if (selectedComponents.length === 0) return;

    // Bring selected components to front
    selectedComponents.forEach((component) => {
      (component as HTMLElement).style.zIndex = '999'; // High z-index value

      // Schedule z-index reset for non-selected components
      setTimeout(() => {
        document.querySelectorAll('.component:not(.selected)').forEach((otherComponent) => {
          const otherEl = otherComponent as HTMLElement;
          if (!otherEl.style.zIndex || parseInt(otherEl.style.zIndex) > 900) {
            otherEl.style.zIndex = '1';
          }
        });
      }, 50);
    });

    workspace.redraw();
    workspace.saveAgent();
  });

  hotkey(keys.componentPriorityDown, (event, handler) => {
    if (workspace.locked) return false;
    if (
      workspace.hoveredElement.tagName === 'TEXTAREA' ||
      workspace.hoveredElement.tagName === 'INPUT' ||
      workspace.hoveredElement.classList.contains('dbg') ||
      workspace.hoveredElement.closest('.dbg')
    )
      return;

    // Find all selected components
    const selectedComponents = document.querySelectorAll('.component.selected');
    if (selectedComponents.length === 0) return;

    // Send selected components to back
    selectedComponents.forEach((component) => {
      (component as HTMLElement).style.zIndex = '0'; // Lowest z-index value
    });

    workspace.redraw();
    workspace.saveAgent();
  });
}
