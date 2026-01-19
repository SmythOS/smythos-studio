import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import {
  FileItemPreview,
  PlusIcon,
  SendButton,
  UploadMenu,
} from '@react/features/ai-chat/components';
import { useChatStores, useClipboardPaste } from '@react/features/ai-chat/hooks';
import {
  adjustTextareaHeight,
  captureScreenshot,
  forceScrollToBottomImmediate,
  scrollManager,
  textToFile,
} from '@react/features/ai-chat/utils';
import { MAX_CHAT_MESSAGE_LENGTH } from '@react/shared/constants';
import { cn } from '@src/react/shared/utils/general';

const LARGE_TEXT_THRESHOLD = 4000;
const TEXTAREA_MAX_HEIGHT = 300;

export const Input = () => {
  const { refs, files: filesData, chat, agent } = useChatStores();
  const [message, setMessage] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const inputRef = refs?.input;

  const { isChatCreating } = chat || {};
  const { isStreaming, sendMessage, stopStreaming } = chat || {};
  const { isLoading, data: agentData, settings: agentSettings } = agent || {};
  const { attachments, status, addFiles, remove, clear, uploading } = filesData || {};

  const maxLength = MAX_CHAT_MESSAGE_LENGTH;
  const isChatbotDisabled = agentSettings?.chatbot === 'false';
  const isDisabled = isChatCreating || isLoading.agent || isChatbotDisabled;

  // Adjust textarea height when message changes
  useEffect(() => {
    adjustTextareaHeight(inputRef?.current ?? null, TEXTAREA_MAX_HEIGHT);
  }, [inputRef, message]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value.slice(0, maxLength);
      setMessage(newValue);
    },
    [maxLength],
  );

  const handleSubmit = useCallback((): void => {
    if (isChatbotDisabled || uploading) return;
    if (isStreaming) return stopStreaming();

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 0 || attachments.length > 0) {
      sendMessage(trimmedMessage);
      setMessage('');
      clear();
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
  }, [
    isChatbotDisabled,
    isStreaming,
    stopStreaming,
    message,
    attachments.length,
    sendMessage,
    clear,
    inputRef,
  ]);

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
    onFilePaste: addFiles,
    targetRef: inputRef,
    largeTextThreshold: LARGE_TEXT_THRESHOLD,
    onLargeTextPaste: (text) => addFiles([textToFile(text).file]),
  });

  // Keyboard shortcut: Ctrl+U to add files
  useEffect(() => {
    const handleKeyboardShortcut = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleAddFiles = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleTakeScreenshot = useCallback(async () => {
    const screenshotFile = await captureScreenshot();
    if (screenshotFile) addFiles([screenshotFile]);
  }, [addFiles]);

  const canSubmit =
    !isDisabled && (message.trim().length > 0 || isStreaming || attachments.length > 0);

  return (
    <div className="grid-area-[1/1] min-w-0 w-full mx-auto">
      <fieldset className="flex w-full min-w-0 flex-col">
        <div
          className="flex flex-col bg-white mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-2xl border 
        border-transparent shadow-[0_0.25rem_1.25rem_#00000009,0_0_0_0.5px_#C8C8C84D]
        hover:shadow-[0_0.25rem_1.25rem_#00000013,0_0_0_0.5px_#C8C8C866]
        focus-within:shadow-[0_0.25rem_1.25rem_#00000013,0_0_0_0.5px_#C8C8C866]"
        >
          <div className={cn('flex flex-col gap-2.5 p-3.5', attachments.length > 0 && 'pt-1.5')}>
            {attachments.length > 0 && (
              <div
                role="list"
                aria-label="Attached files"
                className="flex flex-nowrap gap-2 w-full h-full overflow-x-auto attachments-container-enter"
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

            <div className="w-full h-fit overflow-y-auto">
              <textarea
                rows={1}
                ref={inputRef}
                value={message}
                maxLength={maxLength}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                aria-label="Message input"
                onClick={(e) => e.stopPropagation()}
                placeholder={`Message ${agentData?.name || ''}...`}
                className="w-full min-h-12 max-h-96 bg-white border-none outline-none ring-0 focus:outline-none focus:border-none flex-1 resize-none ph-no-capture text-gray-900 placeholder:text-gray-500 px-1"
              />
            </div>

            <div className="w-full flex gap-2 items-center justify-between">
              <div className="relative  flex items-center shrink min-w-0 gap-2">
                <input
                  multiple
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  aria-label="File attachment input"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      addFiles(Array.from(e.target.files));
                    }
                  }}
                />

                <button
                  type="button"
                  aria-haspopup="menu"
                  onClick={toggleMenu}
                  ref={menuTriggerRef}
                  aria-label="Upload files"
                  aria-expanded={isMenuOpen}
                  className="border-[0.5px] transition-all h-8 flex items-center group cursor-pointer overflow-hidden px-1.5 min-w-8 rounded-lg justify-center text-gray-400 border-gray-200 hover:text-gray-600 hover:bg-gray-50 active:scale-[0.98] "
                >
                  <PlusIcon />
                </button>

                <UploadMenu
                  isOpen={isMenuOpen}
                  onClose={closeMenu}
                  onAddFiles={handleAddFiles}
                  onTakeScreenshot={handleTakeScreenshot}
                  triggerRef={menuTriggerRef}
                />
              </div>

              <SendButton
                onClick={handleSubmit}
                isStreaming={isStreaming}
                disabled={!canSubmit || uploading}
              />
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
};
