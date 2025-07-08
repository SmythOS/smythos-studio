declare var Metro, $;

import {
  ArrowRightSvg,
  CloseSvg,
  ErrorSvg,
  SuccessSvg,
  WarningSvg,
} from '../../../static/js/icons';

/**
 * Creates a toast notification with an icon, message, and optional CTA button
 * @param {ToastType} type - Type of toast (success, warning, error)
 * @param {string} message - The main message to display
 * @param {string} title - The toast title
 * @param {object} options - Additional options for the toast
 * @param {string} options.ctaText - Text for the CTA button (if any)
 * @param {Function} options.ctaCallback - Callback function when CTA is clicked
 * @returns {HTMLElement} - The created toast element
 */
export function toastWithIcon(
  type: 'success' | 'warning' | 'error',
  message: string,
  title: string,
  options: {
    ctaText?: string;
    ctaCallback?: () => void;
    timeout?: number;
    keepOpen?: boolean;
  } = {},
) {
  const notify = Metro.notify;

  // Default timeout of 5 seconds if not specified
  const toastTimeout = options.timeout || 5000;

  // Toast type specific settings
  const typeConfig = {
    success: {
      iconHtml: SuccessSvg,
      cls: 'success-toast',
      progressBarColor: '#107C10',
      progressBarBackgroundColor: '#FCF4F6',
    },
    warning: {
      iconHtml: WarningSvg,
      cls: 'warning-toast',
      progressBarColor: '#F1D765',
      progressBarBackgroundColor: '#FBF6D9',
    },
    error: {
      iconHtml: ErrorSvg,
      cls: 'error-toast',
      progressBarColor: '#C4314B',
      progressBarBackgroundColor: '#FCF4F6',
    },
  };

  const config = typeConfig[type];
  notify.setup({
    width: 320,
    duration: 300,
    timeout: toastTimeout,
    cls: `smt-notification ${config.cls}`,
    animation: 'easeOutQuart',
  });

  // Create close button
  const closeButtonHtml = `<div class="toast-close-btn absolute top-1 right-2 cursor-pointer text-[#242424]">
         ${CloseSvg}
       </div>`;

  // Build CTA button if provided
  let ctaButtonHtml = '';
  if (options.ctaText) {
    ctaButtonHtml = `<div class="mt-3 flex justify-end">
                          <button class="text-[#3C89F9] text-sm flex items-center toast-cta-btn">
                            ${options.ctaText}
                            ${ArrowRightSvg}
                          </button>
                        </div>`;
  }

  const content = `
            <div class="relative">
              <div class="flex items-start">
                <div class="flex-shrink-0 mr-3 mt-[3px]">
                ${config.iconHtml}
                </div>
                <div class="flex-1">
                  <h3 class="font-medium">${title}</h3>
                  <p class="text-sm text-gray-600 mt-1">${message}</p>
                </div>
                ${closeButtonHtml}
              </div>
              <div class="toast-progress-bar-container w-full h-1 mt-3 rounded-full overflow-hidden" style="background-color: ${
                config.progressBarBackgroundColor
              };">
                <div class="toast-progress-bar h-full" style="width: 100%; transition: width ${
                  options.timeout || 5000
                }ms linear; background-color: ${config.progressBarColor};"></div>
              </div>
              ${ctaButtonHtml}
            </div>
          `;

  // Create the toast notification
  const toast = notify.create(content, '', {
    cls: config.cls,
    keepOpen: true, // Always use keepOpen and handle closing ourselves
  });

  // Add event listeners
  setTimeout(() => {
    const toastElements = document.querySelectorAll(`.${config.cls}:not(.removed)`);
    const toastElement = toastElements[toastElements.length - 1];
    if (!toastElement) return;

    // Store the timeout duration for use in calculations
    const timeoutDuration = options.timeout || 5000;

    // Set up our own timeout for closing the toast
    let closeTimeout;

    if (!options.keepOpen) {
      closeTimeout = setTimeout(() => {
        if (toastElement && toastElement.isConnected) {
          toastElement.remove();
        }
      }, timeoutDuration);
    }

    // Animate progress bar
    const progressBar = toastElement.querySelector('.toast-progress-bar');
    if (progressBar && progressBar instanceof HTMLElement) {
      // Force reflow to ensure the transition starts properly
      void progressBar.offsetWidth;
      progressBar.style.width = '0%';
    }

    // Pause progress bar on hover
    if (!options.keepOpen) {
      toastElement.addEventListener('mouseenter', () => {
        // Clear our timeout when mouse enters
        if (closeTimeout) clearTimeout(closeTimeout);

        if (progressBar && progressBar instanceof HTMLElement) {
          // Get computed style to get the actual current width
          const computedStyle = window.getComputedStyle(progressBar);
          const parentWidth = progressBar.parentElement
            ? progressBar.parentElement.offsetWidth
            : 100;
          const currentWidth = (parseFloat(computedStyle.width) / parentWidth) * 100;

          // Store current width and pause animation
          progressBar.style.transition = 'none';
          progressBar.style.width = `${currentWidth}%`;
        }
      });

      toastElement.addEventListener('mouseleave', () => {
        if (progressBar && progressBar instanceof HTMLElement) {
          // Get current width as percentage
          const currentWidth = parseFloat(progressBar.style.width) || 0;

          // Calculate remaining time based on current width percentage
          const remainingTime = timeoutDuration * (currentWidth / 100);

          // Resume animation from current position
          void progressBar.offsetWidth; // Force reflow
          progressBar.style.transition = `width ${remainingTime}ms linear`;
          progressBar.style.width = '0%';

          // Set new timeout with remaining time
          closeTimeout = setTimeout(() => {
            if (toastElement && toastElement.isConnected) {
              toastElement.remove();
            }
          }, remainingTime);
        }
      });
    }

    // Handle CTA button click
    if (options.ctaText && options.ctaCallback) {
      const ctaBtn = toastElement.querySelector('.toast-cta-btn');
      if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
          options.ctaCallback();
        });
      }
    }
  }, 100);

  notify.reset();
  return toast;
}

// Add to window object for global access
window['toastWithIcon'] = toastWithIcon;

// Convenience methods for each toast type
export function successToast(message: string, title: string = 'Success', options = {}) {
  return toastWithIcon('success', message, title, options);
}

export function warningToast(message: string, title: string = 'Warning', options = {}) {
  return toastWithIcon('warning', message, title, options);
}

export function errorToast(message: string, title: string = 'Error', options = {}) {
  return toastWithIcon('error', message, title, options);
}

// Add to window object for global access
window['successToast'] = successToast;
window['warningToast'] = warningToast;
window['errorToast'] = errorToast;
