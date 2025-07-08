import { useDebugLogMenuCtx } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC, useEffect, useState } from 'react';
import { FaCircle } from 'react-icons/fa';

type ServerStatusType = 'online' | 'discovering' | 'offline';

export const ServerStatus: FC = () => {
  const { workspace } = useDebugLogMenuCtx();
  const [status, setStatus] = useState<ServerStatusType>(() => {
    const serverStatus = workspace?.serverData?.status?.toLowerCase();
    if (serverStatus === 'online') return 'online';
    if (serverStatus === undefined) return 'discovering';
    return 'offline';
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkStatus = () => {
      const serverStatus = workspace?.serverData?.status?.toLowerCase();
      const newStatus: ServerStatusType =
        serverStatus === 'online'
          ? 'online'
          : serverStatus === undefined
          ? 'discovering'
          : 'offline';

      setStatus(newStatus);

      // Schedule next check based on current status
      timeoutId = setTimeout(checkStatus, newStatus === 'online' ? 20_000 : 3_000);
    };

    // Initial check
    checkStatus();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [workspace]);

  const statusConfig = {
    online: { color: 'green', text: 'Online' },
    discovering: { color: 'yellow', text: 'Discovering' },
    offline: { color: 'red', text: 'Offline' },
  };

  return (
    // Only show on mobile and tablet
    <div className="items-center gap-1 hidden md:flex">
      <FaCircle className={`text-${statusConfig[status].color}-500`} size={8} />
      <span className="text-sm text-gray-600 select-none">
        Server Status: {statusConfig[status].text}
      </span>
    </div>
  );
};
