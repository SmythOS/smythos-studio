/**
 * View Datasource Dialog
 *
 * Displays detailed information about a datasource
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Tooltip } from 'flowbite-react';
import { Calendar, Database, FileText, Hash } from 'lucide-react';
import { FC, lazy, Suspense, useEffect, useState } from 'react';
import { FaRegCopy } from 'react-icons/fa6';
import type { Datasource } from '../types/datasource.types';

const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then((mod) => ({ default: mod.Light })),
);

// Import dark theme
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface ViewDatasourceDialogProps {
  isOpen: boolean;
  datasource: Datasource | null;
  onClose: () => void;
}

export const ViewDatasourceDialog: FC<ViewDatasourceDialogProps> = ({
  isOpen,
  datasource,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  if (!datasource) return null;

  const formatSize = (sizeMb: number | undefined): string => {
    if (!sizeMb) return '0 B';

    if (sizeMb < 0.001) {
      // Less than 1 KB, show in Bytes
      return `${Math.round(sizeMb * 1024 * 1024)} B`;
    } else if (sizeMb < 1) {
      // Less than 1 MB, show in KB
      return `${(sizeMb * 1024).toFixed(2)} KB`;
    } else {
      // Show in MB
      return `${sizeMb.toFixed(2)} MB`;
    }
  };

  const formatDate = (dateString: Date | string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateString);
    }
  };

  const parseMetadata = (): Record<string, unknown> => {
    try {
      return JSON.parse(datasource.metadata);
    } catch {
      return {};
    }
  };

  const metadata = parseMetadata();
  const vectorCount = datasource.vectorIds?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Datasource Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-hidden">
          {/* Header Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Name Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Name</span>
              </div>
              <p
                title={datasource.name}
                data-qa="datasource-name"
                className="text-lg font-semibold text-blue-900 truncate"
              >
                {datasource.name}
              </p>
            </div>

            {/* Vector Count Card */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Vectors</span>
              </div>
              <p className="text-lg font-semibold text-purple-900">
                {vectorCount.toLocaleString()}
              </p>
            </div>

            {/* Size Card */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Size</span>
              </div>
              <p className="text-lg font-semibold text-green-900">
                {datasource.datasourceSizeMb ? formatSize(datasource.datasourceSizeMb) : '-'}
              </p>
            </div>

            {/* Created Date Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Created</span>
              </div>
              <p className="text-sm font-semibold text-amber-900">
                {formatDate(datasource.createdAt)}
              </p>
            </div>
          </div>

          {/* Chunking Configuration */}
          {(datasource.chunkSize !== undefined || datasource.chunkOverlap !== undefined) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <span>⚙️</span> Chunking Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {datasource.chunkSize !== undefined && (
                  <div>
                    <span className="text-xs text-indigo-600 font-medium">Chunk Size</span>
                    <p data-qa="chunk-size" className="text-lg font-semibold text-indigo-900 mt-1">
                      {datasource.chunkSize.toLocaleString()}{' '}
                      <span className="text-sm font-normal">chars</span>
                    </p>
                  </div>
                )}
                {datasource.chunkOverlap !== undefined && (
                  <div>
                    <span className="text-xs text-indigo-600 font-medium">Chunk Overlap</span>
                    <p
                      data-qa="chunk-overlap"
                      className="text-lg font-semibold text-indigo-900 mt-1"
                    >
                      {datasource.chunkOverlap.toLocaleString()}{' '}
                      <span className="text-sm font-normal">chars</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata Section */}
          {metadata && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Metadata</h3>
              <div className="relative bg-[#282c34] border border-gray-700 rounded-lg overflow-hidden">
                <div className="absolute top-3 right-3 z-10">
                  <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="top">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
                        setCopied(true);
                      }}
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                    >
                      <FaRegCopy className="w-4 h-4 text-gray-300" />
                    </button>
                  </Tooltip>
                </div>
                <Suspense fallback={<div className="p-4 text-sm text-gray-300">Loading...</div>}>
                  <div className="overflow-x-auto">
                    <SyntaxHighlighter
                      language="json"
                      data-qa="metadata"
                      style={atomOneDark}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#282c34',
                        borderRadius: '0.5rem',
                      }}
                      wrapLongLines={true}
                    >
                      {JSON.stringify(metadata, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </Suspense>
              </div>
            </div>
          )}

          {/* Source Text Section */}
          {datasource.text && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Source Text</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto overflow-x-hidden">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words break-all font-mono overflow-wrap-anywhere">
                  {datasource.text}
                </pre>
              </div>
            </div>
          )}

          {/* Vector IDs Section (Collapsible) */}
          {vectorCount > 0 && (
            <details className="space-y-2">
              <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
                Vector IDs ({vectorCount})
              </summary>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto overflow-x-hidden">
                <ul className="space-y-1">
                  {datasource.vectorIds.map((vectorId, index) => (
                    <li
                      key={vectorId}
                      className="text-xs text-gray-600 font-mono py-1 px-2 hover:bg-gray-100 rounded break-all"
                    >
                      {index + 1}. {vectorId}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {/* Additional Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Additional Information</h3>
            <div className="text-sm">
              <div>
                <span className="text-gray-600">Datasource ID:</span>
                <p className="font-mono text-xs text-gray-900 break-all mt-1" title={datasource.id}>
                  {datasource.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
