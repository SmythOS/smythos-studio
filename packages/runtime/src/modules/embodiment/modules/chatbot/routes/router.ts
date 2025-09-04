import axios from "axios";
import express from "express";

import { AccessCandidate, Agent, BinaryInput } from "@smythos/sre";

import config from "@core/config";
import { readAgentOAuthConfig } from "@core/helpers/agent.helper";
import { uploadHandler } from "@core/middlewares/uploadHandler.mw";

import { EMBODIMENT_TYPES } from "@embodiment/constants";
import { getChatGPTManifest } from "@embodiment/helpers/chatgpt.helper";
import agentLoader from "@embodiment/middlewares/agentLoader.mw";
import ChatbotLoader from "@embodiment/middlewares/ChatbotLoader.mw";
import { buildConversationId } from "@embodiment/utils/chat.utils";

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

const router = express.Router();

const MAX_TTL_CHATBOT_FILE_UPLOAD = 60 * 60 * 24 * 1; // 1 day

let localAgentAuthorizations = {};

const middleweares = [agentLoader, ChatbotLoader];
router.use(middleweares);

router.get("/", async (req, res) => {
  const agent: Agent = req._agent;
  //FIXME : using name as intro message his as a workaround
  const name = agent.name;
  const debugSessionEnabled = agent.debugSessionEnabled;
  const isTestDomain = agent.usingTestDomain;

  // wait for agent embodiments to be ready
  await agent.agentSettings?.embodiments?.ready();

  const chatbotName =
    agent.agentSettings?.embodiments?.get(EMBODIMENT_TYPES.ChatBot, "name") ||
    agent.name;
  let introMessage =
    agent.agentSettings?.embodiments?.get(
      EMBODIMENT_TYPES.ChatBot,
      "introMessage"
    ) || "";
  //escape string for javascript
  introMessage = introMessage.replace(/'/g, "\\'").replace(/"/g, '\\"');

  const logo =
    agent.agentSettings?.embodiments?.get(EMBODIMENT_TYPES.ChatBot, "icon") ||
    "https://proxy-02.api.smyth.ai/static/img/icon.svg";
  const colors = agent.agentSettings?.embodiments?.get(
    EMBODIMENT_TYPES.ChatBot,
    "colors"
  );

  const { allowAttachments = true } = req.query;

  let debugScript = "";
  if (isTestDomain || debugSessionEnabled) {
    debugScript = `
<script src="/static/embodiment/chatBot/chatbot-debug.js"></script>
<script>
initDebug('${config.env.UI_SERVER}', '${agent.id}');
</script>
`;
  }
  res.send(`
<!doctype html>
<html lang="en" style="height: 100%;margin: 0;padding: 0;">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
</head>
<body style="height: 100%;margin: 0;padding: 0;">
    <div id="smyth-chatbot-page" style="height: 100%;"></div>
    <script src="/static/embodiment/chatBot/chatbot-v2.js"></script>
    <script>
        ChatBot.init({
            logo: '${logo}',
            introMessage: '${introMessage}',
            allowAttachments: ${allowAttachments},
            //domain:'${agent.id}.${config.env.DEFAULT_AGENT_DOMAIN}',
            colors: ${JSON.stringify(colors, null, 2)},
            isChatOnly: true,
            containerId: 'smyth-chatbot-page',
        });
    </script>
    ${debugScript}
</body>
</html>`);
});

router.get("/chat-configs", async (req: any, res) => {
  if (!req._chatbot) {
    return res.status(404).send({ error: "Chatbot not found" });
  }
  const agent: Agent = req._agent;
  const pluginManifest = await getChatGPTManifest(
    agent.domain,
    agent.version
  ).catch((error) => {
    return null;
  });

  if (!pluginManifest) {
    return res.status(404).send({ error: "Chatbot Config not found" });
  }

  if (agent.usingTestDomain) {
    // req.session.destroy(); //reset session everytime the chatbot is refreshed on test domain
  }
  const chatbot = req._chatbot;
  res.send(chatbot.pluginManifest);
});

