/* eslint-disable no-console */
import config from '@src/builder-ui/config';
import { FileWithMetadata } from '@src/react/shared/types/chat.types';

type GenerateResponseInput = {
  agentId: string;
  chatId: string;
  query: string;
  fileKeys?: string[];
  signal: AbortSignal;
  onResponse: (value: string) => void; // eslint-disable-line no-unused-vars
  onStart: () => void;
  onEnd: () => void;
};

type ResponseFormat = { role?: string; content: string };

export const chatUtils = {
  getChatStreamURL: (agentId: string, isLocal = false) => {
    const remoteDomain = config.env.IS_DEV ? 'agent.stage.smyth.ai' : 'agent.a.smyth.ai';
    return isLocal
      ? `http://${agentId}.localagent.stage.smyth.ai:3000`
      : `https://${agentId}.${remoteDomain}`;
  },
  splitDataToJSONObjects: (data: string) => {
    const jsonStrings = data.split('}{').map((str, index, array) => {
      if (index !== 0) str = '{' + str;
      if (index !== array.length - 1) str += '}';
      return str;
    });

    return jsonStrings
      .map((str) => {
        try {
          return JSON.parse(str) as ResponseFormat;
        } catch (error) {
          console.error('Error parsing JSON:', error);
          return null;
        }
      })
      .filter(Boolean);
  },

  generateResponse: async (input: GenerateResponseInput) => {
    let message = '';

    try {
      const openAiResponse = await fetch('/api/page/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AGENT-ID': input.agentId,
          'x-conversation-id': input.chatId,
        },
        body: JSON.stringify({ message: input.query, fileKeys: input.fileKeys }),
        signal: input.signal,
      });

      if (!openAiResponse || openAiResponse?.status !== 200) {
        const { error } = await openAiResponse.json();
        throw new Error(error || 'Failed to get a valid response');
      }

      const reader = openAiResponse.body.getReader();
      let accumulatedData = '';

      input.onStart();
      while (true) {
        const { done, value } = await reader.read();
        if (input.signal.aborted) {
          reader.cancel();
          throw new DOMException('Aborted', 'AbortError');
        }

        accumulatedData += new TextDecoder().decode(value);
        if (!done) {
          const jsonObjects: ResponseFormat[] = chatUtils.splitDataToJSONObjects(accumulatedData);

          message += jsonObjects
            .filter((t) => 'assistant' !== t.role)
            .map((t) => t.content)
            .join('');
          input.onResponse(message);
          accumulatedData = '';
        } else break;
      }
    } catch (error) {
      console.error('Error generating response:', error);
      if (error.name === 'AbortError') console.log('Request was aborted');
      throw error;
    } finally {
      input.onEnd();
    }

    return message;
  },

  extractFirstSentence: (paragraph: string): string => {
    const sentenceEndRegex = /([.!?])\s/;
    const match = paragraph.match(sentenceEndRegex);
    if (match) return paragraph.substring(0, match.index + 1).trim();
    return paragraph.trim();
  },
};

export const createFileFromText = (content: string): FileWithMetadata => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `text-${timestamp}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  const id = `text-${timestamp}`;

  return { file, metadata: { fileType: 'text/plain', isUploading: false }, id };
};
