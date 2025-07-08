import { useState } from 'react';

import { useEffect } from 'react';

export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;

      // Check for mobile devices
      const mobileCheck =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
        width < 768;

      // Check for tablets specifically
      const tabletCheck =
        (/ipad/i.test(userAgent) || (width >= 768 && width < 1024)) && !/mobile/i.test(userAgent);

      setIsMobile(mobileCheck && !tabletCheck);
      setIsTablet(tabletCheck);

      if (mobileCheck && !tabletCheck) {
        setDeviceType('mobile');
      } else if (tabletCheck) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, deviceType };
}
