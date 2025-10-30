import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { CodeBlock } from '@react/features/ai-chat/components';

interface IMarkdownRendererProps {
  message: string;
  className?: string;
}

/**
 * Shared Markdown renderer component with consistent styling
 * Used by both SystemMessage and Typewriter components
 */
export const MarkdownRenderer: FC<IMarkdownRendererProps> = ({ message, className }) => {
  /**
   * Preprocess markdown to handle nested code blocks properly
   * Simple and robust: Only unwrap if entire content is in a single outer fence
   */
  const preprocessMarkdown = (text: string): string => {
    if (!text) return text;

    // Trim to avoid whitespace issues
    const trimmed = text.trim();
    const lines = trimmed.split('\n');

    // Must have at least 3 lines (opening fence, content, closing fence)
    if (lines.length < 3) return text;

    const firstLine = lines[0].trim();
    const lastLine = lines[lines.length - 1].trim();

    // Check if wrapped in code fences
    // First line: ```optionalLanguage
    // Last line: ```
    if (firstLine.startsWith('```') && lastLine === '```') {
      // Extract inner content (everything between first and last line)
      const innerContent = lines.slice(1, -1).join('\n');

      // Only unwrap if inner content has nested code blocks
      // This indicates it's a documentation wrapper, not actual code
      if (innerContent.includes('```')) {
        return innerContent;
      }
    }

    return text;
  };

  // Process markdown: remove nested wrappers if present
  const normalizedMessage = preprocessMarkdown(message);

  return (
    <div className={className}>
      <ReactMarkdown
        children={normalizedMessage}
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers with proper spacing using Tailwind
          h1: (props) => <h1 className="text-3xl font-bold my-4" {...props} />,
          h2: (props) => <h2 className="text-2xl font-bold my-3" {...props} />,
          h3: (props) => <h3 className="text-xl font-bold my-3" {...props} />,
          h4: (props) => <h4 className="text-lg font-bold my-2" {...props} />,
          h5: (props) => <h5 className="text-base font-bold my-2" {...props} />,
          h6: (props) => <h6 className="text-sm font-bold my-2" {...props} />,

          // Code blocks and inline code
          code: ({ ...props }) => <CodeBlock {...props} />,

          // Paragraph with proper spacing
          p: ({ ...props }) => <p className="mb-4 leading-relaxed" {...props} />,

          // Links with color and underline
          a: ({ ...anchorProps }) => (
            <a
              {...anchorProps}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            />
          ),

          // Lists with proper spacing and visible markers
          ul: ({ ...props }) => <ul className="list-disc list-outside pl-8 space-y-4" {...props} />,
          ol: ({ ...props }) => (
            <ol className="list-decimal list-outside pl-8 space-y-4" {...props} />
          ),
          li: ({ ...props }) => <li className="leading-relaxed ml-2 mb-4" {...props} />,

          // Blockquote styling
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-slate-300 pl-4 py-2 my-3 italic" {...props} />
          ),

          // Pre-formatted code blocks - pass through with wrapper
          pre: ({ children }) => <div className="my-4">{children}</div>,
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
