import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import '../../styles/index.css';

import { AttachmentButton, SendButton } from '@react/features/ai-chat/components';
import { useChatStores, useClipboardPaste } from '@react/features/ai-chat/hooks';
import { adjustTextareaHeight, createFileFromText } from '@react/features/ai-chat/utils';
import { MAX_CHAT_MESSAGE_LENGTH } from '@react/shared/constants';
import { cn } from '@react/shared/utils/general';
import { FileItemPreview } from '@src/react/features/ai-chat/components/common/FileItemPreview';
import {
  forceScrollToBottomImmediate,
  scrollManager,
} from '@src/react/features/ai-chat/utils/scroll';

const LARGE_TEXT_THRESHOLD = 4000;

export const ChatInput = () => {
  const { ref: allRefs, files: filesData, chat, agent } = useChatStores();
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use inputRef from context (chatbot pattern - no useImperativeHandle needed)
  const inputRef = allRefs?.input;

  const { isChatCreating } = chat || {};
  const { isStreaming, sendMessage, stopStreaming } = chat || {};
  const { attachments, status, process, remove, clear, uploading } = filesData || {};

  const maxLength = MAX_CHAT_MESSAGE_LENGTH;
  const isMaxFilesUploaded = attachments.length >= 10;
  const isDisabled = isChatCreating || agent.isLoading.agent;

  // Adjust textarea height when message changes (chatbot pattern)
  useEffect(() => {
    adjustTextareaHeight(inputRef?.current ?? null);
  }, [message, inputRef]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value.slice(0, maxLength);
      setMessage(newValue);
    },
    [maxLength],
  );

  const handleSubmit = useCallback((): void => {
    if (isStreaming) return stopStreaming();

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 0 || attachments.length > 0) {
      sendMessage(trimmedMessage);
      setMessage('');
      clear();

      // Reset textarea height after clearing message
      requestAnimationFrame(() => adjustTextareaHeight(inputRef?.current ?? null));

      if (fileInputRef.current) fileInputRef.current.value = '';
      let container: HTMLElement = document.querySelector('[data-chat-container]');
      if (!container) container = document.querySelector('.overflow-auto');
      if (!container) container = document.querySelector('.scroll-smooth');

      if (container) {
        scrollManager.init(container);
      } else {
        const existingContainer = scrollManager.getContainer();
        if (!existingContainer) return;
      }

      scrollManager.resetForceScrollCooldown();

      setTimeout(() => {
        forceScrollToBottomImmediate({ behavior: 'smooth', delay: 0 });
      }, 150);
    }
  }, [isStreaming, stopStreaming, message, attachments.length, sendMessage, clear, inputRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming) handleSubmit();
      }
    },
    [handleSubmit, isStreaming],
  );

  const handleRemoveFile = useCallback(
    (index: number): void => {
      remove(index);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [remove],
  );

  useClipboardPaste({
    onFilePaste: process,
    targetRef: inputRef,
    largeTextThreshold: LARGE_TEXT_THRESHOLD,
    onLargeTextPaste: (text) => process([createFileFromText(text).file]),
  });

  const isMaxLengthReached = message.length === maxLength;
  const canSubmit =
    !isDisabled && (message.trim().length > 0 || isStreaming || attachments.length > 0);

  const handleContainerClick = () => inputRef?.current?.focus();

  return (
    <div
      onClick={handleContainerClick}
      className="w-full bg-white border border-solid border-[#e5e5e5] rounded-lg py-1 mt-2.5 text-sm flex flex-col items-start justify-center cursor-text"
    >
      {attachments.length > 0 && (
        <div
          role="list"
          aria-label="Attached files"
          className="flex flex-nowrap gap-2 w-full h-full px-2.5 py-5 overflow-x-auto"
        >
          {attachments.map((file, index) => (
            <FileItemPreview
              key={`${file.id}`}
              attachment={file}
              onRemove={() => handleRemoveFile(index)}
              isUploading={status[file.name]?.status === 'uploading'}
            />
          ))}
        </div>
      )}

      <div
        onClick={handleContainerClick}
        className="rounded-lg py-1 px-2.5 flex items-center text-sm w-full min-h-[60px] cursor-text"
      >
        <textarea
          rows={1}
          ref={inputRef}
          value={message}
          maxLength={maxLength}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
          onClick={(e) => e.stopPropagation()}
          placeholder={`Message ${agent.data?.name || ''}...`}
          className="bg-white border-none outline-none ring-0 focus:outline-none focus:border-none flex-1 max-h-36 resize-none ph-no-capture text-[16px] font-[400] text-gray-900 placeholder:text-gray-500 placeholder:text-[16px] placeholder:font-[400]"
        />

        <div
          aria-live="polite"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'text-xs mr-2 w-[75px] text-right flex-shrink-0',
            isMaxLengthReached ? 'text-red-500' : 'text-gray-500',
          )}
        >
          {message.length}/{maxLength}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <AttachmentButton
            onFilesAdd={process}
            fileInputRef={fileInputRef}
            isDisabled={isDisabled || isStreaming}
            isMaxFilesUploaded={isMaxFilesUploaded}
          />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <SendButton
            onClick={handleSubmit}
            isStreaming={isStreaming}
            disabled={!canSubmit || uploading}
          />
        </div>
      </div>
    </div>
  );
};
