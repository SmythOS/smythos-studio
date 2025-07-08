import classNames from 'classnames';
import React, { useState } from 'react';

const sizes = {
  sm: 'w-6 h-6 max-w-6 max-h-6',
  md: 'w-10 h-10 max-w-10 max-h-10',
  lg: 'w-14 h-14 max-w-14 max-h-14',
  xl: 'w-20 h-20 max-w-20 max-h-20',
  '3lg': 'w-[75px] h-[75px] max-w-[75px] max-h-[75px]',
};

interface AgentAvatarProps {
  src: string;
  alt: string;
  status?: string;
  border?: string;
  showStatus?: boolean;
  size?: keyof typeof sizes; // sm, md, lg, xl, 3lg
  children?: React.ReactNode;
  showTextAsFallBack?: boolean;
  hoverChildren?: React.ReactNode;
}



const AgentAvatar: React.FC<AgentAvatarProps> = ({
  src,
  alt,
  size = 'md',
  status = 'online',
  showStatus = false,
  showTextAsFallBack = false,
  children,
  hoverChildren,
  border,
}) => {
  const [showText, setShowText] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <img
        className={classNames(
          'rounded-full overflow-hidden',
          sizes[size] || size,
          showText && 'hidden',
          border,
        )}
        src={src}
        alt={alt}
        onError={(e: any) => {
          console.log('Image error');
          setShowText(showTextAsFallBack);
          e.target.src = '/img/use_default_cropped.svg';
        }}
      />
      {showText && (
        <div
          className={classNames(
            sizes[size] || size,
            'rounded-full overflow-hidden',
            'bg-red-600 dark:bg-red-600 text-white dark:text-white font-medium flex items-center justify-center',
          )}
        >
          <p className="capitalize text-[0px] first-letter:text-lg text-center w-full">{alt}</p>
        </div>
      )}
      {children && children}
      {isHovered && hoverChildren && hoverChildren}
      <div
        className={classNames(
          'absolute inset-0 bg-black transition-opacity duration-300',
          //If we have a square 10000 by 10000 and we draw a circle inside it, what is the value of x and y  for a point on circle which is farthest from nearest corner => (8535.53, 8535.53)
          'w-3 h-3 left-[calc(14.6447%_-_6.5px)] top-[calc(14.6447%_-_6.5px)] z-12',
          'rounded-full border border-white border-solid',
          showStatus ? 'opacity-100' : 'opacity-0',
          { 'bg-green-500': status === 'online' },
          { 'bg-gray-500': status === 'offline' },
          { 'bg-red-600': status === 'error' },
        )}
      ></div>
    </div>
  );
};

export default AgentAvatar;
