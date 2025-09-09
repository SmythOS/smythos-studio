import express from 'express';
import Joi from 'joi';

import { Logger } from '@smythos/sre';

import config from '@core/config';
import { getM2MToken } from '@core/helpers/logto.helper';
import UserAgentAccessCheck from '@core/middlewares/userAgentAccessCheck.mw';
import { validate } from '@core/middlewares/validate.mw';
import { requestContext } from '@core/services/request-context';
import { includeAuth, mwSysAPI } from '@core/services/smythAPIReq';

import AgentLoader from '@embodiment/middlewares/agentLoader.mw';
import ChatbotLoader from '@embodiment/middlewares/ChatbotLoader.mw';
import Chatbot from '@embodiment/services/Chatbot.class';
import { buildConversationId } from '@embodiment/utils/chat.utils';

const console = Logger('[Embodiment] Router: Agent Chat');

const router = express.Router();

// Import ChatbotResponse type for proper typing
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

// declare the req._chatbot type

const middlewares = [UserAgentAccessCheck, AgentLoader, ChatbotLoader];
router.use(middlewares);

const localAgentAuthorizations = {
  // FIXME : this seems like a hardcoded value used by Arslan during implementation, should we remove it ?
  clzi8yw441kcfblqz6zj9bv1h: {
    verifiedKey: 'SomeRandomToken',
    authMethod: 'api-key-bearer',
  },
};

const validations = {
  exportConversations: {
    body: Joi.object({
      // e.g timestamp1,timestamp2 e.g: 1716864000000,1716950400000
      dateRange: Joi.string()
        .optional()
        .regex(/^\d+,\d+$/)
        .message('Invalid date range. Expected format: timestamp,timestamp'),
      // e.g test, prod (enum)
      env: Joi.string().valid('test', 'prod').required(),
    }),
  },
};

router.post('/stream', async (req, res) => {
  let streamStarted = false;
  const isLocalAgent = req.hostname.includes('localagent');
  const agentId = req._agent?.id;
  const agentVersion = req._agent?.version;
  let verifiedKey = null;

  if (isLocalAgent) {
    verifiedKey = localAgentAuthorizations?.[agentId]?.verifiedKey;
  } else {
    verifiedKey = req.session.agentAuthorizations?.[agentId]?.verifiedKey;
  }

  const abortController = new AbortController();
  try {
    const { message } = req.body;
    if (!req._chatbot) {
      return res.status(404).send({ error: 'Chatbot not found' });
    }
    const chatbot: Chatbot = req._chatbot;
    const userId = req.header('x-user-id') || 'none';
    const teamId = req.header('x-team-id') || 'none';
    const isAgentChatRequest = req.header('x-conversation-id') !== undefined;
    chatbot.conversationID = req.header('x-conversation-id') || req.sessionID;

    const headers: any = {};
    if (verifiedKey) {
      headers.Authorization = `Bearer ${verifiedKey}`;
    }

    console.log('headers', {
      userId,
      teamId,
      conver: chatbot.conversationID,
    });

    const dataPath = config.env.DATA_PATH;

    if (!dataPath) {
      return res.status(500).send({ error: 'Data path is not set' });
    }

    // set response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // const headers = { 'X-AGENT-ID': agentId, 'X-AGENT-VERSION': agentVersion };
    headers['X-AGENT-ID'] = undefined; // because we don't debug with agent chat and this is required to make sre-runtime call the agent via http
    headers['X-AGENT-VERSION'] = agentVersion;
    headers['x-conversation-id'] = chatbot.conversationID;

    await chatbot.getChatStreaming({
      message,
      callback: (data: ChatbotResponse) => {
        res.write(JSON.stringify(data));
        streamStarted = true;
      },
      headers,
      abortSignal: abortController.signal,
      isAgentChatRequest,
    });

    res.end();
  } catch (error: any) {
    console.error(error);
    if (!streamStarted) {
      res.status(500).send({
        content: error?.message || 'An error occurred. Please try again later.',
        isError: true,
        errorType: 'api_error',
      });
    } else {
      // Stream error message in the same format as normal responses
      res.write(
        JSON.stringify({
          content: "I'm not able to contact the server. Please try again.",
          isError: true,
          errorType: 'connection_error',
        }),
      );
      res.end();
    }
  }
});

router.post('/new', async (req, res) => {
  const { conversation = {} } = req.body;
  const isTestDomain = req.hostname.includes(`.${config.env.DEFAULT_AGENT_DOMAIN}`);
  const agentId = req.header('X-AGENT-ID');

  const teamDetails = requestContext.get(`team_info:${agentId}`);
  if (!teamDetails?.teamId) return res.status(400).send({ error: 'Internal server error' });

  // const conversationId = buildConversationId(undefined, isTestDomain);
  try {
    const token = (await getM2MToken('https://api.smyth.ai')) as string;
    const response = await mwSysAPI.post(
      '/chats',
      {
        conversation: {
          label: conversation.label || 'Untitled Chat',
          summary: conversation.summary || '',
          teamId: teamDetails.teamId,
          ownerId: conversation.ownerId || undefined,
          aiAgentId: agentId,
          chunkSize: conversation?.chunkSize || undefined,
          lastChunkID: conversation?.lastChunkID || undefined,
        },
      },
      includeAuth(token),
    );
    const conversationId = buildConversationId(response.data?.conversation?.id, isTestDomain);

    const finalResponse = {
      ...(response.data?.conversation || {}),
      id: conversationId,
    };

    return res.json(finalResponse);
  } catch (error: any) {
    console.error(error);
    return res.status(500).send({ error: error?.message || error.toString() });
  }
});

//* NOTE THAT THIS ROUTE IS PROTECTED BY UserAgentAccessCheck middleware AND IT SHOULD ALWAYS BE PROTECTED
router.post('/export-conversations', validate(validations.exportConversations), async (req, res) => {
  const agentId = req._agent?.id;
  if (!agentId) {
    return res.status(400).send({ error: 'agentId is required' });
  }
  const { dateRange, env } = req.body;
  const chatbot = req._chatbot;

  let responseStarted = false;

  try {
    // Set headers before starting the response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="chat-export.json"');

    res.write('[');
    responseStarted = true;

    let first = true;
    for await (const convJson of chatbot.exportAllConversations({ dateRange, env })) {
      if (!first) res.write(',');
      res.write(`{"convId": "${convJson.convId}", "history": `);
      await new Promise((resolve, reject) => {
        convJson.stream.pipe(res, { end: false });
        convJson.stream.on('end', resolve);
        convJson.stream.on('error', reject);
      });
      res.write('}');
      first = false;
    }

    res.write(']');
    res.end();
  } catch (err) {
    console.error('Export failed:', err);

    if (!responseStarted) {
      // If response hasn't started, we can send a proper error response
      return res.status(500).json({ error: 'Failed to export chat history' });
    } else {
      // If response has started, we need to end it gracefully
      try {
        if (!res.headersSent) {
          res.status(500);
        }
        res.write(']}'); // Close the JSON array properly
        res.end();
      } catch (endError) {
        console.error('Error ending response:', endError);
        // Force end the response if possible
        if (!res.destroyed) {
          res.destroy();
        }
      }
    }
  }
});

export { router as agentChatRouter };
