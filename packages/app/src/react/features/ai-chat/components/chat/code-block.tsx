import { FC, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlock {
  language: string;
  children: string;
}

export const CodeBlock: FC<CodeBlock> = ({ language, children }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(children).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="relative">
      <div
        className="flex items-center justify-between bg-gray-800 absolute top-0 right-0 rounded-br-none rounded-bl-none w-full px-2"
        style={{ zIndex: 1 }}
      >
        <div className="text-xs text-gray-400">{language}</div>
        <button
          onClick={handleCopyClick}
          className="text-gray-400 rounded py-1 text-xs flex items-center"
        >
          {isCopied ? <FaCheck /> : <FaRegCopy />}
          {isCopied ? ' Copied!' : ' Copy code'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={materialDark}
        PreTag="div"
        wrapLongLines
        wrapLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};
