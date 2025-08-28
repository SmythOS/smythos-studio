import ApiError from "@core/utils/apiError";
import { adaptModel } from "@core/utils/llm.utils";
import { getAgentIdAndVersion } from "@embodiment/helpers/agent.helper";
import {
  AccessCandidate,
  Agent,
  ConnectorService,
  Conversation,
  Logger,
} from "@smythos/sre";
import crypto from "crypto";
import { OpenAI } from "openai";
import { Readable } from "stream";

const console = Logger("[Embodiment] Service: OpenAI Chat");

interface ChatCompletionParams {
  apiKey: string;
  modelId: string;
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
  options?: {
    include_status?: boolean;
  };
  agent: Agent;
}

class OpenAIChatService {
  async chatCompletion({
    apiKey,
    modelId,
    params,
    options,
    agent,
  }: ChatCompletionParams): Promise<
    OpenAI.Chat.Completions.ChatCompletion | Readable | ApiError
  > {
    const { agentId, agentVersion } = getAgentIdAndVersion(params.model);
    console.log("parsed agentId and agentVersion", agentId, agentVersion);

    if (!apiKey) {
      return new ApiError(401, "Invalid Authentication", "Unauthorized");
    }

    // TODO: move this to the agent loader middleware
    const accessCandidate = AccessCandidate.agent(agentId);
    const vaultConnector = ConnectorService.getVaultConnector();
    const exists = await vaultConnector
      .user(accessCandidate)
      .exists(apiKey)
      .catch((error) => {
        console.error("Error checking if api key exists:", error);
        return false;
      });

    if (!exists) {
      return new ApiError(401, "Incorrect API key provided", "Unauthorized");
    }

    const systemPrompt = params.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    // Adapt the model based on the user's plan, especially to support certain OpenAI models for legacy users with limited tokens without their own API key.
    const adaptedModel = adaptModel(modelId, agent?.planInfo || {});
    const conv = new Conversation(adaptedModel, agentId, { agentVersion });
    await conv.ready;
    if (systemPrompt.trim()?.length) {
      conv.systemPrompt += `\n\n######\n\n${systemPrompt}`;
    }

    const history = params.messages.filter((m) => m.role !== "system");
    const lastUserMessageIndx =
      history.length -
      1 -
      [...history].reverse().findIndex((m) => m.role === "user");
    // remove the last user message from the history
    const lastUserMessage = history.splice(lastUserMessageIndx, 1)[0];

    for (const message of history) {
      switch (message.role) {
        case "user":
          const id = crypto.randomUUID();
          conv.context.addUserMessage(message.content as string, id);
          break;
        case "assistant":
          const id2 = crypto.randomUUID();
          conv.context.addAssistantMessage(message.content as string, id2);
          break;
      }
    }

    const completionId = `chatcmpl-${crypto.randomUUID()}`;

    if (params.stream) {
      const readable = new Readable({
        read() {},
      });

      conv.on("content", (content) => {
        const now = Date.now();
        const preparedContent: OpenAI.Chat.Completions.ChatCompletionChunk = {
          id: completionId,
          object: "chat.completion.chunk",
          created: now,
          model: params.model,
          choices: [{ index: 0, delta: { content }, finish_reason: null }],
        };
        // options?.include_status && this.randomlyEmitStatus(readable, completionId, now, params); // for PoC
        readable.push(`data: ${JSON.stringify(preparedContent)}\n\n`);
      });

      //Removed : passthrough content is now returned as normal content in the content event
      // conv.on('agentCallback', (content) => {
      //     const now = Date.now();
      //     const preparedContent: OpenAI.Chat.Completions.ChatCompletionChunk = {
      //         id: completionId,
      //         object: 'chat.completion.chunk',
      //         created: now,
      //         model: params.model,
      //         choices: [{ index: 0, delta: { content }, finish_reason: null }],
      //     };
      //     // options?.include_status && this.randomlyEmitStatus(readable, completionId, now, params); // for PoC
      //     readable.push(`data: ${JSON.stringify(preparedContent)}\n\n`);
      // });

      conv.on("beforeToolCall", (info) => {
        const now = Date.now();
        console.log("Before Tool Call:", info);
        // tool name info?.tool?.name
        if (!options?.include_status) return;

        const toolStatusChunk: OpenAI.Chat.Completions.ChatCompletionChunk & {
          choices: {
            index: number;
            delta: { content: string; status: string };
            finish_reason: string | null;
          }[];
        } = {
          id: completionId,
          object: "chat.completion.chunk",
          created: now,
          model: params.model,
          choices: [
            {
              finish_reason: null,
              index: 0,
              delta: {
                content: "",
                status: info?.tool?.name,
              },
            },
          ],
        };
        readable.push(`data: ${JSON.stringify(toolStatusChunk)}\n\n`);
      });

      conv.on("toolCall", (info) => {
        const now = Date.now();
        console.debug("Tool Call:", info);
        const toolStatusChunk: OpenAI.Chat.Completions.ChatCompletionChunk & {
          choices: {
            index: number;
            delta: { content: string };
            finish_reason: string | null;
          }[];
        } = {
          id: completionId,
          object: "chat.completion.chunk",
          created: now,
          model: params.model,
          choices: [
            {
              finish_reason: null,
              index: 0,
              delta: {
                smyth_event: {
                  type: "toolCall",
                  content: info?.tool?.name,
                },
                content: "",
              },
            },
          ],
        };
        readable.push(`data: ${JSON.stringify(toolStatusChunk)}\n\n`);
      });

      conv.on("usage", (usage) => {
        const now = Date.now();
        console.debug("Usage:", usage);
        // tool name info?.tool?.name
        // if (!options?.include_status) return;

        const toolStatusChunk: OpenAI.Chat.Completions.ChatCompletionChunk & {
          choices: {
            index: number;
            delta: { content: string };
            finish_reason: string | null;
          }[];
        } = {
          id: completionId,
          object: "chat.completion.chunk",
          created: now,
          model: params.model,
          choices: [
            {
              finish_reason: null,
              index: 0,
              delta: {
                smyth_event: {
                  type: "usage",
                  content: usage,
                },
                content: "",
              },
            },
          ],
        };
        readable.push(`data: ${JSON.stringify(toolStatusChunk)}\n\n`);
      });

      conv.on("end", () => {
        console.log("streaming: [DONE]");
        readable.push("data: [DONE]\n\n");
        readable.push(null);
      });

      conv.on("error", (error) => {
        console.info("streaming: error", error);
        readable.emit("error", error);
      });

      conv
        .streamPrompt(lastUserMessage?.content as string, {
          "X-AGENT-ID": agentId,
        })
        .catch((error) => {
          readable.emit("error", error);
        });

      return readable;
    } else {
      const now = Date.now();
      const result = (await conv.prompt(lastUserMessage?.content as string, {
        "X-AGENT-ID": agentId,
      })) as string;

      return {
        id: completionId,
        object: "chat.completion",
        created: now,
        model: params.model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: result, refusal: null },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
      };
    }
  }

  private firstTime = true;
  private randomlyEmitStatus(
    readable: Readable,
    completionId: string,
    now: number,
    params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
  ) {
    const shouldEmitStatus = this.firstTime || Math.random() < 0.5;
    this.firstTime && (this.firstTime = false);

    const randomToolStatus = [
      { text: "Thinking", pauseDelay: 5_000 },
      { text: "Analyzing", pauseDelay: 5_000 },
    ];
    if (shouldEmitStatus) {
      const status = randomToolStatus.pop();
      if (!status) return;
      const statusChunk: OpenAI.Chat.Completions.ChatCompletionChunk & {
        choices: {
          index: number;
          delta: { content: string; status: string };
          finish_reason: string | null;
        }[];
      } = {
        id: completionId,
        object: "chat.completion.chunk",
        created: now,
        model: params.model,
        choices: [
          {
            index: 0,
            delta: { content: "", status: status.text },
            finish_reason: null,
          },
        ],
        system_fingerprint: undefined,
      };
      readable.push(`data: ${JSON.stringify(statusChunk)}\n\n`);
      readable.pause();
      setTimeout(() => {
        readable.resume();
      }, status.pauseDelay);
    }
  }
}

export const chatService = new OpenAIChatService();
