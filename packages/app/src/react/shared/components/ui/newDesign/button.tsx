/* eslint-disable no-unused-vars */
import {
  DELETE_BUTTON_STYLE,
  DISABLED_BUTTON_STYLE,
  PRIMARY_BUTTON_STYLE,
  QUATERNARY_BUTTON_STYLE,
  SECONDARY_BUTTON_STYLE,
  TERTIARY_BUTTON_STYLE,
} from '@src/react/shared/constants/style';
import { cn } from '@src/react/shared/utils/general';
import React, { MouseEvent } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

interface CustomButtonProps {
  label?: string;
  addIcon?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  Icon?: JSX.Element;
  fullWidth?: boolean;
  children?: React.ReactNode;
  dataAttributes?: { [key: string]: string };
  isLink?: boolean;
  linkTo?: string;
  external?: boolean;
  type?: 'button' | 'submit' | 'reset' | undefined;
  reloadDocument?: boolean;
  handleClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  btnRef?: React.Ref<HTMLButtonElement>;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  isDelete?: boolean;
  iconPosition?: 'left' | 'right';
}

export function Button({
  type = 'button',
  isLink = false,
  isDelete = false,
  linkTo = '',
  label,
  handleClick,
  onMouseDown,
  className,
  addIcon,
  disabled,
  loading,
  fullWidth,
  Icon,
  children,
  reloadDocument,
  dataAttributes,
  external,
  onMouseEnter,
  onMouseLeave,
  btnRef,
  variant = 'primary',
  iconPosition = 'left',
}: CustomButtonProps) {
  const baseStyles =
    'flex items-center justify-center text-sm font-normal border border-solid text-base px-4 py-2 text-center rounded-md transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none';

  const getButtonStyles = () => {
    const styles = [];

    // Base variant styles
    const variantStyles = (() => {
      switch (variant) {
        case 'primary':
          return PRIMARY_BUTTON_STYLE;
        case 'secondary':
          return SECONDARY_BUTTON_STYLE;
        case 'tertiary':
          return TERTIARY_BUTTON_STYLE;
        case 'quaternary':
          return QUATERNARY_BUTTON_STYLE;
        default:
          return PRIMARY_BUTTON_STYLE;
      }
    })();

    // Apply either disabled or variant styles
    if (disabled) {
      styles.push(DISABLED_BUTTON_STYLE);
    } else if (isDelete) {
      styles.push(DELETE_BUTTON_STYLE);
    } else {
      styles.push(variantStyles);
    }

    // Additional styles
    if (fullWidth) {
      styles.push('w-full justify-center');
    }

    if (className) {
      styles.push(className);
    }

    return styles.join(' ');
  };

  const renderContent = () => {
    const iconElement =
      addIcon && (Icon || <FaPlus className={iconPosition === 'left' ? 'mr-2' : 'ml-2'} />);

    return (
      <>
        <div className="inline-flex items-center justify-center w-full">
          {loading && (
            <div
              id="loader"
              className={`mr-2 ${
                variant === 'secondary' ? 'circular-loader-blue' : 'circular-loader'
              }`}
            ></div>
          )}
          {iconPosition === 'left' && iconElement}
          {label || children}
          {iconPosition === 'right' && iconElement}
        </div>
      </>
    );
  };

  return (
    <>
      {isLink ? (
        <Link
          className={cn(baseStyles, getButtonStyles())}
          {...dataAttributes}
          onClick={(e) => {
            if (disabled) e.preventDefault();
            e.stopPropagation();
            handleClick && handleClick(e as any);
          }}
          to={linkTo}
          target={external ? '_blank' : undefined}
          reloadDocument={reloadDocument}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {renderContent()}
        </Link>
      ) : (
        <button
          disabled={disabled}
          onClick={!loading ? handleClick : undefined}
          onMouseDown={onMouseDown}
          className={cn(baseStyles, getButtonStyles())}
          ref={btnRef}
          type={type}
          {...dataAttributes}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {renderContent()}
        </button>
      )}
    </>
  );
}
