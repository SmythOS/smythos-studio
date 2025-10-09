import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Props for the ToolTip component.
 */
export interface ToolTipProps {
  text?: string | Array<string>;
  html?: string;
  content?: ReactNode; // New: ReactNode for interactive content
  placement?: 'top' | 'bottom' | 'top-right' | 'left' | 'right' | 'bottom-right';
  classes?: string;
  light?: boolean;
  hideDelay?: number;
  showOnClick?: boolean;
  isMultiLine?: boolean;
  tooltipWrapperClasses?: string;
  showTooltip?: boolean;
  arrowClasses?: string;
  reCalculateOnShow?: boolean;
}

/**
 * ToolTip component for displaying tooltips with string, HTML, or ReactNode content.
 * @param props - ToolTipProps
 * @returns React element
 */
export default function ToolTip({
  text,
  html,
  content,
  light,
  children,
  classes = '',
  showOnClick,
  placement = 'top',
  showTooltip = true,
  isMultiLine = false,
  hideDelay = 0,
  tooltipWrapperClasses = '',
  arrowClasses = '',
  reCalculateOnShow = false,
}: PropsWithChildren<ToolTipProps>): JSX.Element {
  const [show, setShow] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reCalculate, setReCalculate] = useState<number>(0);

  useEffect(() => {
    if (ref.current) {
      const { height, width } = ref.current.getBoundingClientRect();
      const tooltip = ref.current.querySelector('.tooltip') as HTMLElement | null;
      const tooltipParent = tooltip?.parentElement;
      if (!tooltipParent || !tooltip) return;

      const tooltipParentWidth = tooltipParent.clientWidth;
      const tooltipWidth = tooltip.clientWidth;
      const tooltipArrow = ref.current.querySelector('.tooltip-arrow') as HTMLElement | null;

      if (!tooltipArrow) return;

      switch (placement) {
        case 'top':
          tooltip.style.bottom = `${height + 3}px`;
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translateX(-50%)';
          tooltipArrow.style.left = `${tooltipWidth / 2 - 9}px`;
          break;
        case 'bottom':
          tooltip.style.top = `${height + 3}px`;
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translateX(-50%)';
          tooltipArrow.style.left = `${tooltipWidth / 2 - 9}px`;
          tooltipArrow.style.top = '-1px';
          break;
        case 'right':
          tooltip.style.top = '50%';
          tooltip.style.left = `${width + 3}px`;
          tooltip.style.transform = 'translateY(-50%)';
          tooltipArrow.style.left = '-6px';
          tooltipArrow.style.top = 'calc(50% - 4px)';
          break;
        case 'left':
          tooltip.style.top = '50%';
          tooltip.style.right = `${width + 3}px`;
          tooltip.style.transform = 'translateY(-50%)';
          tooltipArrow.style.right = '2px';
          tooltipArrow.style.top = 'calc(50% - 4px)';
          break;
        case 'top-right':
          tooltip.style.bottom = `${height + 3}px`;
          tooltip.style.right = '0';
          tooltipArrow.style.left = 'initial';
          tooltipArrow.style.right = `${tooltipParentWidth / 2}px`;
          break;
        case 'bottom-right':
          tooltip.style.bottom = `${height + 3}px`;
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translateX(-50%)';
          break;
        default:
          break;
      }
    }
  }, [placement, showTooltip, reCalculate]);

  useEffect(() => {
    if (reCalculateOnShow) {
      setReCalculate(reCalculate + 1);
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      onMouseEnter={() => {
        // Clear any existing timeout to prevent hiding
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setShow(true);
      }}
      onMouseLeave={() => {
        // Clear any existing timeout before setting a new one
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // Store the timeout ID so we can clear it if needed
        timeoutRef.current = setTimeout(() => {
          setShow(false);
          timeoutRef.current = null;
        }, hideDelay);
      }}
      className={`${
        tooltipWrapperClasses?.indexOf('absolute') > -1 ? 'absolute' : 'relative'
      } inline-block z-50 ${tooltipWrapperClasses}`}
    >
      {showTooltip && (
        <div
          role="tooltip"
          // eslint-disable-next-line max-len
          className={`absolute normal-case z-10 block px-3 text-sm font-medium transition-opacity duration-300 rounded-lg tooltip text-center ${
            show || showOnClick ? 'opacity-100' : 'invisible opacity-0'
          } ${
            light
              ? 'text-gray-700 bg-white dark:bg-white min-w-[275px] py-4 shadow-md'
              : 'text-white bg-gray-900 dark:bg-gray-700 py-2 shadow-sm'
          } ${classes}`}
        >
          {content !== undefined ? (
            content
          ) : html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : isMultiLine && Array.isArray(text) ? (
            text?.filter((txt) => txt?.trim()).map((txt, i) => <p key={i}>{txt}</p>)
          ) : (
            text
          )}
          <div className={`tooltip-arrow ${arrowClasses}`} data-popper-arrow></div>
        </div>
      )}
      {children}
    </div>
  );
}
