import * as React from 'react';

import { cn } from '@react/shared/utils/general';
import { FaCircleExclamation } from 'react-icons/fa6';
import ToolTip from '../_legacy/ui/tooltip/tooltip';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  fullWidth?: boolean;
  label?: string;
  required?: boolean;
  labelExample?: string;
  errorMessage?: string;
  isSearch?: boolean;
  icon?: React.ReactNode;
  iconTooltip?: string;
  tooltipPlacement?: 'top' | 'bottom' | 'top-right' | 'left' | 'right' | 'bottom-right';
  tooltipClasses?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { 
      className, 
      type, 
      error, 
      fullWidth, 
      label, 
      required, 
      labelExample, 
      errorMessage, 
      isSearch,
      icon,
      iconTooltip,
      tooltipPlacement = 'top',
      tooltipClasses = '',
      ...props 
    },
    ref,
  ) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <div className="text-gray-700 mb-1 text-sm font-normal">
            {label} {required && <span className="text-red-500 mr-1">*</span>}{' '}
            <span className="italic text-sm text-gray-500">{labelExample}</span>
          </div>
        )}
        <div className={`relative ${fullWidth ? 'w-full' : 'w-fit'}`}>
          {isSearch && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <img className="search-icon" src="/img/home.icons/search.svg" />
            </div>
          )}
          <input
            type={type}
            className={cn(
              `h-9 w-full bg-white 
            border
            text-gray-900
            rounded
            block 
            outline-none
            focus:outline-none
            focus:ring-0
            focus:ring-offset-0
            focus:ring-shadow-none
            text-sm 
            font-normal
            placeholder:text-sm
            placeholder:font-normal`,
            isSearch ? 'pl-10 pr-[10px] py-2' : 'px-[10px]',
              error
                ? '!border-[#C50F1F] focus:border-[#C50F1F]'
                : 'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500',
              className,
            )}
            ref={ref}
            {...props}
          />
          {icon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ToolTip
                showTooltip={iconTooltip?.length > 0}
                text={iconTooltip}
                placement={tooltipPlacement}
                classes={tooltipClasses}
              >
                {icon}
              </ToolTip>
            </div>
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
Input.displayName = 'Input';

export { Input };

