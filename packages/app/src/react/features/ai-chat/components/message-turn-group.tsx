/**
 * MessageTurnGroup Component
 * Groups messages by conversationTurnId and provides a single copy button for the entire group
 */

import { Tooltip } from 'flowbite-react';
import { FC, useRef, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa6';

import { IChatMessage } from '../types/chat.types';
import { Chat } from './chat';

interface IMessageTurnGroupProps {
  /** Messages in this conversation turn (all share same conversationTurnId) */
  messages: IChatMessage[];
  /** Agent avatar URL */
  avatar?: string;
  /** Retry callback for error messages */
  onRetryClick?: () => void;
  /** Scroll to bottom callback */
  scrollToBottom: (smooth?: boolean) => void; // eslint-disable-line no-unused-vars
}

/**
 * Groups messages from a single conversation turn
 * Displays all messages and provides a single copy button for the entire group
 */
export const MessageTurnGroup: FC<IMessageTurnGroupProps> = (props) => {
  const { messages, avatar, onRetryClick, scrollToBottom } = props;
  const [copied, setCopied] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  // Check if this group contains any system messages (for copy button visibility)
  const hasSystemMessages = messages.some(
    (msg) => msg.type === 'system' && msg.message && msg.message.trim() !== '',
  );

  // Check if the last message is complete (not loading or thinking)
  const lastMessage = messages[messages.length - 1];
  const isComplete =
    lastMessage &&
    lastMessage.type !== 'loading' &&
    lastMessage.type !== 'thinking' &&
    !lastMessage.thinkingMessage;

  /**
   * Copies all system message content from this group
   */
  const handleCopyGroup = () => {
    // Collect all system message content
    const allContent = messages
      .filter((msg) => msg.type === 'system' && msg.message && msg.message.trim() !== '')
      .map((msg) => msg.message)
      .join('\n\n'); // Join with double newline for separation

    if (allContent) {
      // Use modern Clipboard API
      navigator.clipboard
        .writeText(allContent)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          // Fallback to old method
          console.error('Failed to copy using Clipboard API: ', err); // eslint-disable-line no-console

          // Create temporary textarea
          const textarea = document.createElement('textarea');
          textarea.value = allContent;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();

          try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch (execErr) {
            console.error('Failed to copy text: ', execErr); // eslint-disable-line no-console
          }

          document.body.removeChild(textarea);
        });
    }
  };

  return (
    <div ref={groupRef} className="message-turn-group relative">
      {/* Render all messages in this turn */}
      <div className="space-y-2.5">
        {messages.map((message, index) => {
          const isLastInGroup = index === messages.length - 1;
          const canRetry = message.type === 'error' && isLastInGroup && onRetryClick;

          return (
            <Chat
              key={message.id || index}
              {...message}
              avatar={avatar}
              onRetryClick={canRetry ? onRetryClick : undefined}
              scrollToBottom={scrollToBottom}
            />
          );
        })}
      </div>

      {/* Single copy button for the entire group */}
      {hasSystemMessages && isComplete && (
        <div className="ps-2.5 pb-2.5">
          <Tooltip content={copied ? 'Copied!' : 'Copy all'} placement="bottom">
            <button
              onClick={handleCopyGroup}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Copy all messages"
            >
              {copied ? <FaCheck /> : <FaRegCopy />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
