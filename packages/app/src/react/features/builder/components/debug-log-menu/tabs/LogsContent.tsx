import { useDebugLogMenuCtx } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { Tooltip } from 'flowbite-react';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FaRegCopy } from 'react-icons/fa6';
import { HiOutlineDownload } from 'react-icons/hi';
import { IoMdTrash } from 'react-icons/io';


const DetailedLogInfo = ({ info }: { info: string }) => {
  const MAX_CHARS = 1000;
  const [isTruncated, setIsTruncated] = useState(info.length > MAX_CHARS);
  const [showFull, setShowFull] = useState(false);
  
  const displayText = showFull ? info : info.length > MAX_CHARS ? info.substring(0, MAX_CHARS) : info;
  
  const handleCopyFullContent = () => {
    navigator.clipboard.writeText(info);
    // Optional: add a visual feedback that content was copied
  };
  
  return (
    <div
      className="pl-4 text-xs text-gray-500"
      style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
    >
      {displayText}
      {isTruncated && !showFull && (
        <span 
          className="ml-1 text-blue-500 cursor-pointer hover:underline" 
          onClick={handleCopyFullContent}
          title="Copy full content to clipboard"
        >
          ...
        </span>
      )}
    </div>
  );
};

export const LogsContent: FC = () => {
  const { logs, setLogs } = useDebugLogMenuCtx();
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // More reliable scroll to bottom function
  const scrollToBottom = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollHeight = container.scrollHeight;
    const height = container.clientHeight;
    const maxScroll = scrollHeight - height;

    container.scrollTo({
      top: maxScroll,
      behavior: userHasScrolled ? 'smooth' : 'auto',
    });
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!shouldAutoScroll) return;

    // Use RAF to ensure DOM has updated
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [logs, shouldAutoScroll]);

  // Handle scroll events to determine if we should continue auto-scrolling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100; // Increased threshold

    setUserHasScrolled(true);
    setShouldAutoScroll(isNearBottom);
  }, []);

  // Reset user scroll state when switching tabs
  useEffect(() => {
    setUserHasScrolled(false);
    setShouldAutoScroll(true);
    scrollToBottom();
  }, []);

  // Reset copied state after 1 second
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const handleCopyLogs = () => {
    const logsText = logs
      .map(
        (log) =>
          `${new Date(log.timestamp).toLocaleTimeString()} ${log.message}${
            log.data.input ? `\n  Input: ${JSON.stringify(log.data.input)}` : ''
          }${log.data.output ? `\n  Output: ${JSON.stringify(log.data.output)}` : ''}`,
      )
      .join('\n');

    navigator.clipboard.writeText(logsText);
    setCopied(true);
  };

  const handleDownloadLogs = () => {
    const logsText = logs
      .map(
        (log) =>
          `${new Date(log.timestamp).toISOString()} ${log.message}${
            log.data.input ? `\n  Input: ${JSON.stringify(log.data.input, null, 2)}` : ''
          }${log.data.output ? `\n  Output: ${JSON.stringify(log.data.output, null, 2)}` : ''}`,
      )
      .join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-2 right-2 z-[2]">
        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
          <Tooltip content={copied ? 'Copied!' : 'Copy'} className="text-xs">
            <button
              onClick={handleCopyLogs}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <FaRegCopy size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Download" className="text-xs">
            <button
              onClick={handleDownloadLogs}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <HiOutlineDownload size={15} />
            </button>
          </Tooltip>
          <Tooltip content="Clear" className="text-xs">
            <button
              onClick={handleClearLogs}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <IoMdTrash size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full p-4 font-mono text-sm text-gray-700 overflow-auto scroll-smooth"
        style={{ height: 'calc(100% - 40px)' }}
      >
        {logs.map((log, index) => (
          <div
            key={`${log.timestamp}-${index}`}
            className={`mb-1 ${log.type === 'agent' ? 'text-blue-600' : 'text-gray-600'}`}
            style={{
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            <span className="text-gray-400 inline-block">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>{' '}
            <span style={{ overflowWrap: 'anywhere' }}>{log.message}</span>
            {log.data.input && (
             
              <DetailedLogInfo info={`Input: ${JSON.stringify(log.data.input)}`} />
            )}
            {log.data.output && (
            
              <DetailedLogInfo info={`Output: ${JSON.stringify(log.data.output)}`} />
            )}
            {log.data?.logs &&
              log.data.logs?.length > 0 &&
              log.data.logs.map((log) => (
               
                <DetailedLogInfo info={`${log.message}`} key={`${log.timestamp}-${index}`} />
              ))}
            {log.data.action === 'usage' && log.data.cost && (
              <div className="pl-4 text-xs">
                <span className="text-yellow-600">Cost breakdown:</span>
                {log.data.cost.map((item, idx) => (
                  <div key={idx} className="pl-2 text-gray-500">
                    • {item.sourceId}: ${item.units.toFixed(8)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && <div className="text-gray-500">Debug your agent to see logs</div>}
      </div>
    </div>
  );
};
