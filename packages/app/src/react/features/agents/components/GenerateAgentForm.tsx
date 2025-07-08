import ToolTip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { useFileAttachment } from '@react/shared/hooks/useFileAttachment';
import classNames from 'classnames';
import { ClipboardEventHandler, useRef, useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';
import { TiCameraOutline } from 'react-icons/ti';
import { toast } from 'react-toastify';
import { GenerateAgentFormData } from '../types/agents.types';

interface GenerateAgentFormProps {
  onSubmit: (data: GenerateAgentFormData) => void;
  canEditAgents: boolean;
}

/**
 * Form component for generating new agents with text input and file attachment support
 */
export function GenerateAgentForm({ onSubmit, canEditAgents }: GenerateAgentFormProps) {
  const [initialWeaverMessage, setInitialWeaverMessage] = useState<string>('');
  const [isFileUploading, setIsFileUploading] = useState(false);
  const generateAgentInputRef = useRef<HTMLTextAreaElement>(null);

  const { attachmentFile, fileInputRef, isDragging, handlers, clearAttachment } = useFileAttachment(
    {
      onFileSelect: async (file: File) => {
        try {
          setIsFileUploading(true);
          setInitialWeaverMessage((prev) => (prev.trim() ? prev : ''));

          const reader = new FileReader();
          const filePromise = new Promise<void>((resolve) => {
            reader.onloadend = () => {
              const base64String = reader.result as string;
              localStorage.setItem(
                'chatAttachments',
                JSON.stringify({
                  attachments: [
                    {
                      name: file.name,
                      type: file.type,
                      data: base64String,
                    },
                  ],
                  ttl: Date.now() + 1000 * 60 * 3,
                }),
              );
              resolve();
            };
          });

          reader.readAsDataURL(file);
          await filePromise;
        } catch (error) {
          console.error('Error processing file:', error);
        } finally {
          setIsFileUploading(false);
        }
      },
    },
  );

  const handleSubmit = async () => {
    if (initialWeaverMessage.trim() || attachmentFile) {
      onSubmit({
        message: initialWeaverMessage,
        attachmentFile,
        isFileUploading,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!canEditAgents) {
        toast.error('Your current access level doesn\'t include this feature.');
        return;
      }
      handleSubmit();
    }
  };

  const actionButtons = (
    <div
      className={classNames('flex items-center self-end gap-3', {
        'opacity-50 cursor-not-allowed pointer-events-none': !canEditAgents,
      })}
    >
      <CustomButton
        handleClick={() => fileInputRef.current?.click()}
        variant="secondary"
        label="Screenshot"
        addIcon
        Icon={<TiCameraOutline className="mr-2" size={15} />}
        className="text-[#424242] border-[#D1D1D1] hover:border-[#C7C7C7] hover:bg-[#F5F5F5] rounded-full"
      />
      <CustomButton
        handleClick={handleSubmit}
        label="Build"
        addIcon
        Icon={<FaPaperPlane className="mr-2" size={15} />}
        dataAttributes={{ 'data-test': 'edit-agent-button' }}
        className="rounded-lg"
      />
    </div>
  );

  return (
    <div className="w-full px-0 md:w-[80%] max-w-[808px] mx-auto pt-6 rounded-lg mb-20">
      <div className="flex items-center justify-center gap-2">
        <h3 className="text-[#0F172A] text-2xl md:text-[2rem] md:leading-[1.5rem] tracking-normal font-semibold">
          What agent can I help you build?
        </h3>
      </div>

      <div
        className={classNames(
          'mt-5 border border-solid border-[#3B82F6] bg-[#F9FAFB] rounded-lg p-3 flex flex-col justify-between gap-2 transition-all duration-300',
          { 'border-2 border-dashed border-[#288a68]': isDragging },
          `${attachmentFile ? 'items-end h-[242px]' : 'items-center h-[178px]'}`,
        )}
        onDragEnter={handlers.handleDragEnter}
        onDragOver={handlers.handleDragOver}
        onDragLeave={handlers.handleDragLeave}
        onDrop={handlers.handleDrop}
        onClick={() => generateAgentInputRef.current?.focus()}
      >
        <div className="flex flex-col items-start w-full gap-4 flex-1 min-h-0">
          {attachmentFile && (
            <div className="relative group w-max">
              <img
                src={URL.createObjectURL(attachmentFile)}
                alt="attachment preview"
                className="w-16 h-16 rounded-lg relative group border border-solid border-gray-200 object-cover"
              />
              <button
                onClick={clearAttachment}
                className="shadow-sm opacity-0 group-hover:opacity-100 transition-opacity absolute -right-1 -top-1 border border-solid border-gray-200 rounded-full w-4 h-4 bg-gray-100 flex items-center justify-center group-hover:bg-white"
              >
                <span className="sr-only">Remove attachment</span>
                <i className="fas fa-times text-xs" />
              </button>
            </div>
          )}
          <textarea
            rows={3}
            ref={generateAgentInputRef}
            placeholder="Generate an agent that automates the creation, posting, and retrieval of WordPress articles."
            className="flex-1 outline-none w-full h-full bg-transparent placeholder:text-gray-400 placeholder:text-lg focus:ring-0 resize-none border-none p-0 text-lg"
            value={initialWeaverMessage}
            onChange={(e) => setInitialWeaverMessage(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlers.handlePaste as unknown as ClipboardEventHandler<HTMLTextAreaElement>}
          />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handlers.handleFileChange}
        />

        {canEditAgents ? (
          actionButtons
        ) : (
          <ToolTip
            classes="w-32"
            placement="bottom"
            text="Your current access level doesn't include this feature."
          >
            {actionButtons}
          </ToolTip>
        )}
      </div>
    </div>
  );
} 