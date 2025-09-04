import { Request } from 'express';

import { Agent, AgentLogger, Conversation } from '@smythos/sre';

import config from '@core/config';
import { DEFAULT_MODEL } from '@core/constants';

import { EMBODIMENT_TYPES } from '@embodiment/constants';

import { getOpenAPIJSONForAI } from '../helpers/openapi-adapter.helper';
import { ChatConversationsEnv } from '../utils/chat.utils';
import { delay } from '../utils/date-time.utils';
import { FsChatbotContextStore } from './FsChatbotContextStore.class';
import { ConversationStreamYield } from './FsChatbotContextStore.class/FsChatbotContextExporter.class';

type Headers = {
  'x-conversation-id': string;
  Authorization?: string;
  'x-forwarded-for'?: string;
};

type ChatbotResponse = {
  content?: string;
  title?: string;
  debug?: string;
  function?: string;
  parameters?: any[];
  function_call?: any;
  isError?: boolean;
  errorType?: string;
};

function fnv1aHash(str) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return (hash >>> 0).toString(36).toUpperCase(); // Convert to Base36
}
export default class Chatbot {
  public sessionID;
  public conversationID;
  public agentId;
  public domain;
  public embodimentSettings;

  private agent: Agent;
  private systemMessage = '';
  private model = DEFAULT_MODEL;
  private modelInfo: any;
  private function_call_order = 0;
  private contextWindow = 1024 * 128;
  private maxOutputTokens = 4096;
  private client_ip = '';
  private toolCallId = '';
  private logId = '';
  private teamId = '';
  private passThroughNotifications = {};
  private isAgentChat = false;

  constructor(req: Request | any) {
    this.agentId = req._agent.id; //from AgentLoader middleware
    this.sessionID = req.sessionID;
    this.conversationID = req.headers['x-conversation-id'] || req.sessionID;
    this.domain = req._agent.domain; //req.hostname;
    this.agent = req._agent;
    this.client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    this.teamId = req._agent.teamId;
    this.isAgentChat = req.headers['x-ai-agent'] === 'true';
  }
  public async init() {
    // wait for agent settings and embodiments to be ready
    await this.agent.agentSettings?.ready();
    await this.agent.agentSettings?.embodiments?.ready();

    this.systemMessage = this.agent.data.behavior || this.agent.data.description || this.agent.data.shortDescription || '';

    this.model =
      this.agent.agentSettings?.get('chatGptModel') ||
      this.agent.agentSettings?.embodiments?.get(EMBODIMENT_TYPES.ChatBot, 'chatGptModel') ||
      this.model;

    // Initialize basic modelInfo since LLMRegistry is deprecated
    // SRE will handle the actual token limits and model validation
    this.modelInfo = {
      modelId: this.model,
      tokens: this.contextWindow,
      completionTokens: this.maxOutputTokens,
    };

    // Keep original model ID
    // this.model stays as is since SRE handles model resolution

    console.log('modelInfo', this.model, this.modelInfo);
  }

  /**
   * We use this function to serialize the chatbot object to save it in session
   * @returns {Object} serialized object
   */
  public serialize() {
    return {
      agentId: this.agentId,
      domain: this.domain,
      function_call_order: this.function_call_order,
      agentVersion: this.agent.version,
      //sessionID: this.sessionID,
      //conversationID: this.conversationID,
      embodimentSettings: this.embodimentSettings,
      systemMessage: this.systemMessage,
      model: this.model,
      modelInfo: this.modelInfo,
      contextWindow: this.contextWindow,
      maxOutputTokens: this.maxOutputTokens,
    };
  }

  /**
   * We use this function to deserialize the chatbot object from session
   * @param data {Object} serialized object
   */
  public deserialize(data) {
    this.agentId = data.agentId;
    this.domain = data.domain;
    this.function_call_order = data.function_call_order;
    //this.sessionID = data.sessionID;
    //this.conversationID = data.conversationID;
    this.embodimentSettings = data.embodimentSettings;
    this.systemMessage = data.systemMessage;
    this.model = data.model;
    this.modelInfo = data.modelInfo;
    this.contextWindow = data.contextWindow;
    this.maxOutputTokens = data.maxOutputTokens;
  }

