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
} from '@react/features/ai-chat/components';
import { FileWithMetadata } from '@react/shared/types/chat.types';

const DEFAULT_AVATAR_URL =
  'https://gravatar.com/avatar/ccd5b19e810febbfd3d4321e27b15f77?s=400&d=mp&r=x';

export interface IChatMessage {
  me?: boolean;
  message: string;
  avatar?: string;
  isLast?: boolean;
  isError?: boolean;
  isReplying?: boolean;
  isRetrying?: boolean;
  isFirstMessage?: boolean;
  onRetryClick?: () => void;
  files?: FileWithMetadata[];
  hideMessageBubble?: boolean;
}

export const ChatBubble: FC<IChatMessage> = ({
  me,
  files,
  avatar,
  isLast,
  message,
  isReplying,
  isRetrying,
  onRetryClick,
  isError = false,
  hideMessageBubble,
}) => {
  if (me) {
    return (
      <UserMessageBubble message={message} files={files} hideMessageBubble={hideMessageBubble} />
    );
  }

  return isReplying || isRetrying ? (
    <ReplyLoader avatar={avatar ?? DEFAULT_AVATAR_URL} />
  ) : (
    <div className={me ? 'pl-[100px]' : ''}>
      <SystemMessageBubble
        message={message}
        isError={isError}
        onRetryClick={onRetryClick}
        isRetrying={isRetrying}
      />
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
        <div className="rounded-[4px] border border-solid border-[#D1D1D1] bg-[#F5F5F5] p-3 w-fit whitespace-pre-wrap text-wrap">
          {message}
        </div>
      )}
    </div>
  );
};

interface ISystemMessageBubble {
  message: string;
  isError?: boolean;
  isRetrying?: boolean;
  onRetryClick?: () => void;
}

const SystemMessageBubble: FC<ISystemMessageBubble> = ({
  message,
  isError,
  isRetrying,
  onRetryClick,
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
        console.error('Failed to copy text: ', err);
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
          <div className="chat-rich-text-response space-y-1">
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
          </div>
        )}
      </div>
      {!isError && (
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
}> = ({ message, isRetrying, onRetryClick }) => {
  return (
    <div>
      <div className="border border-solid border-gray-500 rounded-lg bg-grey p-4 ml-auto w-fit">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
      </div>
      {onRetryClick && !isRetrying && (
        <button
          disabled={isRetrying}
          onClick={onRetryClick}
          className="bg-primary-100 text-white w-28 h-12 rounded-lg flex justify-center items-center text-center mt-2"
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
    </div>
  );
};
