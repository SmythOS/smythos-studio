import { checkWorkflowStatus } from '../debugger';

type ClassNames = string | string[];

type ControlConfig = {
  enable: boolean;
  classesToAdd?: ClassNames;
  classesToRemove?: ClassNames;
  tooltipText?: string;
  icon?: string;
};

type ControlsConfig = {
  step?: ControlConfig;
  run?: ControlConfig;
  stop?: ControlConfig;
  attach?: ControlConfig;
};

type Options = {
  controlsOverlay?: {
    enable: boolean;
    tooltipText?: string;
  };
};

function applyClasses(element: HTMLElement, classes: ClassNames, action: 'add' | 'remove') {
  if (!classes) return;

  // If classes is a string, split it by whitespace to handle multiple classes
  const classList = Array.isArray(classes) ? classes : classes.trim().split(/\s+/);

  element.classList[action](...classList);
}

export function updateDebugControls(
  controls: ControlsConfig = {
    step: { enable: false },
    run: { enable: false, tooltipText: 'Run', icon: 'mif-play' },
    stop: { enable: false },
    attach: { enable: false },
  },
  options: Options = {},
): void {
  for (const [name, config] of Object.entries(controls)) {
    if (!config) continue;

    const btn = document.getElementById(`debug-menubtn-${name}`);
    if (!btn) continue;

    const { enable, classesToAdd, classesToRemove, tooltipText, icon } = config;

    // Enable or disable the button
    if (enable) {
      btn.removeAttribute('disabled');
    } else {
      btn.setAttribute('disabled', 'true');
    }

    // Update classes
    applyClasses(btn, classesToAdd, 'add');
    applyClasses(btn, classesToRemove, 'remove');

    // Update tooltip
    if (tooltipText) {
      const tooltipElm = document.querySelector(`#tooltip-${name}`);
      if (tooltipElm) {
        tooltipElm.textContent = tooltipText;
      }
    }

    // Update icon
    if (icon) {
      // Hide all icons first
      btn.querySelectorAll('.debug-btn-icon').forEach((iconElm) => iconElm.classList.add('hidden'));
      // Show the correct icon (if present)
      const targetIcon = btn.querySelector(`.${icon}`);
      if (targetIcon) {
        targetIcon.classList.remove('hidden');
      }
    }
  }

  // Update controls overlay
  const controlsOverlayElm = document.getElementById('debug-controls-overlay');
  const controlsOverlayTooltipElm = document.getElementById('tooltip-controls-overlay');
  const overlayConfig = options.controlsOverlay;

  if (overlayConfig?.enable) {
    controlsOverlayElm?.classList.remove('hidden');
    if (overlayConfig.tooltipText && controlsOverlayTooltipElm) {
      controlsOverlayTooltipElm.textContent = overlayConfig.tooltipText;
    }
  } else {
    controlsOverlayElm?.classList.add('hidden');
  }
}

export function enableAllDebugControls(options: Options = {}) {
  const controls = {
    run: { enable: true },
    step: { enable: true },
    stop: { enable: true },
    attach: { enable: true },
  };

  updateDebugControls(controls, options);
}

export function disableAllDebugControls(options: Options = {}) {
  const controls = {
    run: { enable: false },
    step: { enable: false },
    stop: { enable: false },
    attach: { enable: false },
  };

  updateDebugControls(controls, options);
}

export function updateDebugControlsOnSelection() {
  const isComponentSelected = !!document.querySelector('.component.selected');
  const isDebuggerActive = !!document.querySelector('.component.dbg-active');
  const isDebuggerRunning = !!document.querySelector('.component.dbg-running');

  const errorOccurred = checkWorkflowStatus() === 'error';

  // If debugger is active or running or the debug switcher is on, we keep the controls as they are
  if (isDebuggerActive || isDebuggerRunning) return;

  const isDebugSwitcherOn = (document.getElementById('debug-menu-tgl') as HTMLInputElement)
    ?.checked;

  if (isComponentSelected && isDebugSwitcherOn) {
    enableAllDebugControls({
      controlsOverlay: { enable: false },
    });
  } else {
    const controls = {
      run: { enable: false },
      step: { enable: false },
      stop: { enable: errorOccurred }, // Enable stop if error occurred, disable otherwise
      attach: { enable: isDebugSwitcherOn }, // Enable attach if debug is on
    };

    updateDebugControls(controls, {
      controlsOverlay: {
        enable: !isDebugSwitcherOn || (!isComponentSelected && !errorOccurred), // Only show overlay when debug is off
        tooltipText: isDebugSwitcherOn ? 'Please select a component' : 'Click to toggle debug',
      },
    });

    /* disableAllDebugControls({
      controlsOverlay: {
        enable: true,
        tooltipText: isDebugSwitcherOn ? 'Please select a component' : 'Click to toggle debug',
      },
    }); */
  }
}
