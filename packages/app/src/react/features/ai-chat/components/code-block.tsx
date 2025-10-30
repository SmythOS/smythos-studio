import { DetailedHTMLProps, FC, HTMLAttributes, ReactNode, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlock {
  inline?: boolean;
  children?: ReactNode;
}

type Props = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & CodeBlock;

export const CodeBlock: FC<Props> = ({ className, children, inline, ...props }) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  let language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');

  // Render inline code without syntax highlighting
  if (inline) {
    return (
      <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm" {...props}>
        {children}
      </code>
    );
  }

  // Language aliases for better compatibility
  const languageAliases = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    sh: 'bash',
    yml: 'yaml',
  };

  // Normalize language
  if (languageAliases[language]) {
    language = languageAliases[language];
  }

  const handleCopyClick = () => {
    navigator.clipboard.writeText(String(children)).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="relative rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-800 px-2 w-full">
        <div className="text-xs text-slate-400">{language}</div>
        <button
          onClick={handleCopyClick}
          className="text-slate-400 rounded py-1 text-xs flex items-center"
        >
          {isCopied ? <FaCheck /> : <FaRegCopy />}
          {isCopied ? ' Copied!' : ' Copy code'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        PreTag="div"
        className=""
        wrapLines
        wrapLongLines
        showLineNumbers={false}
        customStyle={{
          margin: 0,
          borderRadius: '0',
          fontSize: '0.875rem',
          transition: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
        }}
        codeTagProps={{ style: { transition: 'none' } }}
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  );
};
