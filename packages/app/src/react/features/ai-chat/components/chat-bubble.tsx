/* eslint-disable max-len, no-unused-vars, @typescript-eslint/no-unused-vars */
import { Tooltip } from 'flowbite-react';
import { FC, useRef, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import '../styles/index.css';

import {
  CodeBlockWithCopyButton,
  FileItemPreview,
  ReplyLoader,
  ThinkingMessage,
} from '@react/features/ai-chat/components';
import { FileWithMetadata, IChatMessage } from '@react/shared/types/chat.types';

const DEFAULT_AVATAR_URL =
  'https://gravatar.com/avatar/ccd5b19e810febbfd3d4321e27b15f77?s=400&d=mp&r=x';

// Re-export the interface for use in other components
export type { IChatMessage };

export const ChatBubble: FC<IChatMessage> = ({
  me,
  files,
  avatar,
  isLast,
  message,
  type,
  isReplying,
  isRetrying,
  onRetryClick,
  isError = false,
  hideMessageBubble,
  thinkingMessage,
}) => {
  if (me) {
    return (
      <UserMessageBubble message={message} files={files} hideMessageBubble={hideMessageBubble} />
    );
  }

  // Handle thinking messages
  if (type === 'thinking') {
    return <ThinkingMessage message={message} avatar={avatar} />;
  }

  return isReplying || isRetrying ? (
    <>
      <ReplyLoader avatar={avatar ?? DEFAULT_AVATAR_URL} />
    </>
  ) : (
    <div className={me ? 'pl-[100px]' : ''}>
      {!hideMessageBubble && (
        <SystemMessageBubble
          avatar={avatar}
          message={message}
          isError={isError}
          onRetryClick={onRetryClick}
          isRetrying={isRetrying}
          thinkingMessage={thinkingMessage}
        />
      )}
    </div>
  );
};

interface IUserMessageBubble {
  message: string;
  files?: FileWithMetadata[];
  hideMessageBubble?: boolean;
}

const UserMessageBubble: FC<IUserMessageBubble> = ({ message, files, hideMessageBubble }) => {
  return (
    <div className="break-all flex flex-col items-end">
      {files && files.length > 0 && (
        <div className="flex flex-nowrap gap-2 mb-2 overflow-x-auto">
          {files.map((fileWithKey, index) => (
            <FileItemPreview
              isReadOnly
              key={index}
              file={fileWithKey}
              fileKey={fileWithKey.metadata.key}
              inChatBubble={true}
            />
          ))}
        </div>
      )}
      {!hideMessageBubble && message && (
        <div className="rounded-[18px] bg-[#f4f4f4] text-[#2b2b2b] p-3 px-4 w-fit whitespace-pre-wrap text-wrap max-w-[535px]">
          {message}
        </div>
      )}
    </div>
  );
};

interface ISystemMessageBubble {
  message: string;
  avatar?: string;
  isError?: boolean;
  isRetrying?: boolean;
  onRetryClick?: () => void;
  thinkingMessage?: string;
}

const SystemMessageBubble: FC<ISystemMessageBubble> = ({
  avatar,
  message,
  isError,
  isRetrying,
  onRetryClick,
  thinkingMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (contentRef.current) {
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err); // eslint-disable-line no-console
      }

      selection?.removeAllRanges();
    }
  };

  return (
    <div className="system-message-bubble relative">
      <div className="flex-1" ref={contentRef}>
        {isError ? (
          <ErrorMessageBubble
            message={message}
            onRetryClick={onRetryClick}
            isRetrying={isRetrying}
          />
        ) : (
          <div className="chat-rich-text-response space-y-1 rounded-lg p-3 text-[#141414]">
            <ReactMarkdown
              children={message}
              remarkPlugins={[remarkGfm]}
              components={{
                // adding components to ensure formatting is preserved
                h1: ({ node, ...props }) => (
                  <h1 style={{ fontWeight: 'bold', fontSize: '2em' }} {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 style={{ fontWeight: 'bold', fontSize: '1.5em' }} {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 style={{ fontWeight: 'bold', fontSize: '1.17em' }} {...props} />
                ),
                h4: ({ node, ...props }) => (
                  <h4 style={{ fontWeight: 'bold', fontSize: '1em' }} {...props} />
                ),
                h5: ({ node, ...props }) => (
                  <h5 style={{ fontWeight: 'bold', fontSize: '0.83em' }} {...props} />
                ),
                h6: ({ node, ...props }) => (
                  <h6 style={{ fontWeight: 'bold', fontSize: '0.67em' }} {...props} />
                ),
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <CodeBlockWithCopyButton language={match[1]}>
                      {String(children).replace(/\n$/, '')}
                    </CodeBlockWithCopyButton>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                img: ({ node, ...props }) => (
                  <img
                    {...props}
                    className="rounded-xl"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                ),
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
                p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              }}
            />

            {/* Display thinking message inline if present */}
            {thinkingMessage && <ThinkingMessage message={thinkingMessage} avatar={avatar} />}
          </div>
        )}
      </div>
      {!isError && !thinkingMessage && (
        <div className="flex gap-4 p-4 pl-0">
          <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="bottom">
            <button
              onClick={handleCopy}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {copied ? <FaCheck /> : <FaRegCopy />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
};

const ErrorMessageBubble: FC<{
  message: string;
  onRetryClick: () => void;
  isRetrying?: boolean;
}> = ({ message, onRetryClick, isRetrying }) => {
  return (
    <div className="flex flex-col items-start">
      <div className="rounded-lg bg-pink-50 border border-pink-200 p-4 max-w-screen-md flex justify-between items-center gap-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              className="text-red-500"
            >
              <path d="M10 9.25C10.4142 9.25002 10.75 9.5858 10.75 10V13.333C10.75 13.7472 10.4142 14.083 10 14.083C9.58579 14.083 9.25 13.7472 9.25 13.333V10C9.25 9.58579 9.58579 9.25 10 9.25Z"></path>
              <path d="M10 5.83301C10.5293 5.83303 10.958 6.26273 10.958 6.79199C10.9578 7.3211 10.5291 7.74998 10 7.75C9.47084 7.75 9.04217 7.32111 9.04199 6.79199C9.04199 6.26272 9.47073 5.83301 10 5.83301Z"></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 2.08496C14.3713 2.08496 17.915 5.62867 17.915 10C17.915 14.3713 14.3713 17.915 10 17.915C5.62867 17.915 2.08496 14.3713 2.08496 10C2.08496 5.62867 5.62867 2.08496 10 2.08496ZM10 3.41504C6.3632 3.41504 3.41504 6.3632 3.41504 10C3.41504 13.6368 6.3632 16.585 10 16.585C13.6368 16.585 16.585 13.6368 16.585 10C16.585 6.3632 13.6368 3.41504 10 3.41504Z"
              ></path>
            </svg>
          </div>

          <div className="flex-1 text-red-700 text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
          </div>
        </div>
        {onRetryClick && !isRetrying && (
          <button
            disabled={isRetrying}
            onClick={onRetryClick}
            className="inline-flex items-center px-4 gap-x-1 py-2 border border-gray-300 text-sm font-medium rounded-[18px] text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-label=""
              className="-ms-0.5 icon"
            >
              <path d="M16.4183 9.99967C16.4181 6.45518 13.5448 3.58188 10.0003 3.58171C7.96895 3.58171 6.15935 4.52712 4.98273 6.00163H7.50031L7.6341 6.0153C7.93707 6.07735 8.16535 6.34535 8.16535 6.66667C8.16535 6.98799 7.93707 7.25598 7.6341 7.31803L7.50031 7.33171H3.75031C3.73055 7.33171 3.71104 7.32656 3.69172 7.32487C3.68913 7.32464 3.68649 7.32513 3.68391 7.32487C3.64304 7.32082 3.60409 7.31254 3.56574 7.30143C3.56188 7.30031 3.55788 7.2997 3.55402 7.2985C3.51366 7.286 3.47546 7.27023 3.43879 7.25065L3.43586 7.24967C3.43444 7.24891 3.43337 7.24752 3.43195 7.24675C3.35757 7.20587 3.29219 7.15262 3.23859 7.08757C3.23505 7.08329 3.23128 7.07923 3.22785 7.07487C3.20549 7.04631 3.1858 7.01609 3.16828 6.98405C3.16491 6.97791 3.16169 6.97173 3.15852 6.9655C3.14408 6.93698 3.13265 6.90732 3.12238 6.87663C3.11744 6.86205 3.11264 6.84757 3.10871 6.83268C3.10316 6.81117 3.09843 6.78955 3.09504 6.76725C3.09108 6.74233 3.08833 6.71738 3.08723 6.69206C3.08691 6.68361 3.08527 6.67519 3.08527 6.66667V2.91667C3.08527 2.5494 3.38304 2.25163 3.75031 2.25163C4.11743 2.2518 4.41535 2.54951 4.41535 2.91667V4.62956C5.82462 3.16447 7.80565 2.25163 10.0003 2.25163C14.2793 2.2518 17.7482 5.72065 17.7484 9.99967C17.7484 14.2789 14.2794 17.7485 10.0003 17.7487C6.02899 17.7487 2.75629 14.7612 2.305 10.9108L2.96516 10.8337L3.62531 10.7555C3.99895 13.9437 6.7115 16.4186 10.0003 16.4186C13.5449 16.4184 16.4183 13.5443 16.4183 9.99967ZM2.88801 10.1725C3.25252 10.13 3.58237 10.3911 3.62531 10.7555L2.305 10.9108C2.26225 10.546 2.52323 10.2153 2.88801 10.1725Z"></path>
            </svg>
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
};
