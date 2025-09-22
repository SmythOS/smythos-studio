import express from 'express';

import { AccessCandidate, Agent, BinaryInput, Logger } from '@smythos/sre';

import Chatbot from '@embodiment/services/Chatbot.class';

import { uploadHandler } from '@core/middlewares/uploadHandler.mw';

import agentLoader from '@embodiment/middlewares/agentLoader.mw';
import ChatbotLoader from '@embodiment/middlewares/ChatbotLoader.mw';

const console = Logger('[Embodiment] Router: Chat (Unified Upload)');

const router = express.Router();

// Reuse the same TTL that was used in chatbot upload
const MAX_TTL_CHAT_FILE_UPLOAD = 60 * 60 * 24 * 1; // 1 day

// Middlewares: keep this accessible for both chatbot and agent chat
// Note: Intentionally excluding UserAgentAccessCheck to mirror /chatbot/upload accessibility
router.use([agentLoader, ChatbotLoader]);

// Exportable handler so other modules (e.g., chatbot) can reuse unified logic
export async function uploadFile(req: any, res: any) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const agent: Agent = req._agent;
    const uploadedFiles: any[] = [];

    for (const file of req.files) {
      try {
        const candidate = AccessCandidate.agent(agent.id);
        const binaryInput = BinaryInput.from(file.buffer, null, file.mimetype, candidate);
        await binaryInput.ready();
        // getJsonData implicitly uploads the file to SmythFS
        const fileData = await binaryInput.getJsonData(candidate, MAX_TTL_CHAT_FILE_UPLOAD);

        uploadedFiles.push({
          size: file.size,
          url: fileData.url,
          mimetype: file.mimetype,
          originalName: file.originalname,
        });
      } catch (error) {
        console.error('Error uploading file:', file.originalname, error);
      }
    }

    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ success: false, error: 'Failed to process file upload' });
  }
}

// Unified upload endpoint for both Chatbot and Agent Chat
router.post('/upload', uploadHandler, uploadFile);

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

// POST /v1/emb/chat/stream
router.post('/stream', async (req: any, res) => {
  let streamStarted = false;
  const agentId = req._agent?.id;
  const agentVersion = req._agent?.version;
  const isDebugSession = req._agent?.debugSessionEnabled;

  const verifiedKey = req.session.agentAuthorizations?.[agentId]?.verifiedKey || null;

  const abortController = new AbortController();

  try {
    let { message } = req.body;
    const { attachments = [] } = req.body;
    if (Array.isArray(attachments) && attachments.length > 0) {
      message = [message, '###', 'Attachments:', ...attachments.map((a: any) => `- ${a?.url}`)].join('\n');
    }

    if (!req._chatbot) {
      return res.status(404).send({ error: 'Chatbot not found' });
    }
    const chatbot: Chatbot = req._chatbot;
    chatbot.conversationID = (req.header('x-conversation-id') as string) || req.sessionID;
    const monitorId = req.header('x-monitor-id');
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    const headers: any = isDebugSession
      ? {
          'X-DEBUG': true,
          'X-AGENT-ID': agentId,
          'X-AGENT-VERSION': agentVersion,
          'X-AGENT-REMOTE-CALL': hasAttachments,
          'x-conversation-id': chatbot.conversationID,
        }
      : {
          'X-AGENT-ID': agentId,
          'X-AGENT-VERSION': agentVersion,
          'X-AGENT-REMOTE-CALL': hasAttachments,
          'x-conversation-id': chatbot.conversationID,
        };
    if (monitorId) headers['X-MONITOR-ID'] = monitorId;
    if (verifiedKey) headers.Authorization = `Bearer ${verifiedKey}`;

    req.on('close', () => abortController.abort());

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await chatbot.getChatStreaming({
      message,
      callback: (data: ChatbotResponse) => {
        res.write(JSON.stringify(data));
        streamStarted = true;
      },
      headers,
      abortSignal: abortController.signal,
      isAgentChatRequest: hasAttachments,
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

export { router as chatRouter };
