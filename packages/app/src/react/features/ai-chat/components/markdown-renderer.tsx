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

          // Paragraph with spacing
          p: ({ ...props }) => <p className="leading-relaxed" {...props} />,
          // Links with color and underline
          a: ({ ...anchorProps }) => (
            <a
              {...anchorProps}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            />
          ),
          // Unordered list with bullets
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside mb-4 ml-4 space-y-2" {...props} />
          ),
          // Ordered list with numbers
          ol: ({ ...props }) => (
            <ol className="list-decimal list-inside mb-4 ml-4 space-y-2" {...props} />
          ),
          // List items
          li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
          // Blockquote styling
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-slate-300 pl-4 py-2 mb-4 italic text-slate-700"
              {...props}
            />
          ),
          // Pre-formatted code blocks - now handled by SyntaxHighlighter
          pre: ({ ...props }) => <pre {...props} />,
          // Horizontal rule
          hr: ({ ...props }) => <hr className="my-6 border-t border-slate-300" {...props} />,
          // Strong/bold text
          strong: ({ ...props }) => <strong className="font-bold" {...props} />,
          // Emphasis/italic text
          em: ({ ...props }) => <em className="italic" {...props} />,
          // Tables
          table: ({ ...props }) => (
            <table className="border-collapse border border-slate-300 my-4 w-full" {...props} />
          ),
          thead: ({ ...props }) => <thead className="bg-slate-200 font-semibold" {...props} />,
          tbody: ({ ...props }) => <tbody {...props} />,
          tr: ({ ...props }) => <tr className="border-b border-slate-300" {...props} />,
          th: ({ ...props }) => (
            <th
              className="border border-slate-300 px-4 py-2 text-left font-bold bg-slate-200"
              {...props}
            />
          ),
          td: ({ ...props }) => <td className="border border-slate-300 px-4 py-2" {...props} />,
          // Images with responsive sizing
          img: ({ ...props }) => <img className="max-w-full h-auto rounded my-4" {...props} />,
        }}
      />
    </div>
  );
};
