import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { CodeBlock } from '@react/features/ai-chat/components';
import { cn } from '@react/shared/utils/general';

type TProps = {
  message: string;
  className?: string;
};

export const MarkdownRenderer: FC<TProps> = ({ message, className }) => {
  return (
    <div className={className}>
      <ReactMarkdown
        children={message}
        remarkPlugins={[remarkGfm]}
        components={{
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

          // Headers with consistent styling
          h1: (props) => <h1 className="text-[2em] font-bold" {...props} />,
          h2: (props) => <h2 className="text-[1.5em] font-bold" {...props} />,
          h3: (props) => <h3 className="text-[1.17em] font-bold" {...props} />,
          h4: (props) => <h4 className="text-[1em] font-bold" {...props} />,
          h5: (props) => <h5 className="text-[0.83em] font-bold" {...props} />,
          h6: (props) => <h6 className="text-[0.67em] font-bold" {...props} />,

          // Images with responsive styling
          img: (props) => <img {...props} className="max-w-full h-auto rounded my-4" />,
          // Paragraphs styling
          p: (props) => <p className="leading-relaxed" {...props} />,
          // Links with color and underline
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            />
          ),
          // Unordered list with bullets
          ul: (props) => (
            <ul {...props} className="list-disc list-inside space-y-2 leading-relaxed" />
          ),
          // Ordered list with numbers
          ol: (props) => (
            <ol {...props} className="list-decimal list-inside space-y-2 leading-relaxed" />
          ),
          // List items
          li: (props) => <li className="leading-relaxed" {...props} />,
          // Blockquote styling
          blockquote: (props) => (
            <blockquote
              {...props}
              className="border-l-4 border-slate-300 pl-4 py-2 mb-4 italic text-slate-700"
            />
          ),

          // Horizontal rule
          hr: (props) => <hr className="my-6 border-t border-slate-300" {...props} />,
          // Strong/bold text
          strong: (props) => <strong className="font-bold" {...props} />,
          // Emphasis/italic text
          em: (props) => <em className="italic" {...props} />,
          // Tables
          table: (props) => (
            <table className="border-collapse border border-slate-300 mb-4 w-full" {...props} />
          ),
          thead: (props) => <thead className="bg-slate-200 font-semibold" {...props} />,
          tbody: (props) => <tbody {...props} />,
          tr: (props) => <tr className="border-b border-slate-300" {...props} />,
          th: (props) => (
            <th
              {...props}
              className="border border-slate-300 px-4 py-2 text-left font-bold bg-slate-200"
            />
          ),
          td: (props) => <td className="border border-slate-300 px-4 py-2" {...props} />,
        }}
      />
    </div>
  );
};
