import { Tooltip } from 'flowbite-react';
import { FC, useRef, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { CodeBlock, ErrorMessage, ThinkingMessage } from '@react/features/ai-chat/components';
import { cn } from '@src/react/shared/utils/general';

interface ISystemMessageBubble {
  message: string;
  avatar?: string;
  isError?: boolean;
  isRetrying?: boolean;
  onRetryClick?: () => void;
  thinkingMessage?: string;
}

export const SystemMessage: FC<ISystemMessageBubble> = ({
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
          <ErrorMessage message={message} onRetryClick={onRetryClick} isRetrying={isRetrying} />
        ) : (
          <div className="chat-rich-text-response space-y-1 rounded-lg p-3 text-[#141414]">
            <ReactMarkdown
              children={message}
              remarkPlugins={[remarkGfm]}
              components={{
                // adding components to ensure formatting is preserved
                h1: (props) => <h1 style={{ fontWeight: 'bold', fontSize: '2em' }} {...props} />,
                h2: (props) => <h2 style={{ fontWeight: 'bold', fontSize: '1.5em' }} {...props} />,
                h3: (props) => <h3 style={{ fontWeight: 'bold', fontSize: '1.17em' }} {...props} />,
                h4: (props) => <h4 style={{ fontWeight: 'bold', fontSize: '1em' }} {...props} />,
                h5: (props) => <h5 style={{ fontWeight: 'bold', fontSize: '0.83em' }} {...props} />,
                h6: (props) => <h6 style={{ fontWeight: 'bold', fontSize: '0.67em' }} {...props} />,
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const content = String(children).replace(/\n$/, '');

                  // Only render as CodeBlock if:
                  // 1. Language is detected in className, OR
                  // 2. Content has multiple lines (likely a code block), OR
                  // 3. Content contains code-like patterns (functions, variables, etc.)
                  const isCodeBlock =
                    match ||
                    content.includes('\n') ||
                    content.length > 50 ||
                    /[{}();=<>]/.test(content) ||
                    /^(function|class|import|export|const|let|var|if|for|while)/.test(
                      content.trim(),
                    );

                  return isCodeBlock ? (
                    <CodeBlock language={match?.[1] || 'text'}>{content}</CodeBlock>
                  ) : (
                    <code
                      className={cn(
                        'bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border whitespace-pre-wrap text-wrap max-w-full',
                        className,
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                img: (props) => (
                  <img
                    {...props}
                    className="rounded-xl"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                ),
                a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
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
