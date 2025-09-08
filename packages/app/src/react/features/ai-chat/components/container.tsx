import { FC, ReactNode, useCallback, useEffect, useRef } from 'react';

interface ContainerProps {
  children: ReactNode;
}

/**
 * Container component that overrides parent max-width constraint
 * to provide full-width layout for chat interface
 */
export const Container: FC<ContainerProps> = ({ children }) => {
  const parentElementRef = useRef<HTMLElement | null>(null);
  const originalStateRef = useRef<{ className: string; maxWidth: string } | null>(null);

  const overrideParentWidth = useCallback(() => {
    const containerElement = document.querySelector('.ph-no-capture') as HTMLElement;
    if (!containerElement?.parentElement) return;

    const parent = containerElement.parentElement;
    parentElementRef.current = parent;

    // Store original state
    originalStateRef.current = {
      className: parent.className,
      maxWidth: parent.style.maxWidth,
    };

    // Override max-width constraint
    parent.classList.remove('max-w-[1224px]');
    parent.classList.add('max-w-none');
    parent.style.maxWidth = 'none';
  }, []);

  const restoreParentWidth = useCallback(() => {
    const parent = parentElementRef.current;
    const originalState = originalStateRef.current;

    if (!parent || !originalState) return;

    parent.className = originalState.className;
    parent.style.maxWidth = originalState.maxWidth;
  }, []);

  useEffect(() => {
    overrideParentWidth();
    return restoreParentWidth;
  }, [overrideParentWidth, restoreParentWidth]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-end px-2.5 md:px-0 ph-no-capture mx-auto relative bg-white">
      {children}
    </div>
  );
};
