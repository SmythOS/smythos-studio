import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { CodeBlock } from '@react/features/ai-chat/components';
import { cn } from '@src/react/shared/utils/general';

interface IMarkdownRendererProps {
  message: string;
  className?: string;
}

/**
 * Shared Markdown renderer component with consistent styling
 * Used by both SystemMessage and Typewriter components
 */
export const MarkdownRenderer: FC<IMarkdownRendererProps> = ({ message, className }) => {
  return (
    <div className={className}>
      <ReactMarkdown
        children={message}
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers with consistent styling
          h1: (props) => <h1 style={{ fontWeight: 'bold', fontSize: '2em' }} {...props} />,
          h2: (props) => <h2 style={{ fontWeight: 'bold', fontSize: '1.5em' }} {...props} />,
          h3: (props) => <h3 style={{ fontWeight: 'bold', fontSize: '1.17em' }} {...props} />,
          h4: (props) => <h4 style={{ fontWeight: 'bold', fontSize: '1em' }} {...props} />,
          h5: (props) => <h5 style={{ fontWeight: 'bold', fontSize: '0.83em' }} {...props} />,
          h6: (props) => <h6 style={{ fontWeight: 'bold', fontSize: '0.67em' }} {...props} />,

          // Code blocks and inline code
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const content = String(children).replace(/\n$/, '');

            // Determine if content should be rendered as CodeBlock
            const isCodeBlock =
              match ||
              content.includes('\n') ||
              content.length > 50 ||
              /[{}();=<>]/.test(content) ||
              /^(function|class|import|export|const|let|var|if|for|while)/.test(content.trim());

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

          // Images with responsive styling
          img: (props) => (
            <img {...props} className="rounded-xl" style={{ maxWidth: '100%', height: 'auto' }} />
          ),

          // Links with security attributes
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,

          // Paragraphs with proper whitespace handling
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
        }}
      />
    </div>
  );
};
