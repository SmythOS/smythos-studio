import { Tooltip, TooltipContent, TooltipTrigger } from '@src/react/shared/components/ui/tooltip';
import { Suspense, useEffect, useState } from 'react';
import { FaRegCopy } from 'react-icons/fa6';

type Props = {
  response: any;
  isStringified?: boolean;
  SyntaxHighlighter: any;
};

const ResponseJsonViewer = ({ response, SyntaxHighlighter }: Props) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const isText = typeof response === 'string';
  return (
    <div className="relative">
      <div className="absolute top-3 right-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <FaRegCopy
              cursor={'pointer'}
              onClick={() => {
                navigator.clipboard.writeText(isText ? response : JSON.stringify(response, null, 2));
                setCopied(true);
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{copied ? 'Copied!' : 'Copy'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SyntaxHighlighter language="json">
          {isText ? response : JSON.stringify(response, null, 2)}
        </SyntaxHighlighter>
      </Suspense>
    </div>
  );
};

export default ResponseJsonViewer;
