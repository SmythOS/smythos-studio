/**
 * Utility functions for managing tooltip visibility based on text truncation detection.
 * This module is intentionally separate to avoid circular dependencies.
 */

/**
 * Sets up truncation detection and tooltip visibility management for an element.
 * This function should be called after the HTML has been inserted into the DOM.
 *
 * The element must contain:
 * - A child with class '.truncatable-text' (the text element with CSS truncate class)
 * - A child with class '.conditional-tooltip' (the tooltip element to show/hide)
 *
 * @param element - The container element with the truncatable text and tooltip
 * @param parentElement - Optional parent element to observe for resize. If provided,
 *                        will update tooltip visibility when this element resizes.
 *                        If not provided, only window resize will be observed.
 * @returns Cleanup function to remove observers and listeners, or null if required elements not found
 */
export function setupTooltipTruncationDetection(
  element: HTMLElement,
  parentElement?: HTMLElement,
): (() => void) | null {
  const truncatableText = element.querySelector('.truncatable-text') as HTMLElement;
  const conditionalTooltip = element.querySelector('.conditional-tooltip') as HTMLElement;

  if (!truncatableText || !conditionalTooltip) {
    return null;
  }

  /**
   * Checks if the text is truncated and updates tooltip visibility accordingly.
   * This function is called on load, resize, and parent element width changes (if provided).
   */
  const updateTooltipVisibility = (): void => {
    // Compare scrollWidth with offsetWidth to determine if text is truncated
    const scrollW = truncatableText.scrollWidth;
    const offsetW = truncatableText.offsetWidth;
    const isTruncated = scrollW > offsetW;

    if (!isTruncated) {
      // If text is not truncated, aggressively hide the tooltip with !important
      // This overrides any hover CSS that might try to show it
      conditionalTooltip.style.cssText =
        'display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;';
    } else {
      // If text is truncated, reset styles to allow tooltip to show on hover
      conditionalTooltip.style.cssText = '';
    }
  };

  // Initial check on load - use requestAnimationFrame to ensure DOM is fully rendered
  requestAnimationFrame(() => {
    updateTooltipVisibility();
  });

  // Watch for parent element resize if provided (handles container width changes)
  let resizeObserver: ResizeObserver | null = null;

  if (parentElement && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateTooltipVisibility();
    });
    resizeObserver.observe(parentElement);
  }

  // Always listen to window resize
  const handleWindowResize = (): void => {
    updateTooltipVisibility();
  };
  window.addEventListener('resize', handleWindowResize);

  // Return cleanup function
  return () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    window.removeEventListener('resize', handleWindowResize);
  };
}
