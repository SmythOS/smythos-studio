import OpenAI from "openai";
import { Readable } from "stream";
import { Router, Request, Response } from "express";
import ApiError from "@core/utils/apiError";
import { Logger } from "@smythos/sre";
import { extractBearerToken } from "@core/services/smythAPIReq";
import { validate } from "@core/middlewares/validate.mw";
import { chatService } from "@embodiment/modules/openai/services/chat.service";
import { chatValidations } from "@embodiment/modules/openai/validations/openai.validation";
import {
  DEFAULT_AGENT_MODEL,
  DEFAULT_AGENT_MODEL_SETTINGS_KEY,
} from "@embodiment/constants";
import agentLoader from "@embodiment/middlewares/agentLoader.mw";
const router = Router();
const console = Logger("[Embodiment] Router: OpenAI");

// Helper function to create OpenAI API errors
const createOpenAIError = (statusCode: number, error: any) => {
  return new OpenAI.APIError(
    statusCode,
    {
      code: error?.errKey || error?.code,
      message: error?.message,
      type: error?.name,
    },
    error?.message,
    null
  );
};

router.post(
  "/v1/chat/completions",
  agentLoader,
  validate(chatValidations.chatCompletion),
  async (req: Request & { _agent: any }, res: Response) => {
    try {
      const agent = req._agent;

      // wait for agent settings to be ready
      await agent.agentSettings?.ready();

      const model =
        agent.agentSettings?.get(DEFAULT_AGENT_MODEL_SETTINGS_KEY) ||
        DEFAULT_AGENT_MODEL;

      const authHeader = req.headers["authorization"];
      const apiKey = extractBearerToken(authHeader);

      const result = await chatService.chatCompletion({
        apiKey,
        modelId: model,
        params: req.body,
        options: req.query,
        agent,
      });

      if (result instanceof ApiError) {
        const error = createOpenAIError(result.statusCode, result);
        return res.status(result.statusCode).json(error);
      }

      if (result instanceof Readable) {
        // Set proper headers for SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let headersSent = false;

        result.on("error", (error: any) => {
          console.warn("Chat completion error:", error);

          const status = error?.status || 500;

          const apiError = createOpenAIError(status, error);
          res.status(status).json(apiError);
        });

        result.pipe(res);
      } else {
        res.json(result);
      }
    } catch (error) {
      console.warn("Chat completion error:", error);

      const status = error?.status || 500;
      const apiError = createOpenAIError(status, error);
      return res.status(status).json(apiError);
    }
  }
);

export { router as openaiRouter };