  /**
   * Helper method to send error messages as normal content with error flags
   * @param error - The error object or message
   * @param errorType - Type of error for categorization
   * @param callback - Callback function to send response
   */
  private sendErrorMessage(error: any, errorType: string, callback: (response: ChatbotResponse) => void) {
    const errorMessage = error?.message || error?.code || error || 'An error occurred. Please try again later.';

    callback({
      content: errorMessage,
      isError: true,
      errorType: errorType,
    });
  }

  private async processChatMessage({
    message,
    headers,
    callback,
    abortSignal,
    contextStore,
    isAgentChatRequest,
  }: {
    message: string;
    headers: Record<string, string>;
    callback: (response: ChatbotResponse) => void;
    abortSignal?: AbortSignal;
    contextStore: FsChatbotContextStore;
    isAgentChatRequest?: boolean;
  }) {
    const conversationID = this.conversationID;

    this.function_call_order++;

    this.logId = AgentLogger.log(this.agent, null, {
      sourceId: 'chat',
      componentId: 'CHATBOT',
      domain: this.domain,
      input: message,
      inputTimestamp: new Date().toISOString(),
      sessionID: conversationID,
    });

    this.toolCallId = Math.round(Math.random() * Math.pow(10, 6))
      .toString(36)
      .toUpperCase();

    try {
      const spec = await getOpenAPIJSONForAI(this.domain, this.agent.usingTestDomain ? '' : 'latest', isAgentChatRequest);

      // Adapt the model based on the user's plan, especially to support certain OpenAI models for legacy users with limited tokens without their own API key.
      const conversation = new Conversation(this.model, spec, {
        maxContextSize: this.contextWindow,
        maxOutputTokens: this.maxOutputTokens,
        agentId: this.agentId,
        store: contextStore,
      });

      conversation.on('error', error => {
        console.error('Error in conversation:', error);

        // Send error as normal content with error flag instead of throwing
        this.sendErrorMessage(error, 'conversation_error', callback);
      });

      conversation.on('toolInfo', toolInfo => this.toolsInfoHandler(toolInfo, callback));

      conversation.on('beforeToolCall', (toolInfo, llmResponse) => this.beforeToolCallHandler(toolInfo, llmResponse, callback));

      conversation.on('afterToolCall', (toolInfo, toolResponse) => this.afterToolCallHandler(toolInfo, toolResponse, callback));

      // TODO: We need to stream the "thinking" content correctly. Currently, when using callback({..., debug: thinking}), it prints each chunk on a separate line, which doesn't preserve the original format. We need to fix this to maintain the original flow of the "thinking" content.
      // conversation.on('thinking', (thinking) => {
      //     callback({ title: `[${this.toolCallId}] Thought Process`, debug: thinking });
      // });

      // Print the thinking content at once
      conversation.on('thoughtProcess', thinking => {
        callback({
          title: `[${this.toolCallId}] Thought Process`,
          debug: thinking,
        });
      });

      conversation.on('content', content => {
        try {
          if (content?.indexOf('}{') >= 0) {
            // workaround to avoid broken json chunks parsing in the frontend
            // since all the json chunks are streamed in the same response, we use "}{" to separate them
            // if a content is equal to '}{' or contains it, we replace it with '} {' to avoid false new chunk
            content = content.replace(/}{/g, '} {');
          }
          callback({ content });
        } catch (e) {
          // Send content processing error as normal message with error flag
          this.sendErrorMessage(e, 'content_processing_error', callback);
        }
      });

      const isStickyDebug = this.agent.debugSessionEnabled || headers['X-MONITOR-ID'];
      const dbgHeaders = isStickyDebug ? { 'x-hash-id': this.client_ip } : {};
      const concurrentToolCalls = this.agent.debugSessionEnabled ? 1 : 4;
      const result = await conversation.streamPrompt(
        message,
        { 'x-caller-session-id': conversationID, ...headers, ...dbgHeaders },
        concurrentToolCalls,
        abortSignal,
      );

      if (this.logId)
        AgentLogger.log(this.agent, this.logId, {
          output: result,
          outputTimestamp: new Date().toISOString(),
        });
    } catch (error: any) {
      if (this.logId) {
        AgentLogger.log(this.agent, this.logId, {
          error: typeof error === 'object' ? JSON.stringify(error) : error,
        });
      }

      // Send error message as normal system message with error flag
      this.sendErrorMessage(error, 'system_error', callback);
    } finally {
      this.logId = '';
      this.toolCallId = '';
    }
  }

