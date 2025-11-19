/**
 * Utility to attach Radix UI Tooltip to vanilla DOM elements
 * This bridges the gap between vanilla JS and React components
 */

import DOMPurify from 'dompurify';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/react/shared/components/ui/tooltip';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

/**
 * Configuration options for attaching a Radix Tooltip to a DOM element
 */
export interface AttachTooltipConfig {
  /**
   * Tooltip text content (supports HTML)
   */
  text: string;
  /**
   * Tooltip position relative to element
   * @default 'top'
   */
  position?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * Additional CSS classes for tooltip content
   */
  className?: string;
  /**
   * Delay before showing tooltip (ms)
   * @default 300
   */
  delayDuration?: number;
  /**
   * Skip delay duration (ms)
   * @default 100
   */
  skipDelayDuration?: number;
}

/**
 * Attaches a Radix UI Tooltip to an existing vanilla DOM element
 * 
 * @param element - The DOM element to attach the tooltip to
 * @param config - Tooltip configuration options
 * @returns Cleanup function to remove the tooltip
 * 
 * @example
 * ```typescript
 * const button = document.createElement('button');
 * button.textContent = 'Hover me';
 * const cleanup = attachRadixTooltip(button, {
 *   text: 'This is a tooltip',
 *   position: 'top'
 * });
 * // Later, call cleanup() to remove the tooltip
 * ```
 */
export function attachRadixTooltip(
  element: HTMLElement,
  config: AttachTooltipConfig,
): () => void {
  // Validate element
  if (!element || !element.parentNode) {
    console.warn('attachRadixTooltip: Element must have a parent node');
    return () => {};
  }

  // Create a wrapper container for the React component
  // We'll wrap the element so we can attach the tooltip to the wrapper
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';
  
  // Preserve element's display style if it exists
  const elementDisplay = window.getComputedStyle(element).display;
  if (elementDisplay === 'block' || elementDisplay === 'flex' || elementDisplay === 'grid') {
    wrapper.style.width = '100%';
  }

  // Insert wrapper before element and move element into wrapper
  const parent = element.parentNode;
  const nextSibling = element.nextSibling;
  parent.insertBefore(wrapper, element);
  wrapper.appendChild(element);

  // Sanitize HTML content to prevent XSS attacks
  const sanitizedText = DOMPurify.sanitize(config.text);

  // Create React root and render tooltip
  const root: Root = createRoot(wrapper);
  
  // Create a span React element that will wrap the DOM element
  // We use display: contents so it doesn't affect layout
  const triggerSpan = React.createElement('span', {
    style: { display: 'contents' },
    ref: (node: HTMLSpanElement | null) => {
      // After React renders, move the element into the span
      if (node && element.parentNode === wrapper) {
        node.appendChild(element);
      }
    },
  });
  
  root.render(
    React.createElement(
      TooltipProvider,
      {
        delayDuration: config.delayDuration ?? 300,
        skipDelayDuration: config.skipDelayDuration ?? 100,
      },
      React.createElement(
        Tooltip,
        {},
        React.createElement(
          TooltipTrigger,
          {
            asChild: true,
          },
          triggerSpan,
        ),
        React.createElement(
          TooltipContent,
          {
            side: config.position ?? 'top',
            className: config.className ?? 'bg-gray-50 shadow-lg',
          },
          React.createElement('div', {
            dangerouslySetInnerHTML: { __html: sanitizedText },
          }),
        ),
      ),
    ),
  );

  // Return cleanup function
  return () => {
    try {
      root.unmount();
      // Move element back to original position if wrapper still exists
      if (wrapper.parentNode && element.parentNode === wrapper) {
        if (nextSibling) {
          parent.insertBefore(element, nextSibling);
        } else {
          parent.appendChild(element);
        }
        wrapper.remove();
      }
    } catch (error) {
      console.warn('Error cleaning up tooltip:', error);
    }
  };
}

/**
 * Maps Metro UI hint position to Radix Tooltip position
 * 
 * @param metroPosition - Metro UI hint position
 * @returns Radix Tooltip position
 */
export function mapMetroPositionToRadix(
  metroPosition?: string,
): 'top' | 'right' | 'bottom' | 'left' {
  const position = metroPosition?.toLowerCase();
  
  if (position === 'right') return 'right';
  if (position === 'bottom') return 'bottom';
  if (position === 'left') return 'left';
  
  // Default to 'top' for 'top' or any other value
  return 'top';
}

/**
 * Maps Metro UI hint classes to Radix Tooltip classes
 * 
 * @param metroClasses - Metro UI hint classes (e.g., 'bg-gray-50 shadow-lg')
 * @returns Radix Tooltip compatible classes
 */
export function mapMetroClassesToRadix(metroClasses?: string): string {
  if (!metroClasses) {
    return 'bg-gray-50 shadow-lg';
  }
  
  // Metro UI classes are typically Tailwind-compatible
  // Return as-is, but ensure we have a base style
  return metroClasses;
}

