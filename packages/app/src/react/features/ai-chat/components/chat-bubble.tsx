/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import '../styles/index.css';

import {
  CodeBlock,
  FileItemPreview,
  ReplyLoader,
  ThinkingMessage,
} from '@react/features/ai-chat/components';
import { IChatMessage, IMessageFile } from '@react/features/ai-chat/types/chat.types';
import { Tooltip } from 'flowbite-react';
import { FC, useCallback, useRef, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DEFAULT_AVATAR_URL =
  'https://gravatar.com/avatar/ccd5b19e810febbfd3d4321e27b15f77?s=400&d=mp&r=x';

// Re-export the interface for use in other components
export type { IChatMessage };

/**
 * Chat Bubble Component
 * Renders different message types based on type discriminator
 *
 * @param props - IChatMessage properties
 * @returns Appropriate message bubble component
 */
export const ChatBubble: FC<IChatMessage> = ({
  files,
  avatar,
  message,
  type,
  onRetryClick,
  thinkingMessage,
}) => {
  // ✅ Type-based discrimination - type is single source of truth

  // User message
  if (type === 'user') {
    return <UserMessageBubble message={message} files={files} />;
  }

  // Thinking message
  if (type === 'thinking') {
    return <ThinkingMessage message={message} avatar={avatar} />;
  }

  // Loading state (replying/retrying)
  if (type === 'loading') {
    return <ReplyLoader />;
  }

  // Error message
  if (type === 'error') {
    return (
      <SystemMessageBubble
        avatar={avatar}
        message={message}
        isError={true}
        onRetryClick={onRetryClick}
        isRetrying={false}
        thinkingMessage={thinkingMessage}
      />
    );
  }

  // System message (default)
  return (
    <SystemMessageBubble
      avatar={avatar}
      message={message}
      isError={false}
      onRetryClick={onRetryClick}
      isRetrying={false}
      thinkingMessage={thinkingMessage}
    />
  );
};

/**
 * User Message Bubble Properties
 */
interface IUserMessageBubble {
  message: string;
  files?: IMessageFile[];
}

/**
 * User Message Bubble Component
 * Displays user's message with optional file attachments
 * Message bubble automatically hidden if message is empty
 */
const UserMessageBubble: FC<IUserMessageBubble> = ({ message, files }) => {
  const hasFiles = files && files.length > 0;

  return (
    <div className="break-all flex flex-col items-end">
      {/* File Attachments */}
      {hasFiles && (
        <div className="flex flex-nowrap gap-2 mb-2 overflow-x-auto">
          {files.map((fileWithKey, index) => (
            <FileItemPreview
              isReadOnly
              key={fileWithKey.id || index}
              file={fileWithKey}
              fileKey={fileWithKey.metadata.key}
              inChatBubble={true}
            />
          ))}
        </div>
      )}

      {/* Message Bubble - automatically hidden if empty */}
      {message && (
        <div className="rounded-[18px] bg-[#f4f4f4] text-[#2b2b2b] p-3 px-4 w-fit whitespace-pre-wrap text-wrap max-w-[535px]">
          {message}
        </div>
      )}
    </div>
  );
};

/**
 * System Message Bubble Properties
 */
interface ISystemMessageBubble {
  message: string;
  avatar?: string;
  isError?: boolean;
  isRetrying?: boolean;
  onRetryClick?: () => void;
  thinkingMessage?: string;
}

/**
 * Copy timeout duration (milliseconds)
 */
const COPY_RESET_TIMEOUT = 2000;

/**
 * Markdown component overrides for consistent formatting
 */
const MARKDOWN_COMPONENTS = {
  // Headings with proper font sizes
  h1: ({ node, ...props }: { node?: unknown }) => (
    <h1 style={{ fontWeight: 'bold', fontSize: '2em' }} {...props} />
  ),
  h2: ({ node, ...props }: { node?: unknown }) => (
    <h2 style={{ fontWeight: 'bold', fontSize: '1.5em' }} {...props} />
  ),
  h3: ({ node, ...props }: { node?: unknown }) => (
    <h3 style={{ fontWeight: 'bold', fontSize: '1.17em' }} {...props} />
  ),
  h4: ({ node, ...props }: { node?: unknown }) => (
    <h4 style={{ fontWeight: 'bold', fontSize: '1em' }} {...props} />
  ),
  h5: ({ node, ...props }: { node?: unknown }) => (
    <h5 style={{ fontWeight: 'bold', fontSize: '0.83em' }} {...props} />
  ),
  h6: ({ node, ...props }: { node?: unknown }) => (
    <h6 style={{ fontWeight: 'bold', fontSize: '0.67em' }} {...props} />
  ),

  // Code blocks with syntax highlighting
  code({
    node,
    className,
    children,
    ...props
  }: {
    node?: unknown;
    className?: string;
    children?: React.ReactNode;
  }) {
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  // Images with responsive styling
  img: ({ node, ...props }: { node?: unknown }) => (
    <img {...props} className="rounded-xl" style={{ maxWidth: '100%', height: 'auto' }} />
  ),

  // Links that open in new tab
  a: ({ node, ...props }: { node?: unknown }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),

  // Paragraphs with whitespace preserved
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="whitespace-pre-wrap">{children}</p>
  ),
};

/**
 * System Message Bubble Component
 * Displays AI/system response with markdown support and copy functionality
 */
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

  /**
   * Handles copying message content to clipboard
   */
  const handleCopy = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const range = document.createRange();
    range.selectNodeContents(content);

    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);

    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_TIMEOUT);
    } catch (error) {
      console.error('Failed to copy text:', error); // eslint-disable-line no-console
    } finally {
      selection.removeAllRanges();
    }
  }, []);

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
            {/* Markdown content with syntax highlighting and formatting */}
            <ReactMarkdown
              children={message}
              remarkPlugins={[remarkGfm]}
              components={MARKDOWN_COMPONENTS}
            />

            {/* Inline thinking message indicator */}
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
  // Check if this is a 401 API key error

  const isApiKeyError =
    message.includes('Incorrect API key provided') ||
    (message.includes('401') &&
      message.toLowerCase().includes('api') &&
      message.toLocaleLowerCase().includes('key'));

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
            {isApiKeyError && (
              <>
                <h6 className="font-bold">Invalid API Key</h6>
                <p>
                  The API key you provided is not valid. Please set a valid key to continue:&nbsp;
                  <a
                    href="/vault"
                    target="_blank"
                    className="text-red-700 hover:text-red-900 font-semibold"
                  >
                    Set API Key
                  </a>
                </p>
                <h6 className="font-semibold pt-1">Error details:</h6>
              </>
            )}
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
