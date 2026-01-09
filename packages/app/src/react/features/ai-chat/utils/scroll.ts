/**
 * Scroll utilities for chat interface
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
 * Scroll-to-bottom utility with multiple strategies
 */
export class ScrollManager {
  private static instance: ScrollManager;
  private scrollContainer: HTMLElement | null = null;
  private scrollTimeout: number | null = null;
  private lastForceScrollTime = 0;

  /** Returns singleton instance of ScrollManager */
  static getInstance(): ScrollManager {
    if (!ScrollManager.instance) {
      ScrollManager.instance = new ScrollManager();
    }
    return ScrollManager.instance;
  }

  /** Initialize scroll manager with container element */
  init(container: HTMLElement | null): void {
    this.scrollContainer = container;
  }

  /** Get the current scroll container */
  getContainer(): HTMLElement | null {
    return this.scrollContainer || this.findScrollContainer();
  }

  /** Find scroll container automatically */
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
   * Uses 200px threshold for aggressive auto-scroll during streaming
   */
  isNearBottom(threshold: number = 200): boolean {
    const container = this.getContainer();
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = Math.ceil(scrollHeight - scrollTop - clientHeight);
    return distanceFromBottom <= threshold;
  }

  /** Scroll to bottom with configurable options */
  scrollToBottom(options: ScrollToBottomOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      const { behavior = 'smooth', force = false, delay = 0 } = options;

      // Prevent too frequent force scrolls (100ms cooldown)
      if (force) {
        const now = Date.now();
        if (now - this.lastForceScrollTime < 100) {
          resolve();
          return;
        }
        this.lastForceScrollTime = now;
      }

      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      const performScroll = () => {
        const container = this.getContainer();

        if (!container) {
          resolve();
          return;
        }

        // Skip if not near bottom and not forced
        if (!force && !this.isNearBottom(200)) {
          resolve();
          return;
        }

        container.scrollTo({
          top: container.scrollHeight,
          behavior: behavior === 'instant' ? 'auto' : behavior,
        });

        if (behavior === 'smooth') {
          this.scrollTimeout = window.setTimeout(() => {
            resolve();
          }, 300);
        } else {
          resolve();
        }
      };

      if (delay > 0) {
        this.scrollTimeout = window.setTimeout(performScroll, delay);
      } else {
        requestAnimationFrame(performScroll);
      }
    });
  }

  /** Force scroll to bottom bypassing cooldown (for user-initiated scrolls) */
  forceScrollToBottomImmediate(options: ScrollToBottomOptions = {}): Promise<void> {
    const originalCooldown = this.lastForceScrollTime;
    this.lastForceScrollTime = 0;

    const forceOptions: ScrollToBottomOptions = {
      ...options,
      force: true,
    };

    return this.scrollToBottom(forceOptions).finally(() => {
      this.lastForceScrollTime = originalCooldown;
    });
  }

  /** Smart scroll that respects user's scroll position */
  smartScrollToBottom(options: ScrollToBottomOptions = {}): Promise<void> {
    return this.scrollToBottom({ ...options, force: false });
  }

  /** Reset force scroll cooldown (useful for user-initiated scrolls) */
  resetForceScrollCooldown(): void {
    this.lastForceScrollTime = 0;
  }
}

// Singleton instance export
export const scrollManager = ScrollManager.getInstance();

// Convenience function for force scroll
export const forceScrollToBottomImmediate = (options?: ScrollToBottomOptions) =>
  scrollManager.forceScrollToBottomImmediate(options);
