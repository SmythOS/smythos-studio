/**
 * Professional scroll utilities for chat interface
 * Provides smooth, performant, and reliable scrolling behavior
 */

interface ScrollOptions {
  behavior?: 'smooth' | 'auto' | 'instant';
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
}

interface ScrollToBottomOptions extends ScrollOptions {
  force?: boolean;
  delay?: number;
}

/**
 * Professional scroll-to-bottom utility with multiple strategies
 */
export class ScrollManager {
  private static instance: ScrollManager;
  private scrollContainer: HTMLElement | null = null;
  private isScrolling = false;
  private scrollTimeout: number | null = null;
  private lastForceScrollTime = 0;

  static getInstance(): ScrollManager {
    if (!ScrollManager.instance) {
      ScrollManager.instance = new ScrollManager();
    }
    return ScrollManager.instance;
  }

  /**
   * Initialize scroll manager with container element
   */
  init(container: HTMLElement | null): void {
    this.scrollContainer = container;
  }

  /**
   * Get the current scroll container
   */
  getContainer(): HTMLElement | null {
    return this.scrollContainer || this.findScrollContainer();
  }

  /**
   * Find scroll container automatically
   */
  private findScrollContainer(): HTMLElement | null {
    const selectors = [
      '.overflow-auto',
      '[data-chat-container]',
      '.scroll-smooth',
      '[class*="overflow"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    }

    return null;
  }

  /**
   * Check if user is near bottom of scroll container
   */
  isNearBottom(threshold: number = 100): boolean {
    const container = this.getContainer();
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop <= clientHeight + threshold;
  }

  /**
   * Check if user is at the very bottom
   */
  isAtBottom(threshold: number = 10): boolean {
    const container = this.getContainer();
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop <= clientHeight + threshold;
  }

  /**
   * Professional scroll to bottom with multiple strategies
   */
  scrollToBottom(options: ScrollToBottomOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      const { behavior = 'smooth', force = false, delay = 0 } = options;

      // Prevent too frequent force scrolls (reduced cooldown for better UX)
      if (force) {
        const now = Date.now();
        if (now - this.lastForceScrollTime < 100) {
          // 100ms cooldown (reduced from 500ms)
          resolve();
          return;
        }
        this.lastForceScrollTime = now;
      }

      // Clear any existing scroll timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      const performScroll = () => {
        const container = this.getContainer();

        if (!container) {
          resolve();
          return;
        }

        // Don't scroll if user is scrolled up and force is false
        if (!force && !this.isNearBottom()) {
          resolve();
          return;
        }

        this.isScrolling = true;

        // Use modern scrollTo API with smooth behavior
        container.scrollTo({
          top: container.scrollHeight,
          behavior: behavior === 'instant' ? 'auto' : behavior,
        });

        // Reset scrolling flag after animation
        if (behavior === 'smooth') {
          this.scrollTimeout = window.setTimeout(() => {
            this.isScrolling = false;
            resolve();
          }, 300); // Typical smooth scroll duration
        } else {
          this.isScrolling = false;
          resolve();
        }
      };

      if (delay > 0) {
        this.scrollTimeout = window.setTimeout(performScroll, delay);
      } else {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(performScroll);
      }
    });
  }

  /**
   * Force scroll to bottom (ignores user scroll position)
   */
  forceScrollToBottom(options: ScrollToBottomOptions = {}): Promise<void> {
    return this.scrollToBottom({ ...options, force: true });
  }

  /**
   * Force scroll to bottom bypassing cooldown (for user-initiated scrolls)
   */
  forceScrollToBottomImmediate(options: ScrollToBottomOptions = {}): Promise<void> {
    const originalCooldown = this.lastForceScrollTime;
    this.lastForceScrollTime = 0; // Reset cooldown

    // Explicitly set force to true and ensure it's not overridden
    const forceOptions: ScrollToBottomOptions = {
      ...options,
      force: true,
    };

    return this.scrollToBottom(forceOptions).finally(() => {
      this.lastForceScrollTime = originalCooldown; // Restore original cooldown
    });
  }

  /**
   * Smart scroll that respects user's scroll position
   */
  smartScrollToBottom(options: ScrollToBottomOptions = {}): Promise<void> {
    return this.scrollToBottom({ ...options, force: false });
  }

  /**
   * Scroll to specific element
   */
  scrollToElement(element: HTMLElement, options: ScrollOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      const container = this.getContainer();
      if (!container) {
        resolve();
        return;
      }

      const { behavior = 'smooth', block = 'end', inline = 'nearest' } = options;

      element.scrollIntoView({
        behavior,
        block,
        inline,
      });

      // Resolve after scroll animation
      if (behavior === 'smooth') {
        setTimeout(resolve, 300);
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if currently scrolling
   */
  isCurrentlyScrolling(): boolean {
    return this.isScrolling;
  }

  /**
   * Reset force scroll cooldown (useful for user-initiated scrolls)
   */
  resetForceScrollCooldown(): void {
    this.lastForceScrollTime = 0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    this.scrollContainer = null;
    this.isScrolling = false;
  }
}

// Export singleton instance
export const scrollManager = ScrollManager.getInstance();

// Convenience functions
export const scrollToBottom = (options?: ScrollToBottomOptions) =>
  scrollManager.scrollToBottom(options);

export const forceScrollToBottom = (options?: ScrollToBottomOptions) =>
  scrollManager.forceScrollToBottom(options);

export const forceScrollToBottomImmediate = (options?: ScrollToBottomOptions) =>
  scrollManager.forceScrollToBottomImmediate(options);

export const smartScrollToBottom = (options?: ScrollToBottomOptions) =>
  scrollManager.smartScrollToBottom(options);

export const isNearBottom = (threshold?: number) => scrollManager.isNearBottom(threshold);

export const isAtBottom = (threshold?: number) => scrollManager.isAtBottom(threshold);
