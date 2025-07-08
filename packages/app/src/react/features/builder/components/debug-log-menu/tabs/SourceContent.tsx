import { JSON_TREE_THEME } from '@src/react/features/builder/constants/debug-log';
import { useDebugLogMenuCtx } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { Tooltip } from 'flowbite-react';
import { FC, useEffect, useState } from 'react';
import { FaRegCopy } from 'react-icons/fa6';
import { HiOutlineDownload } from 'react-icons/hi';
import { JSONTree } from 'react-json-tree';

export const SourceContent: FC = () => {
  const { workspace } = useDebugLogMenuCtx();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const agentData = workspace?.agent?.data || {};
  const formattedJson = JSON.stringify(agentData, null, 2);

  const handleDownload = () => {
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-source-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-full overflow-hidden text-sm">
      <div className="absolute top-2 right-2 z-[2]">
        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
          <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="top" className="text-xs">
            <button
              onClick={() => {
                navigator.clipboard.writeText(formattedJson);
                setCopied(true);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors z-[2]"
            >
              <FaRegCopy size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Download JSON" placement="top" className="text-xs">
            <button
              onClick={handleDownload}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors z-[2]"
            >
              <HiOutlineDownload size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="overflow-auto pl-4" style={{ height: 'calc(100% - 40px)' }}>
        <JSONTree hideRoot data={agentData} theme={JSON_TREE_THEME} />
      </div>
    </div>
  );
};
