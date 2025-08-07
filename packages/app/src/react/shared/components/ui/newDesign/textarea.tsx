import { cn } from '@react/shared/utils/general';
import { Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';
import React from 'react';
import { BiExpandAlt } from 'react-icons/bi';
import { FaCircleExclamation } from 'react-icons/fa6';

type CustomTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  placeholder?: string;
  name?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onExpand?: () => void;
  fullWidth?: boolean;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  labelClassName?: string;
  subLabel?: string;
  labelExample?: string;
  className?: string;
  error?: boolean;
  errorMessage?: string;
  rows?: number;
  infoTooltip?: React.ReactNode;
};

export function TextArea({
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
  rows = 3,
  infoTooltip,
  ...props
}: CustomTextAreaProps) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <div className={cn(`text-gray-700 mb-1 text-sm font-normal flex items-center ${labelClassName}`)}>
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
          name={name}
          id={id}
          rows={rows}
          className={`
            bg-white 
            border
            text-gray-900
            rounded
            block 
            w-full
            outline-none
            focus:outline-none
            focus:ring-0
            focus:ring-offset-0
            focus:ring-shadow-none
            text-sm 
            font-normal
            placeholder:text-sm
            placeholder:font-normal
            py-2
            px-3
            ${
              error
                ? '!border-[#C50F1F] focus:border-[#C50F1F]'
                : 'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500'
            }
            ${disabled ? 'text-gray-400 border-gray-200' : ''}
            ${className || ''}
          `}
          placeholder={placeholder}
          onChange={onChange}
          value={value}
          disabled={disabled}
          required={required}
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
}
