//This tooltip does not uses flow-bite and has minimum calculations thus having a better performance
/**
 * Type definition for tooltip position options
 */
export type TooltipPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left-top'
  | 'left-bottom'
  | 'right-top'
  | 'right-bottom';

/**
 * Interface for tooltip configuration options
 */
interface TooltipOptions {
  text: string;
  position: TooltipPosition;
  showWhen: 'click' | 'hover';
  tooltipClass?: string;
  timeoutMs?: number;
}

/**
 * Class to manage tooltip functionality using CSS pseudo-elements
 */
export class TooltipV2 {
  private element: HTMLElement;
  private options: TooltipOptions;
  private isVisible: boolean = false;
  private hideTimeoutId: number | null = null;

  /**
   * Initialize tooltip functionality for a DOM element
   * @param element - Target DOM element to attach tooltip
   * @param options - Tooltip configuration options
   */
  constructor(element: HTMLElement, options: TooltipOptions) {
    this.element = element;
    this.options = options;
    this.init();
  }

  /**
   * Initialize tooltip styles and event listeners
   */
  private init(): void {
    // Add necessary styles to the element
    this.element.style.position = 'relative';

    // Add data attributes for content and position
    this.element.setAttribute('data-tooltip', this.options.text);
    this.element.setAttribute('data-tooltip-position', this.options.position);

    // Add CSS classes
    this.element.classList.add('tooltip-trigger');
    if (this.options.tooltipClass) {
      this.element.classList.add(this.options.tooltipClass);
    }

    // Add event listeners based on showWhen option
    if (this.options.showWhen === 'hover') {
      this.element.addEventListener('mouseenter', () => this.show());
      this.element.addEventListener('mouseleave', () => this.hide());
    } else if (this.options.showWhen === 'click') {
      this.element.addEventListener('click', () => this.toggle());
      // Close tooltip when clicking outside
      document.addEventListener('click', (e: MouseEvent) => {
        if (!this.element.contains(e.target as Node)) {
          this.hide();
        }
      });
    }
  }

  /**
   * Show the tooltip
   */
  private show(): void {
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }

    this.isVisible = true;
    this.element.classList.add('tooltip-active');
  }

  /**
   * Hide the tooltip
   */
  private hide(): void {
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }

    this.isVisible = false;
    this.element.classList.remove('tooltip-active');
  }

  /**
   * Toggle tooltip visibility
   */
  private toggle(): void {
    this.isVisible ? this.hide() : this.show();
  }

  /**
   * Clean up event listeners and styles
   */
  public destroy(): void {
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }

    this.element.removeAttribute('data-tooltip');
    this.element.removeAttribute('data-tooltip-position');
    this.element.classList.remove('tooltip-trigger', 'tooltip-active');
    if (this.options.tooltipClass) {
      this.element.classList.remove(this.options.tooltipClass);
    }
  }
}
