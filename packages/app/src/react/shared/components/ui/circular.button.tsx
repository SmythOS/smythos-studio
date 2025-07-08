import React from 'react';
import { IconType } from 'react-icons';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  Icon: IconType;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  iconSize?: string;
  [x: string]: any;
};

const CircularButton = ({ Icon, onClick, iconClassName, size, iconSize, ...rest }: Props) => {
  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-4 h-4';
    }
  };

  const getButtonPadding = () => {
    switch (size) {
      case 'sm':
        return 'p-1.5';
      case 'md':
        return 'p-2.5';
      case 'lg':
        return 'p-3';
      default:
        return 'p-2.5';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className={`text-white focus:ring-4 focus:outline-none font-medium rounded-full text-sm ${getButtonPadding()} text-center inline-flex items-center ${
        rest.className
      }`}
    >
      <Icon className={iconSize || getIconSize()} />
    </button>
  );
};

export default CircularButton;
