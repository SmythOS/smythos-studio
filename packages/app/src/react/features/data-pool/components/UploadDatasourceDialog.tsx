/**
 * Upload Datasource Dialog
 *
 * Allows users to upload datasources via file upload or raw text
 */

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Input } from '@src/react/shared/components/ui/input';
import { JsonEditor } from '@src/react/shared/components/ui/json-editor';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { errorToast, successToast } from '@src/shared/components/toast';
import { FileText, Upload, X } from 'lucide-react';
import { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import { datasourceClient } from '../client/datasource.client';

interface UploadDatasourceDialogProps {
  isOpen: boolean;
  namespaceLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadMode = 'file' | 'text';

export const UploadDatasourceDialog: FC<UploadDatasourceDialogProps> = ({
  isOpen,
  namespaceLabel,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<UploadMode>('file');
  const [datasourceLabel, setDatasourceLabel] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [chunkSize, setChunkSize] = useState<string>('');
  const [chunkOverlap, setChunkOverlap] = useState<string>('');
  const [metadata, setMetadata] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('file');
      setDatasourceLabel('');
      setFile(null);
      setRawText('');
      setChunkSize('');
      setChunkOverlap('');
      setMetadata('');
      setIsDragging(false);
      setIsUploading(false);
      setError(null);
    }
  }, [isOpen]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validateAndSetFile = (selectedFile: File) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.txt', '.pdf', '.docx'];
    const ext = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

    if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(ext)) {
      setError('Only .txt, .pdf, and .docx files are allowed');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Auto-populate label if empty
    if (!datasourceLabel) {
      const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
      setDatasourceLabel(nameWithoutExt);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!datasourceLabel.trim()) {
      setError('Datasource label is required');
      return;
    }

    let fileToUpload: File | null = null;

    if (mode === 'file') {
      if (!file) {
        setError('Please select a file');
        return;
      }
      fileToUpload = file;
    } else {
      if (!rawText.trim()) {
        setError('Please enter some text');
        return;
      }
      // Convert raw text to a file
      const blob = new Blob([rawText], { type: 'text/plain' });
      fileToUpload = new File([blob], `${datasourceLabel}.txt`, { type: 'text/plain' });
    }

    // Validate metadata if provided
    let parsedMetadata: Record<string, unknown> | undefined;
    if (metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(metadata);
        if (typeof parsedMetadata !== 'object' || parsedMetadata === null) {
          setError('Metadata must be a valid JSON object');
          return;
        }
      } catch (err) {
        setError('Invalid JSON in metadata: ' + (err as Error).message);
        return;
      }
    }

    setIsUploading(true);
    try {
      const parsedChunkSize = parseInt(chunkSize, 10);
      const parsedChunkOverlap = parseInt(chunkOverlap, 10);

      await datasourceClient.createDatasource(namespaceLabel, {
        datasourceLabel: datasourceLabel.trim(),
        file: fileToUpload,
        chunkSize: !isNaN(parsedChunkSize) && parsedChunkSize > 0 ? parsedChunkSize : undefined,
        chunkOverlap:
          !isNaN(parsedChunkOverlap) && parsedChunkOverlap >= 0 ? parsedChunkOverlap : undefined,
        metadata: parsedMetadata,
      });
      successToast('Datasource uploaded successfully');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || 'Failed to upload datasource';
      errorToast(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isValid =
    datasourceLabel.trim() !== '' && (mode === 'file' ? file !== null : rawText.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Datasource</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
          {/* Datasource Label */}
          <div className="space-y-2">
            <Input
              label="Datasource Label"
              required
              fullWidth
              type="text"
              placeholder="Enter a name for your datasource"
              value={datasourceLabel}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setDatasourceLabel(e.target.value);
                setError(null);
              }}
              disabled={isUploading}
              error={!!error && !datasourceLabel.trim()}
            />
          </div>

          {/* Mode Selection */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('file')}
              disabled={isUploading}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                mode === 'file'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload File</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              disabled={isUploading}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                mode === 'text'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Raw Text</span>
              </div>
            </button>
          </div>

          {/* File Upload Mode */}
          {mode === 'file' && (
            <div className="space-y-3">
              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-700 font-medium mb-1">Drag and drop your file here</p>
                  <p className="text-sm text-gray-500 mb-3">or</p>
                  <label className="inline-block">
                    <input
                      type="file"
                      className="hidden"
                      disabled={isUploading}
                      accept=".txt,.pdf,.docx"
                      onChange={handleFileSelect}
                      data-qa="file-dropzone-input"
                    />
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-block">
                      Browse Files
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-3">
                    Supported formats: .txt, .pdf, .docx (Max 10MB)
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={isUploading}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw Text Mode */}
          {mode === 'text' && (
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-normal">
                Text Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setError(null);
                }}
                disabled={isUploading}
                placeholder="Paste or type your text content here..."
                // make font size smaller: font-size-sm
                className="w-full h-64 px-3 py-2 border text-sm border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none font-light"
              />
              <p className="text-xs text-gray-500">This text will be saved as a .txt file</p>
            </div>
          )}

          {/* Advanced Configuration - Collapsible */}
          <details className="border-t pt-4 mt-4">
            <summary className="text-md font-semibold mb-2 text-gray-900 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2">
              <span>⚙️</span> Advanced Configuration
            </summary>
            <div className="mt-3 space-y-6">
              {/* Chunking Configuration */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  <span>📄</span> Chunking Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chunk Size */}
                  <div className="space-y-2">
                    <label className="text-gray-700 text-sm font-normal flex items-center gap-1">
                      Chunk Size
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={chunkSize}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setChunkSize(e.target.value)}
                      disabled={isUploading}
                      placeholder="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                    />
                    <p className="text-xs text-gray-500">Maximum characters per chunk</p>
                  </div>

                  {/* Chunk Overlap */}
                  <div className="space-y-2">
                    <label className="text-gray-700 text-sm font-normal flex items-center gap-1">
                      Chunk Overlap
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={chunkOverlap}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setChunkOverlap(e.target.value)
                      }
                      disabled={isUploading}
                      placeholder="200"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                    />
                    <p className="text-xs text-gray-500">Overlapping characters between chunks</p>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>💡 Tip:</strong> Larger chunks preserve more context but may be less
                    precise. Overlap helps maintain continuity between chunks. Use defaults for most
                    cases.
                  </p>
                </div>
              </div>

              {/* Metadata Configuration */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  <span>🏷️</span> Custom Metadata
                </h4>
                <JsonEditor
                  value={metadata}
                  onChange={setMetadata}
                  placeholder={
                    '{\n  "author": "John Doe",\n  "category": "research",\n  "tags": ["ai", "ml"]\n}'
                  }
                  disabled={isUploading}
                  height="150px"
                />
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>📝 Note:</strong> Add custom metadata as JSON to enrich your datasource
                    with additional information. This is optional and can be used for filtering and
                    organization.
                  </p>
                </div>
              </div>
            </div>
          </details>

          {/* Error Message */}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter className="shrink-0">
          <CustomButton
            variant="primary"
            label={isUploading ? 'Uploading...' : 'Upload'}
            handleClick={handleUpload}
            disabled={!isValid || isUploading}
            loading={isUploading}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
