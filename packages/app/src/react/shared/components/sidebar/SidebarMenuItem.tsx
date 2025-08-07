import React, { useRef, useState } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

export const SidebarMenuItem: React.FC<ISidebarMenuItemProps> = ({
  title,
  path,
  isActive,
  icon: Icon,
  isCollapsed,
  hardReload,
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
    <div
      className={classNames('sidebar-menu-item', {
        'relative group': isCollapsed,
      })}
      ref={itemRef}
      onMouseEnter={updateTooltipPosition}
    >
      <Link
        to={path}
        reloadDocument={hardReload}
        className={classNames(
          'group flex items-center h-10 px-4 text-base hover:text-gray-900 hover:font-medium w-full relative',
          {
            'text-v2-blue font-medium': isActive,
            'text-gray-700': !isActive,
          },
        )}
      >
        <div
          className={classNames(
            'w-8 h-8 flex items-center justify-center transition-colors rounded-md',
            {
              'bg-[#E0E0E0]': isActive,
            },
          )}
        >
          <Icon
            width="20"
            height="20"
            viewBox="0 0 24 24"
            className={classNames({
              'text-[#374151]': isActive,
            })}
          />
        </div>
        <span
          className={classNames(
            'transition-all duration-300 overflow-hidden whitespace-nowrap',
            isCollapsed ? 'w-0 opacity-0 ml-0' : 'ml-2 w-[160px] opacity-100',
          )}
        >
          {title}
        </span>
      </Link>
      {isCollapsed && (
        <div className="sidebar-tooltip" style={tooltipStyle}>
          {title}
        </div>
      )}
    </div>
  );
};
