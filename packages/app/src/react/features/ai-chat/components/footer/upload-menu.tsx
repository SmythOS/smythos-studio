import { FC, useCallback, useEffect, useRef, useState } from 'react';

import { TClassName } from '@react/features/ai-chat/types';
import { Camera, Paperclip } from 'lucide-react';

type TMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  icon: FC<TClassName>;
  onClick: () => void;
};

type TProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddFiles: () => void;
  onTakeScreenshot: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};
export const UploadMenu: FC<TProps> = (props) => {
  const { isOpen, onClose, onAddFiles, onTakeScreenshot, triggerRef } = props;

  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const menuItems: TMenuItem[] = [
    {
      id: 'add-files',
      label: 'Add files or photos',
      icon: Paperclip,
      shortcut: 'Ctrl+U',
      onClick: () => {
        onAddFiles();
        onClose();
      },
    },
    {
      id: 'take-screenshot',
      label: 'Take a screenshot',
      icon: Camera,
      onClick: () => {
        onTakeScreenshot();
        onClose();
      },
    },
  ];

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);

      if (isOutsideMenu && isOutsideTrigger) {
        onClose();
      }
    },
    [onClose, triggerRef],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Upload options"
      className={`
        absolute bottom-full left-0 mb-2 z-50
        min-w-[220px] p-1.5
        bg-white rounded-xl
        border border-gray-200
        shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.05)]
        transition-all duration-150 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
      `}
    >
      {menuItems.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={item.onClick}
          className="
            w-full flex items-center gap-1.5
            px-2.5 py-1.5 rounded-xl
            text-gray-700 text-sm text-left
            hover:bg-gray-50
            transition-colors duration-100
            cursor-pointer
          "
        >
          <item.icon className="size-4 text-gray-500 shrink-0" />
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="text-[10px] text-gray-500 ml-auto">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default UploadMenu;
