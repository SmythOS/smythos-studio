import { cn } from '@react/shared/utils/general';
import { Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { BiExpandAlt } from 'react-icons/bi';
import { FaCircleExclamation } from 'react-icons/fa6';

type CustomTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Name attribute for the textarea */
  name?: string;
  /** Current value of the textarea */
  value?: string;
  /** Change event handler */
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Callback for expand button click */
  onExpand?: () => void;
  /** Whether textarea should take full width */
  fullWidth?: boolean;
  /** ID attribute for the textarea */
  id?: string;
  /** Whether the textarea is disabled */
  disabled?: boolean;
  /** Whether the textarea is required */
  required?: boolean;
  /** Label text */
  label?: string;
  /** Additional CSS classes for label */
  labelClassName?: string;
  /** Sub-label text shown below main label */
  subLabel?: string;
  /** Example text shown after label */
  labelExample?: string;
  /** Additional CSS classes for textarea */
  className?: string;
  /** Whether there's an error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Number of visible rows (default: 2) */
  rows?: number;
  /** Tooltip content for info icon */
  infoTooltip?: React.ReactNode;
  /** Enable auto-grow functionality (default: true) */
  autoGrow?: boolean;
  /** Maximum height in pixels before scrolling (default: 200) */
  maxHeight?: number;
};

/**
 * Enhanced TextArea component with auto-grow functionality
 *
 * Features:
 * - Defaults to 2 lines height for consistent UX
 * - Auto-grows vertically as content increases
 * - Respects min-height constraints from existing CSS classes
 * - Shows scrollbar when maxHeight is reached
 * - Smooth transitions for height changes
 * - Support for labels, error states, tooltips, and expand functionality
 *
 * @example
 * ```tsx
 * <TextArea
 *   label="Description"
 *   placeholder="Enter description..."
 *   value={value}
 *   onChange={handleChange}
 *   autoGrow={true}
 *   maxHeight={300}
 * />
 * ```
 */
export const TextArea = React.forwardRef<HTMLTextAreaElement, CustomTextAreaProps>(
  (
    {
      placeholder,
      className,
      name,
      onChange,
      onExpand,
      value,
      fullWidth,
      id,
      disabled,
      required,
      label,
      labelClassName,
      subLabel,
      labelExample,
      error,
      errorMessage,
      rows = 2,
      infoTooltip,
      autoGrow = true, // Default to auto-grow enabled
      maxHeight = 176, // Default max height for 8 rows: (20px line-height × 8) + (8px padding × 2) = 176px
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);

    // Auto-grow functionality
    const adjustHeight = (element: HTMLTextAreaElement) => {
      if (!autoGrow) return;

      // For empty content, reset to minimum height immediately
      if (!element.value || element.value.trim() === '') {
        const computedStyle = window.getComputedStyle(element);
        const minHeight = parseInt(computedStyle.minHeight) || 56; // Default 2-row minimum
        element.style.height = `${minHeight}px`;
        element.style.overflowY = 'hidden';
        return;
      }

      // Reset height to auto to get the correct scrollHeight
      element.style.height = 'auto';

      // Get the computed min-height to respect CSS constraints
      const computedStyle = window.getComputedStyle(element);
      const minHeight = parseInt(computedStyle.minHeight) || 56;

      // Calculate the new height, respecting both minHeight and maxHeight
      const contentHeight = element.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));

      // Set the new height
      element.style.height = `${newHeight}px`;
      element.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
    };

    // Auto-grow effect
    useEffect(() => {
      const textarea = internalRef.current;
      if (textarea && autoGrow) {
        adjustHeight(textarea);
      }
    }, [value, autoGrow, maxHeight]);

    // Handle both internal ref and forwarded ref
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else if (ref) {
        ref.current = internalRef.current;
      }
    }, [ref]);

    // Enhanced onChange handler to trigger auto-grow
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoGrow) {
        // Delay to allow React to update the value
        setTimeout(() => adjustHeight(event.target), 0);
      }

      // Call the original onChange if provided
      if (onChange) {
        onChange(event);
      }
    };
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <div
            className={cn(
              `text-gray-700 mb-1 text-sm font-normal flex items-center ${labelClassName}`,
            )}
          >
            {label} {required && <span className="text-red-500 mr-1">*</span>}{' '}
            <span className="italic text-sm text-gray-500">{labelExample}</span>
            {!!infoTooltip && (
              <Tooltip className="w-52 text-center" content={infoTooltip}>
                <Info className="w-4 h-4 ml-2" />
              </Tooltip>
            )}
          </div>
        )}

        {subLabel && <p className="text-sm text-gray-500 mb-2 mt-0.5">{subLabel}</p>}
        <div className={`relative ${fullWidth ? 'w-full' : 'w-fit'}`}>
          <textarea
            ref={internalRef}
            name={name}
            id={id}
            rows={autoGrow ? undefined : rows} // Don't set rows if auto-grow is enabled
            className={cn(
              'resize-none bg-white border text-gray-900 rounded block w-full outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal py-2 px-3 transition-all duration-150 ease-in-out',
              error
                ? '!border-[#C50F1F] focus:border-[#C50F1F]'
                : 'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500',
              disabled ? 'text-gray-400 border-gray-200' : '',
              // resize-none is now applied by default in base classes above
              className,
            )}
            placeholder={placeholder}
            onChange={handleChange}
            value={value}
            disabled={disabled}
            required={required}
            style={{
              minHeight: autoGrow ? '56px' : undefined, // Exact height for 2 lines
              maxHeight: autoGrow ? `${maxHeight}px` : undefined, // Max height before scrolling
              lineHeight: '20px', // Fixed line height matching leading-5
            }}
            {...props}
          />
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="absolute bottom-2 right-2 text-gray-500 hover:text-gray-700 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Maximize behavior textarea"
            >
              <BiExpandAlt className="fa-md" />
            </button>
          )}
        </div>
        {error && errorMessage && (
          <div className="flex items-start mt-[2px]">
            <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
            <p className="text-[12px] text-red-500 font-normal">{errorMessage}</p>
          </div>
        )}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
