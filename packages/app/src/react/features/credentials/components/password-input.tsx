/**
 * PasswordInput Component
 * 
 * A password input field with visibility toggle functionality
 * - Shows password as visible text by default
 * - Beautiful eye/eye-off toggle button on the right
 * - Matches the design system styling
 * 
 * @component
 */

import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';

export interface PasswordInputProps {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  required,
  fullWidth,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  errorMessage,
  disabled,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <div className="text-gray-700 mb-1 text-sm font-normal flex items-center">
          {label} {required && <span className="text-red-500 mr-1">*</span>}
        </div>
      )}
      <div className={`relative ${fullWidth ? 'w-full' : 'w-fit'}`}>
        <input
          type={isVisible ? 'text' : 'password'}
          className={`h-[42px] w-full bg-white border text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-light placeholder:text-sm placeholder:font-normal pr-10 pl-[10px] ${
            error
              ? '!border-[#C50F1F] focus:border-[#C50F1F]'
              : 'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-150"
          tabIndex={-1}
          disabled={disabled}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
      {error && errorMessage && (
        <div className="flex items-start mt-[2px]">
          <svg
            className="w-[10px] h-[10px] mt-[3px] mr-1 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-[12px] text-red-500 font-normal">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