router.post("/chat-stream", async (req, res) => {
  let streamStarted = false;
  const isLocalAgent = req.hostname.includes("localagent");
  const agentId = req._agent?.id;
  const agentVersion = req._agent?.version;
  const isDebugSession = req._agent.debugSessionEnabled;

  let verifiedKey = null;

  if (isLocalAgent) {
    verifiedKey = localAgentAuthorizations?.[agentId]?.verifiedKey;
  } else {
    verifiedKey = req.session.agentAuthorizations?.[agentId]?.verifiedKey;
  }

  const abortController = new AbortController();

  try {
    let { message, attachments = [] } = req.body;
    if (attachments.length > 0) {
      message = [
        message,
        "###",
        "Attachments:",
        ...attachments.map((attachment) => `- ${attachment.url}`),
      ].join("\n");
    }

    if (!req._chatbot) {
      return res.status(404).send({ error: "Chatbot not found" });
    }
    const chatbot = req._chatbot;
    chatbot.conversationID = req.headers["x-conversation-id"] || req.sessionID;
    const monitorId = req.headers["x-monitor-id"];
    const hasAttachments = attachments?.length > 0;

    //TODO @AK : pass agent id and version in order to allow bypassing http call for agent invocation in conv manager
    //const headers = { 'X-AGENT-ID': agentId, 'X-AGENT-VERSION': req._agent?.version };
    const headers = isDebugSession
      ? {
          "X-DEBUG": true,
          "X-AGENT-ID": agentId,
          "X-MONITOR-ID": monitorId,
          "X-AGENT-REMOTE-CALL": hasAttachments, // for now, we're assuming that all attachments require injected agent which needs remote call
          "x-conversation-id": chatbot.conversationID,
        }
      : {
          "X-AGENT-ID": agentId,
          "X-MONITOR-ID": monitorId,
          "X-AGENT-VERSION": agentVersion,
          "X-AGENT-REMOTE-CALL": hasAttachments,
          "x-conversation-id": chatbot.conversationID,
        };
    if (verifiedKey) {
      headers["Authorization"] = `Bearer ${verifiedKey}`;
    }

    // Set up an event listener for client disconnection
    req.on("close", () => {
      abortController.abort();
    });

    //set response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

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
        content: error?.message || "An error occurred. Please try again later.",
        isError: true,
        errorType: "api_error",
      });
    } else {
      // Stream error message in the same format as normal responses
      res.write(
        JSON.stringify({
          content: "I'm not able to contact the server. Please try again.",
          isError: true,
          errorType: "connection_error",
        })
      );
      res.end();
    }
  }
});

router.get("/params", async (req, res) => {
  if (!req._chatbot) {
    return res.status(404).send({ error: "Chatbot not found" });
  }

  const agent: Agent = req._agent;

  let sessionData = req.session;

  // wait for agent settings and embodiments to be ready
  // await agent.agentSettings?.ready();
  // await agent.agentSettings?.embodiments?.ready();

  let promises = [
    agent.agentSettings?.ready(),
    agent.agentSettings?.embodiments?.ready(),
  ];

  let authInfo;

  if (!!agent?.data?.auth) {
    const oauthPromise = readAgentOAuthConfig(agent?.data).then((_auth) => {
      authInfo = _auth;
    });
    promises.push(oauthPromise);
  }

  await Promise.all(promises);

  // Determine if the chatbot is enabled
  let isChatbotEnabled =
    agent?.agentSettings?.get(EMBODIMENT_TYPES.ChatBot.toLowerCase()) ===
    "true";

  if (agent && agent.usingTestDomain) {
    isChatbotEnabled = true; // Chatbot is always enabled on test domain
  }

  // if authInfo?.method is undefined, we need to clear the localAgentAuthorizations and req.session.agentAuthorizations
  if (!authInfo?.method && agent?.id) {
    delete localAgentAuthorizations?.[agent.id];
    delete req.session?.agentAuthorizations?.[agent.id];
    req.session.save();
  }

  // Retrieve chatbot properties
  const chatbotProperties =
    agent.agentSettings?.embodiments?.get(EMBODIMENT_TYPES.ChatBot) || {};

  // If chatbot properties exist, append the 'chatbotEnabled' flag
  if (chatbotProperties) {
    const isLocalAgent = req.hostname.includes("localagent");
    const agentId = agent?.id;
    const chatbotName =
      agent.agentSettings?.embodiments.get(EMBODIMENT_TYPES.ChatBot, "name") ||
      agent.name;
    const sessionAuthorized = isLocalAgent
      ? !!localAgentAuthorizations?.[agentId]?.verifiedKey &&
        localAgentAuthorizations?.[agentId]?.authMethod === authInfo?.method
      : !!sessionData?.agentAuthorizations?.[agentId]?.verifiedKey &&
        sessionData?.agentAuthorizations?.[agentId]?.authMethod ===
          authInfo?.method;

    const agentUrl = isLocalAgent
      ? `http://${req.hostname}:${config.env.AGENT_DOMAIN_PORT}`
      : `https://${req.hostname}`;
    const redirectUri = `${agentUrl}/chatbot/callback`;

    const authorizationUrl = `${agentUrl}/oauth/authorize?response_type=code&client_id=${authInfo?.provider?.clientID}&redirect_uri=${redirectUri}`;

    const isAuthRequired = () => {
      const isAuthDisabled =
        agent?.debugSessionEnabled && agent.usingTestDomain;
      const hasAuthMethod = !!authInfo?.method;
      const isNotAuthorized = !sessionAuthorized;
      return !isAuthDisabled && hasAuthMethod && isNotAuthorized;
    };

    const port = isLocalAgent ? config.env.AGENT_DOMAIN_PORT : undefined;
    Object.assign(chatbotProperties, {
      name: chatbotName,
      domain: agent?.domain,
      port,
      chatbotEnabled: isChatbotEnabled,
      authRequired: isAuthRequired(),
      auth: {
        method: authInfo?.method,
        redirectUri: redirectUri,
        authorizationUrl: authorizationUrl,
        clientID: authInfo?.provider?.clientID,
        redirectInternalEndpoint: "/chatbot/callback",
      },
    });

    // const prefix = isTestDomain ? 'chat-test-' : 'chat-';
    // const conversationId = `${prefix}${getCurrentFormattedDate()}-${crypto.randomBytes(8).toString('hex')}`;

    //* Note: chatbot conversations are not created in db table, it is just a uid created on the fly
    //* On the other hand, Agent Chat conversations are created in db table and can be retrieved from db
    const isTestDomain = req.hostname.includes(
      `.${config.env.DEFAULT_AGENT_DOMAIN}`
    );
    const conversationId = buildConversationId(undefined, isTestDomain);

    chatbotProperties.headers = {
      "x-conversation-id": conversationId,
    };

    res.send(chatbotProperties);
  } else {
    // Send only the 'chatbotEnabled' flag if no properties are found
    res.send({ chatbotEnabled: isChatbotEnabled });
  }
});

