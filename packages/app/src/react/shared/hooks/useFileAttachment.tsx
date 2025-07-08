import { ChangeEvent, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { MAX_ATTACHMENT_SIZE } from '../../../shared/constants/general';

interface UseFileAttachmentProps {
  onFileSelect?: (file: File) => void;
  maxSize?: number;
  acceptedTypes?: readonly string[];
}

export const useFileAttachment = ({
  onFileSelect,
  maxSize = MAX_ATTACHMENT_SIZE,
  acceptedTypes = ['image/*'],
}: UseFileAttachmentProps = {}) => {
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.size > maxSize) {
      toast('File exceeds 5MB size limit', { type: 'error' });
      return false;
    }

    if (
      !acceptedTypes.some((type) => {
        const [category, ext] = type.split('/');
        return ext === '*' ? file.type.startsWith(category) : file.type === type;
      })
    ) {
      toast('Unsupported file type', { type: 'error' });
      return false;
    }

    setAttachmentFile(file);
    onFileSelect?.(file);
    return true;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    attachmentFile,
    fileInputRef,
    isDragging,
    handlers: {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileChange,
      handlePaste,
      handleFileSelect,
    },
    clearAttachment,
  };
};
