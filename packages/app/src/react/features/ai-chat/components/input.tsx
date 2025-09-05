import {
  ChangeEvent,
  ClipboardEvent,
  forwardRef,
  KeyboardEvent,
  PropsWithoutRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import '../styles/index.css';

import { AttachmentButton, FileItemPreview, SendButton } from '@react/features/ai-chat/components';
import { CHAT_ACCEPTED_FILE_TYPES } from '@react/features/ai-chat/constants';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { createFileFromText } from '@react/features/ai-chat/utils';
import { MAX_CHAT_MESSAGE_LENGTH } from '@react/shared/constants';
import { cn } from '@src/react/shared/utils/general';

interface ChatInputProps extends PropsWithoutRef<JSX.IntrinsicElements['textarea']> {
  submitDisabled?: boolean;
  maxLength?: number;
}

export interface ChatInputRef {
  focus: () => void;
  getValue: () => string;
  setValue: (content: string) => void; // eslint-disable-line no-unused-vars
}

const TEXTAREA_MAX_HEIGHT = 160;
const LARGE_TEXT_THRESHOLD = 4000;

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  ({ submitDisabled = false, maxLength = MAX_CHAT_MESSAGE_LENGTH }, ref) => {
    const {
      files,
      removeFile,
      clearFiles,
      sendMessage,
      isGenerating,
      stopGenerating,
      uploadingFiles,
      inputDisabled,
      inputPlaceholder,
      isInputProcessing,
      handleFileDrop,
      handleFileChange,
      isMaxFilesUploaded,
    } = useChatContext();

    const [message, setMessage] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adjustTextareaHeight = useCallback(() => {
      const textarea = inputRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = newHeight === TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        getValue: () => message,
        setValue: (content: string) => setMessage(content.slice(0, maxLength)),
      }),
      [maxLength, message],
    );

    useEffect(() => adjustTextareaHeight(), [message, adjustTextareaHeight]);

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value.slice(0, maxLength);
        setMessage(newValue);
      },
      [maxLength],
    );

    const handleSubmit = useCallback((): void => {
      if (inputDisabled) return;
      if (isGenerating) return stopGenerating();

      const trimmedMessage = message.trim();
      if (trimmedMessage.length > 0 || files.length > 0) {
        sendMessage(trimmedMessage, files);
        setMessage('');
        clearFiles();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }, [message, files, isGenerating, inputDisabled]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      },
      [handleSubmit],
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

    const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text/plain');
      const text = message ? `${message} ${pasted}` : pasted;
      if (pasted.length >= LARGE_TEXT_THRESHOLD) {
        const file = createFileFromText(text);
        handleFileDrop([file.file]);
        setMessage('');
      } else setMessage(text);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollTop = inputRef.current.scrollHeight;
          inputRef.current.selectionStart = inputRef.current.selectionEnd =
            pasted.length >= LARGE_TEXT_THRESHOLD ? 0 : text.length;
        }
      }, 0);
    };

    const isMaxLengthReached = message.length === maxLength;
    const canSubmit =
      !submitDisabled && (message.trim().length > 0 || isGenerating || files.length > 0);

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
                isUploading={uploadingFiles.has(fileWithMetadata.id)}
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
            onPaste={handlePaste}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            maxLength={maxLength}
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
              fileAttachmentDisabled={
                isMaxFilesUploaded || inputDisabled || isInputProcessing || isGenerating
              }
              isMaxFilesUploaded={isMaxFilesUploaded}
            />
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <SendButton
              isProcessing={isInputProcessing || isGenerating}
              disabled={inputDisabled || !canSubmit}
              onClick={handleSubmit}
            />
          </div>
        </div>
      </div>
    );
  },
);