function setSessionToken(
  req: any,
  res: any,
  token: string,
  authMethod: string
) {
  const agentId = req._agent?.id;
  if (!agentId) {
    console.error("Agent ID not found in request");
    return;
  }

  if (!req.session.agentAuthorizations) {
    req.session.agentAuthorizations = {};
  }
  req.session.agentAuthorizations[agentId] = {
    verifiedKey: token,
    authMethod: authMethod,
  };
  req.session.save((err) => {
    if (err) {
      console.error("Error saving session:", err);
    }
  });
}

function handleLocalAgent(req: any, token: string, authMethod: string) {
  const agentId = req._agent?.id;
  if (req._agent?.domain?.includes("localagent")) {
    if (!localAgentAuthorizations) {
      localAgentAuthorizations = {};
    }
    localAgentAuthorizations[agentId] = {
      verifiedKey: token,
      authMethod: authMethod,
    };
  }
}

async function handleOAuthCallback(req: any, res: any) {
  if (req.query.code) {
    const authInfo = await getAuthInfo(req);
    const accessToken = await exchangeCodeForToken(
      req.query.code,
      req._agent?.domain,
      authInfo
    );
    if (accessToken) {
      const token = accessToken.access_token;
      setSessionToken(req, res, token, authInfo?.method);
      handleLocalAgent(req, token, authInfo?.method);
    }
  }
}

async function getAuthInfo(req: any) {
  if (req._agent?.data?.auth) {
    return await readAgentOAuthConfig(req._agent.data);
  }
  return null;
}

function sendCloseTabResponse(res: any) {
  res.send(`
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Callback</title>
    </head>
    <body>
        <script>
            window.close();
        </script>
    </body>
</html>`);
}

async function exchangeCodeForToken(
  code: string,
  domain: string,
  authInfo: any
): Promise<any> {
  const isLocalAgent = domain.includes("localagent");
  const baseUrl = isLocalAgent
    ? `http://${domain}:${config.env.PORT}`
    : `https://${domain}`;
  const tokenEndpoint = `${baseUrl}/oauth/token`;
  const redirectUri = `${baseUrl}/chatbot/callback`;

  const clientId = authInfo?.provider?.clientID;
  const clientSecret = authInfo?.provider?.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error("Missing client ID or client secret");
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await axios.post(tokenEndpoint, params);
    return response.data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
}

router.post("/verify-chat-key", async (req: any, res) => {
  if (!req._chatbot) {
    return res.status(404).json({ error: "Chatbot not found" });
  }

  const { apiKey } = req.body;
  const agent: Agent = req._agent;

  try {
    const authInfo = agent?.data?.auth
      ? await readAgentOAuthConfig(agent.data)
      : null;

    if (apiKey !== authInfo?.provider?.token) {
      return res.status(401).json({ error: "Invalid API key", success: false });
    }

    setSessionToken(req, res, apiKey, authInfo?.method);
    handleLocalAgent(req, apiKey, authInfo?.method);

    return res.json({ message: "Access granted", success: true });
  } catch (error) {
    console.error("Error verifying chat key:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
});

router.get("/callback", async (req: any, res) => {
  await handleOAuthCallback(req, res);
  sendCloseTabResponse(res);
});

router.post("/upload", uploadHandler, async (req: any, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const agent = req._agent;
    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const candidate = AccessCandidate.agent(agent.id);
        const binaryInput = BinaryInput.from(
          file.buffer,
          null,
          file.mimetype,
          candidate
        );
        await binaryInput.ready();
        // getJsonData implicitly uploads the file to SmythFS
        const fileData = await binaryInput.getJsonData(
          candidate,
          MAX_TTL_CHATBOT_FILE_UPLOAD
        );

        uploadedFiles.push({
          size: file.size,
          url: fileData.url,
          mimetype: file.mimetype,
          originalName: file.originalname,
        });
      } catch (error) {
        console.error("Error uploading file:", file.originalname, error);
      }
    }

    res.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Error handling file upload:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process file upload",
    });
  }
});

export { router as chatBotRouter };
