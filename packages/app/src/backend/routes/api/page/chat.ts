import axios from 'axios';
import { randomUUID } from 'crypto';
import express from 'express';
import config from '../../../config';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import SmythPubStaticStorage from '../../../services/storage/SmythStaticStorage.class';
import { authHeaders, includeAxiosAuth, smythAPIReq } from '../../../utils';

const router = express.Router();
const staticStorage = new SmythPubStaticStorage();

const isUsingLocalServer = false;

function getAgentServerURL(agentId: string, isLocal = false) {
  return config.env.API_SERVER;

  // const remoteDomain = isProdEnv() ? 'agent.a.smyth.ai' : 'agent.stage.smyth.ai';
  // return isLocal
  //   ? `http://${agentId}.localagent.stage.smyth.ai:3000`
  //   : `https://${agentId}.${remoteDomain}`;
}

router.use([includeTeamDetails]); // is it ok?

// Configure multer middleware for file uploads
const uploadFileMw = staticStorage.getMulter({
  purge: 'DAILY',
  key: (req, file) =>
    SmythPubStaticStorage.path(
      'teams',
      SmythPubStaticStorage.hash(req._team.id),
      `file-${randomUUID()}`,
    ),
  limits: {
    fileSize: 1024 * 1024 * 20, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'text/csv',
      'text/xml',
      'image/gif',
      'text/plain',
      'text/html',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/csv',
      'application/msword',
      'application/vnd.ms-excel', // For CSV files opened in Excel
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // For Excel files
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(
      new Error(
        'Invalid file type. Only Image, PDF, CSV, Excel, DOC, DOCX, TXT, XML, and HTML files are allowed',
      ),
    );
  },
});

router.post('/stream', async (req, res) => {
  let { message, fileKeys = [] } = req.body;
  const userId = req._user?.id;
  const teamId = req._team?.id;
  const token = req.user.accessToken;
  const agentId = req.headers['x-agent-id'];
  const conversationId = req.headers['x-conversation-id'];
  const isAgentChat = req.headers['x-ai-agent'] === 'true';
  const filePublicUrls = fileKeys.map((key) => staticStorage.getPublicUrl(key));

  if (filePublicUrls.length > 0) {
    message = [message, '###', 'Attachments:', ...filePublicUrls.map((url) => `- ${url}`)].join(
      '\n',
    );
  }

  try {
    const result = await axios.post(
      getAgentServerURL(agentId as string, isUsingLocalServer) + '/aichat/stream',
      { message },
      {
        headers: {
          ...includeAxiosAuth(token).headers,
          'x-user-id': userId,
          'x-team-id': teamId,
          'x-agent-id': agentId,
          'x-conversation-id': conversationId,
          'x-smyth-team-id': teamId,
          'x-ai-agent': isAgentChat,
        },
        responseType: 'stream',
      },
    );

    result.data.on('data', (chunk) => {
      res.write(chunk); // Stream the chunks to the client
    });

    result.data.on('end', () => {
      res.end(); // Close the stream once upstream is done
    });

    result.data.on('error', (err) => {
      console.error('Error in streaming data:', err);
      res.status(400).json({ error: 'Error in streaming response' });
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || 'Something went wrong while fetching chatbot stream' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { isOwner, page, limit } = req.query;
    const response = await smythAPIReq.get(
      `/chats?isOwner=${isOwner}&page=${page.toString()}&limit=${limit.toString()}`,
      await authHeaders(req),
    );

    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while fetching the chat list' });
  }
});

router.post('/new', async (req, res) => {
  try {
    const agentId = req.body.conversation?.aiAgentId;
    if (!agentId) return res.status(400).json({ error: 'conversation.aiAgentId is required' });

    const userId = req._user?.id;
    const teamId = req._team?.id;
    const token = req.user.accessToken;

    const response = await axios.post(
      getAgentServerURL(agentId as string, isUsingLocalServer) + '/aichat/new',
      req.body,
      {
        headers: {
          ...includeAxiosAuth(token).headers,
          'x-user-id': userId,
          'x-team-id': teamId,
          'x-agent-id': agentId,
          'x-smyth-team-id': teamId,
          'X-AGENT-ID': agentId,
        },
      },
    );

    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong while creating a new chat' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const response = await smythAPIReq.put(
      `/chats/${req.params.id}`,
      req.body,
      await authHeaders(req),
    );

    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while creating a new chat' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await smythAPIReq.delete(`/chats/${id}`, await authHeaders(req));

    return res.json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'Something went wrong while deleting the chat' });
  }
});

router.get('/messages', async (req, res) => {
  const userId = req._user?.id;
  const teamId = req._team?.id;
  const token = req.user.accessToken;
  const agentId = req.headers['x-agent-id'];
  const conversationId = req.headers['x-conversation-id'];
  const page = req.query.page;
  const limit = req.query.limit;

  try {
    const result = await axios.get(
      getAgentServerURL(agentId as string, isUsingLocalServer) +
        `/aichat/messages?page=${page}&limit=${limit}`,
      {
        headers: {
          ...includeAxiosAuth(token).headers,
          'x-user-id': userId,
          'x-team-id': teamId,
          'x-agent-id': agentId,
          'x-conversation-id': conversationId,
        },
      },
    );

    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || 'Something went wrong while fetching chatbot stream' });
  }
});

router.post('/upload', [includeTeamDetails, uploadFileMw.single('file')], async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // @ts-ignore
    const key = req.file.key;
    const publicUrl = staticStorage.getPublicUrl(key);

    return res.json({
      success: true,
      file: {
        key: key,
        url: publicUrl,
        name: req.file.originalname,
        type: req.file.mimetype,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload file' });
  }
});

router.delete('/deleteFile', [includeTeamDetails], async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ error: 'File key is required' });
  }

  try {
    await staticStorage.deleteObject(key as string);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});

export const chatRouter = router;
