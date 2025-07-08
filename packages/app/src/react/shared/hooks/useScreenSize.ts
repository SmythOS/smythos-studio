import { useEffect, useState } from 'react';
import { useSidebar } from '../contexts/SidebarContext';

/**
 * Custom hook that provides screen size information and sidebar collapse state
 * @param breakpoint - The width in pixels below which screen is considered small (default: 768)
 * @returns Object containing screen size information and sidebar state
 */
export const useScreenSize = (breakpoint = 768) => {
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < breakpoint);
  const { isCollapsed, setIsCollapsed, toggleSidebar } = useSidebar();

  useEffect(() => {
    const handleResize = () => {
      const smallScreen = window.innerWidth < breakpoint;
      setIsSmallScreen(smallScreen);

      // Auto-collapse sidebar on small screens
      if (smallScreen) {
        setIsCollapsed(true);
      }
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint, setIsCollapsed]);

  return {
    isSmallScreen,
    isCollapsed,
    toggleSidebar,
  };
};