  private async toolsInfoHandler(toolsInfo, callback: (response: ChatbotResponse) => void) {
    if (this.agent.usingTestDomain || this.isAgentChat) {
      for (const tool of toolsInfo) {
        const toolHash = tool.id ? fnv1aHash(tool.id) : this.toolCallId;
        const dbgJson = {
          title: `[${toolHash}] Function Call : ${tool.name}`,
          debug: `${tool.name} (${tool?.arguments && typeof tool?.arguments === 'object' ? JSON.stringify(tool?.arguments) : tool?.arguments})`,
        };
        if (this.agent.debugSessionEnabled) {
          //attach to UI debugger
          dbgJson['function'] = 'updateStatus';
          dbgJson['parameters'] = ['Debugger: Attaching To Agent ...'];
        }

        callback(dbgJson);
        await delay(50);
        callback({
          function_call: { name: tool.name, arguments: tool.arguments },
        });
      }
    }
  }

  private async beforeToolCallHandler({ tool, args }, llmResponse, callback: (response: ChatbotResponse) => void) {
    if (this.logId)
      AgentLogger.log(this.agent, this.logId, {
        output: llmResponse,
        outputTimestamp: new Date().toISOString(),
      });
    const toolHash = tool.id ? fnv1aHash(tool.id) : this.toolCallId;
    if (this.agent.usingTestDomain || this.isAgentChat) {
      if (this.agent.debugSessionEnabled) {
        await delay(100);
        const dbgFunction = `${tool.name} (${args && typeof args === 'object' ? JSON.stringify(args) : args})`;

        let dbgJson = {
          title: `[${toolHash}] Function Call : ${tool.name}`,
          debug: `Debugging ${dbgFunction.substring(0, 50)} ...`,
        };
        dbgJson['function'] = 'callParentFunction';
        dbgJson['parameters'] = ['debugLastAction', [], 200];
        callback(dbgJson);
      }
    }

    if (this.agent.debugSessionEnabled) {
      await delay(3000); //give some time to the UI debugger to attach - FIXME : find a better way to do this
    }
  }

  private async afterToolCallHandler({ tool, args }, toolResponse, callback: (response: ChatbotResponse) => void) {
    const toolHash = tool.id ? fnv1aHash(tool.id) : this.toolCallId;
    if (this.agent.usingTestDomain || this.isAgentChat) {
      //workaround to avoid broken debug message in the frontend
      //replace all "}{" with "} {";
      const _toolResponse = toolResponse.replace(/}\{/g, '}_{');
      const chunkSize = 500;
      for (let i = 0, len = _toolResponse.length; i < len; i += chunkSize) {
        const chunk = _toolResponse.substr(i, chunkSize);

        if (!this.passThroughNotifications[this.toolCallId]) {
          callback({
            title: `[${toolHash}] Call Response : ${tool.name}`,
            debug: chunk,
          });
        }

        await delay(20);
      }
    }
  }

  public async getChatStreaming({
    message,
    callback,
    headers,
    abortSignal,
    isAgentChatRequest,
  }: {
    message: string;
    callback: (response: ChatbotResponse) => void;
    headers: Headers;
    abortSignal?: AbortSignal;
    isAgentChatRequest?: boolean;
  }) {
    const contextStore = new FsChatbotContextStore({
      agentId: this.agentId,
      conversationID: this.conversationID,
      dataPath: config.env.DATA_PATH,
    });

    return this.processChatMessage({
      message,
      headers,
      callback,
      abortSignal,
      contextStore,
      isAgentChatRequest,
    });
  }

  /* public async getAgentChatStreaming(message: string, callback: Function = () => {}, headers = {}, abortSignal?: AbortSignal) {
        return this.processChatMessage({ message, headers, callback, abortSignal });
    } */

  public async *exportAllConversations({ dateRange, env }: { dateRange?: string; env?: string }): AsyncGenerator<ConversationStreamYield> {
    const contextStore = new FsChatbotContextStore({
      agentId: this.agentId,
      conversationID: this.conversationID,
      dataPath: config.env.DATA_PATH,
    });
    // return contextStore.exporter.streamConversations({ dateRange, env: env as ChatConversationsEnv });
    for await (const stream of contextStore.exporter.streamConversations({
      dateRange,
      env: env as ChatConversationsEnv,
    })) {
      yield stream;
    }
  }
}
