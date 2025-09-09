import express from 'express';
import Joi from 'joi';

import { Logger } from '@smythos/sre';

import config from '@core/config';
import { getM2MToken } from '@core/helpers/logto.helper';
import { uploadHandler } from '@core/middlewares/uploadHandler.mw';
import UserAgentAccessCheck from '@core/middlewares/userAgentAccessCheck.mw';
import { validate } from '@core/middlewares/validate.mw';
import { requestContext } from '@core/services/request-context';
import { includeAuth, mwSysAPI } from '@core/services/smythAPIReq';

import agentLoader from '@embodiment/middlewares/agentLoader.mw';
import ChatbotLoader from '@embodiment/middlewares/ChatbotLoader.mw';
import { buildConversationId } from '@embodiment/utils/chat.utils';

const console = Logger('[Embodiment] Router: Agent Chat');

const router = express.Router();

// Note: Intentionally excluding UserAgentAccessCheck to mirror working chatbot routes and avoid SSL certificate issues
const middlewares = [uploadHandler, agentLoader, ChatbotLoader];
router.use(middlewares);

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

// Removed legacy /aichat/stream in favor of /v1/emb/chat/stream

// New v1 endpoint mirroring chatbot /chat-stream behavior but for Agent Chat

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

// Removed legacy /aichat/upload in favor of unified /v1/emb/chat/upload

//* NOTE THAT THIS ROUTE IS PROTECTED BY UserAgentAccessCheck middleware AND IT SHOULD ALWAYS BE PROTECTED
router.post('/export-conversations', UserAgentAccessCheck, validate(validations.exportConversations), async (req, res) => {
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
    for await (const convJson of chatbot.exportAllConversations({
      dateRange,
      env,
    })) {
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
