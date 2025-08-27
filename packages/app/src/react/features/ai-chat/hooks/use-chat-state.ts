import { useCallback, useRef, useState } from 'react';

interface ChatStateProps {
  agentId?: string;
  domain?: string;
  devPort?: number | null;
  apiHeaders?: Record<string, string>;
}

interface ChatMessage {
  id: number;
  type: 'system' | 'user' | 'debug';
  content: string;
  attachments?: any[];
  updatedAt: number;
  isTyped?: boolean;
}

interface DefaultMessage {
  id: number;
  type: 'system';
  content: string;
  isTyped: boolean;
}

/**
 * Custom hook for chat state management (inspired by ChatBox functionality)
 * Manages chat messages, user input, AI responses, and chat interactions
 */
export const useChatState = ({ agentId, domain, devPort, apiHeaders }: ChatStateProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [executedIndices, setExecutedIndices] = useState<number[]>([]);
  const [isFunctionCall, setIsFunctionCall] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [canSendNewMessage, setCanSendNewMessage] = useState(true);
  const [defaultMessage, setDefaultMessage] = useState<DefaultMessage>({
    id: 1,
    type: 'system',
    content: '',
    isTyped: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [userStoppedGeneration, setUserStoppedGeneration] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Handles user input submission and AI response generation
   * @param isRetry - Whether this is a retry attempt
   * @param attachments - File attachments to include with the message
   */
  const handleUserInputSubmit = useCallback(
    async (isRetry: boolean, attachments: any[] = []): Promise<void> => {
      if (!userInput.trim() && attachments.length === 0) return;

      try {
        setIsGenerating(true);
        setErrorMessage('');
        setCanSendNewMessage(false);

        // Create user message
        const userMessage: ChatMessage = {
          id: Date.now(),
          type: 'user',
          content: userInput,
          attachments,
          updatedAt: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setUserInput('');

        // Simulate AI response
        setTimeout(() => {
          const aiMessage: ChatMessage = {
            id: Date.now() + 1,
            type: 'system',
            content: `I received your message: "${userInput}". This is a simulated response from the AI assistant.`,
            updatedAt: Date.now() + 1,
          };

          setMessages((prev) => [...prev, aiMessage]);
          setIsGenerating(false);
          setCanSendNewMessage(true);
        }, 2000);
      } catch (error) {
        console.error('Error sending message:', error);
        setErrorMessage('Failed to send message. Please try again.');
        setIsGenerating(false);
        setCanSendNewMessage(true);
      }
    },
    [userInput],
  );

  /**
   * Stops the current AI generation process
   */
  const handleStopGenerating = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setUserStoppedGeneration(true);
    setCanSendNewMessage(true);
  }, []);

  /**
   * Handles JSON objects from AI responses (for debug info)
   * @param jsonObjects - Array of JSON objects to process
   */
  const handleJSONObjects = useCallback((jsonObjects: any[]): void => {
    setDebugInfo(jsonObjects);
  }, []);

  return {
    messages,
    setMessages,
    debugInfo,
    setDebugInfo,
    userInput,
    setUserInput,
    isLoading,
    setIsLoading,
    errorMessage,
    setErrorMessage,
    executedIndices,
    setExecutedIndices,
    isFunctionCall,
    setIsFunctionCall,
    hasUserScrolled,
    setHasUserScrolled,
    canSendNewMessage,
    setCanSendNewMessage,
    defaultMessage,
    setDefaultMessage,
    isGenerating,
    setIsGenerating,
    userStoppedGeneration,
    setUserStoppedGeneration,
    handleUserInputSubmit,
    handleStopGenerating,
    handleJSONObjects,
  };
};
