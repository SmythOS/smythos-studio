import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import '../styles/index.css';

import { AttachmentButton, FileItemPreview, SendButton } from '@react/features/ai-chat/components';
import { CHAT_ACCEPTED_FILE_TYPES } from '@react/features/ai-chat/constants';
import { useChatStores, useClipboardPaste } from '@react/features/ai-chat/hooks';
import { createFileFromText } from '@react/features/ai-chat/utils';
import {
  forceScrollToBottomImmediate,
  scrollManager,
} from '@react/features/ai-chat/utils/scroll-utils';
import { MAX_CHAT_MESSAGE_LENGTH } from '@react/shared/constants';
import { cn } from '@react/shared/utils/general';

const TEXTAREA_MAX_HEIGHT = 160;
const LARGE_TEXT_THRESHOLD = 4000;

export const ChatInput = () => {
  const { ref: allRefs, files: filesData, chat, agent } = useChatStores();
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isStreaming, isChatCreating, isProcessing, sendMessage, stopGenerating } = chat || {};
  const { data: files, addFiles, removeFile, clearFiles } = filesData || {};

  const maxLength = MAX_CHAT_MESSAGE_LENGTH;
  const isFilesLoading = filesData?.isLoading;
  const isMaxFilesUploaded = files.length >= 10;
  const isDisabled = isChatCreating || agent.isLoading.agent;

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      addFiles(Array.from(e.target.files));
    },
    [addFiles],
  );

  // Debounce ref for textarea height adjustment
  const heightAdjustmentTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Adjusts textarea height based on content
   * This is an expensive operation, so we debounce it
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = newHeight === TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  /**
   * Debounced version of textarea height adjustment
   * Improves typing performance by batching height calculations
   * Delay: 100ms (feels instant but reduces calculations by ~90%)
   */
  const debouncedAdjustHeight = useCallback(() => {
    // Clear existing timer
    if (heightAdjustmentTimerRef.current) {
      clearTimeout(heightAdjustmentTimerRef.current);
    }

    // Schedule new adjustment
    heightAdjustmentTimerRef.current = setTimeout(() => {
      adjustTextareaHeight();
      heightAdjustmentTimerRef.current = null;
    }, 100);
  }, [adjustTextareaHeight]);

  useImperativeHandle(
    allRefs?.input,
    () => ({
      focus: () => inputRef.current?.focus(),
      getValue: () => message,
      setValue: (content: string) => setMessage(content.slice(0, maxLength)),
    }),
    [maxLength, message],
  );

  /**
   * Adjust height when message changes (debounced for performance)
   * Also cleanup timer on unmount
   */
  useEffect(() => {
    debouncedAdjustHeight();

    // Cleanup function to clear pending timers
    return () => {
      if (heightAdjustmentTimerRef.current) {
        clearTimeout(heightAdjustmentTimerRef.current);
        heightAdjustmentTimerRef.current = null;
      }
    };
  }, [message, debouncedAdjustHeight]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value.slice(0, maxLength);
      setMessage(newValue);
    },
    [maxLength],
  );

  const handleSubmit = useCallback((): void => {
    if (isStreaming) return stopGenerating();

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 0 || files.length > 0) {
      sendMessage(trimmedMessage, files);
      setMessage('');
      clearFiles();

      // Clear any pending debounced height adjustments
      if (heightAdjustmentTimerRef.current) {
        clearTimeout(heightAdjustmentTimerRef.current);
        heightAdjustmentTimerRef.current = null;
      }

      // Immediately adjust height after clearing message (no debounce needed)
      requestAnimationFrame(() => adjustTextareaHeight());

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Professional scroll to bottom after sending message
      // Ensure scroll manager is initialized with the chat container
      let chatContainer = document.querySelector('[data-chat-container]') as HTMLElement;

      // Fallback: try to find container by class
      if (!chatContainer) {
        chatContainer = document.querySelector('.overflow-auto') as HTMLElement;
      }

      // Fallback: try to find container by scroll-smooth class
      if (!chatContainer) {
        chatContainer = document.querySelector('.scroll-smooth') as HTMLElement;
      }

      if (chatContainer) {
        scrollManager.init(chatContainer);
      } else {
        // Try to use existing container if any
        const existingContainer = scrollManager.getContainer();
        if (!existingContainer) {
          return; // No container available, skip scroll
        }
      }

      // Reset cooldown to ensure user-initiated scrolls always work
      scrollManager.resetForceScrollCooldown();

      // Add a small delay to ensure the message is added to DOM first
      setTimeout(() => {
        forceScrollToBottomImmediate({ behavior: 'smooth', delay: 0 });
      }, 150); // 150ms delay to ensure DOM is updated
    }
  }, [message, files, isStreaming, isDisabled, adjustTextareaHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        !isStreaming && handleSubmit();
      }
    },
    [handleSubmit, isStreaming],
  );

  const handleRemoveFile = useCallback(
    (index: number): void => {
      removeFile(index);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [removeFile],
  );

  const handleAttachmentClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // useClipboardPaste hook to handle paste events
  // it will handle file drops and large text paste
  // it will convert large text to file and drop it
  // it will handle file drops and large text paste
  useClipboardPaste({
    onFilePaste: addFiles,
    targetRef: inputRef,
    largeTextThreshold: LARGE_TEXT_THRESHOLD,
    onLargeTextPaste: (text) => {
      const file = createFileFromText(text);
      addFiles([file.file]);
    },
  });

  const isMaxLengthReached = message.length === maxLength;
  const canSubmit =
    !isDisabled && isFilesLoading && (message.trim().length > 0 || isStreaming || files.length > 0);

  const handleContainerClick = () => inputRef.current?.focus();

  return (
    <div
      className="w-full bg-white border border-solid border-[#e5e5e5] rounded-lg py-1 mt-2.5 text-sm flex flex-col items-start justify-center cursor-text"
      onClick={handleContainerClick}
    >
      {files.length > 0 && (
        <div
          className="flex flex-nowrap gap-2 w-full h-full px-2.5 py-5 overflow-x-auto"
          role="list"
          aria-label="Attached files"
        >
          {files.map((fileWithMetadata, index) => (
            <FileItemPreview
              key={`${fileWithMetadata.id}`}
              file={fileWithMetadata}
              onRemove={() => handleRemoveFile(index)}
              isUploading={isFilesLoading} // .has(fileWithMetadata.id)
            />
          ))}
        </div>
      )}

      <div
        className="rounded-lg py-1 px-2.5 flex items-center text-sm w-full min-h-[60px] cursor-text"
        onClick={handleContainerClick}
      >
        <input
          type="file"
          accept={CHAT_ACCEPTED_FILE_TYPES.input}
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          aria-label="File attachment input"
          onClick={(e) => e.stopPropagation()}
        />
        <textarea
          rows={1}
          ref={inputRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder={`Message ${agent.data?.name || ''}...`}
          className="bg-white border-none outline-none ring-0 focus:outline-none focus:border-none flex-1 max-h-36 resize-none ph-no-capture text-[16px] font-[400] text-gray-900 placeholder:text-gray-500 placeholder:text-[16px] placeholder:font-[400]"
          aria-label="Message input"
          onClick={(e) => e.stopPropagation()}
        />

        <div
          className={cn(
            'text-xs mr-2 w-[75px] text-right flex-shrink-0',
            isMaxLengthReached ? 'text-red-500' : 'text-gray-500',
          )}
          aria-live="polite"
          onClick={(e) => e.stopPropagation()}
        >
          {message.length}/{maxLength}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <AttachmentButton
            onClick={handleAttachmentClick}
            fileAttachmentDisabled={isMaxFilesUploaded || isDisabled || isProcessing || isStreaming}
            isMaxFilesUploaded={isMaxFilesUploaded}
          />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <SendButton
            isProcessing={isProcessing || isStreaming}
            disabled={!canSubmit}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};
