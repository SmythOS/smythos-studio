import React, { useRef, useState } from 'react';
import classNames from 'classnames';

export const BottomMenuItem: React.FC<IBottomMenuItemProps> = ({
  title,
  path,
  icon: Icon,
  isExternal,
  isCollapsed,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const updateTooltipPosition = () => {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setTooltipStyle({
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translateY(-50%)',
      });
    }
  };

  return (
    <div className="bottom-menu-item" ref={itemRef} onMouseEnter={updateTooltipPosition}>
      <a
        href={path}
        className="group flex items-center h-10 px-4 text-base text-gray-700 hover:text-gray-900 hover:font-medium"
        target={isExternal ? '_blank' : '_self'}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md">
          <Icon width="20" height="20" viewBox="0 0 24 24" />
        </div>
        <span
          className={classNames(
            'ml-2 transition-all duration-300 overflow-hidden whitespace-nowrap',
            isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-[160px] opacity-100',
          )}
        >
          {title}
        </span>
      </a>
      {isCollapsed && (
        <div className="sidebar-tooltip" style={tooltipStyle}>
          {title}
        </div>
      )}
    </div>
  );
};
