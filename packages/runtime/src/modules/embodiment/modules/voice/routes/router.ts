import { OpenAPISpec } from '@core/types/openapi.types';
import { EMBODIMENT_TYPES } from '@embodiment/constants';
import { getOpenAPIJSON } from '@embodiment/helpers/openapi-adapter.helper';
import { createSpecInfoFromOpenAPI, createToolsFromOpenAPI, getAPIKeyFromVault, getVoiceConfig } from '@embodiment/helpers/voice.helper';
import AgentLoader from '@embodiment/middlewares/agentLoader.mw';
import cors from '@embodiment/middlewares/cors.mw';
import VoiceWebsocketConnectionService from '@embodiment/modules/voice/services/websocket.service';
import { Agent, AgentProcess } from '@smythos/sre';
import express from 'express';
import { OPENAI_REALTIME_MODEL, VOICE } from '../utils/constants';

const router = express.Router();

const middlewares = [AgentLoader, cors];
router.use(middlewares);

router.get('/', async (req, res) => {
  const agent: Agent = req._agent;

  res.send(`
<!doctype html>
<html lang="en" style="height: 100%;margin: 0;padding: 0;">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link  rel="icon" type="image/png" href="/static/img/icon.svg" />
    <title>${agent.name}</title>
</head>
<body style="height: 100%;margin: 0;padding: 0;">
    <div id="voice-embodiment-container" style="height: 100%;"></div>
    <script src="/static/embodiment/voice/voice-embodiment-minified.js"></script>
    <script>
        VoiceEmbodiment.init({
            domain:'${req.hostname}',
            widget: false,
        });
    </script>
</body>
</html>`);
});

router.post('/ephemeral-key', async (req, res) => {
  try {
    const agent: Agent = req._agent;

    // Check if the agent has a custom auth method
    const authData = agent?.data?.auth;
    if (!!authData?.method && authData?.method !== 'none') {
      return res.status(401).json({ error: 'Voice embodiment is not available for agents with custom authentication.' });
    }

    await agent.agentSettings?.ready();

    // Determine if the voice embodiment is enabled
    const isVoiceEnabled = agent && agent.usingTestDomain ? true : agent?.agentSettings?.get(EMBODIMENT_TYPES.Alexa.toLowerCase()) === 'true';
    if (!isVoiceEnabled) {
      return res.status(401).json({ error: 'Voice embodiment is not enabled for this agent.' });
    }

    // Check if the user has a OpenAPI API key in the vault
    const userAPIKey = await getAPIKeyFromVault(agent.id, 'openai');

    if (!userAPIKey) {
      return res.status(404).json({
        error: 'OpenAI API key not found in your vault. Please add your OpenAI API key to enable voice embodiment.',
      });
    }

    const sessionConfig = JSON.stringify({
      session: {
        type: 'realtime',
        model: OPENAI_REALTIME_MODEL,
        audio: {
          output: {
            voice: VOICE,
          },
        },
      },
    });

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userAPIKey}`,
        'Content-Type': 'application/json',
      },
      body: sessionConfig,
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: `Failed to create ephemeral key: ${error}` });
    }

    const data = await response.json();

    res.json({
      ephemeralKey: data?.value,
      expiresAt: data?.expires_at,
      model: OPENAI_REALTIME_MODEL,
    });
  } catch (error) {
    console.error('Error creating ephemeral key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connection management endpoints
router.post('/ws-connect', async (req, res) => {
  try {
    const domain = req.hostname;
    const agent: Agent = req._agent;
    const host = req.get('Host');
    const { callId, ephemeralKey } = req.query;

    if (!callId) {
      return res.status(400).json({ error: 'callId query parameter is required' });
    }

    if (!ephemeralKey) {
      return res.status(400).json({ error: 'ephemeralKey query parameter is required' });
    }

    const connection = await VoiceWebsocketConnectionService.createConnection(callId as string, ephemeralKey as string);

    if (!connection) {
      return res.status(409).json({
        error: 'Connection already exists for this callId',
        callId,
      });
    }

    // Set up event handlers
    connection.on('open', async () => {
      const openAPISpec = await getOpenAPIJSON(agent, domain, agent.data.version, false).catch(error => {
        console.error(error);
      });

      if (openAPISpec) {
        const tools = createToolsFromOpenAPI(openAPISpec as OpenAPISpec, host);
        const specInfo = createSpecInfoFromOpenAPI(openAPISpec as OpenAPISpec);
        const voiceConfig = getVoiceConfig(specInfo, tools);

        // Send initial session configuration
        connection.send(JSON.stringify(voiceConfig));

        connection.send(
          JSON.stringify({
            type: 'response.create',
            response: {
              instructions: 'Please introduce yourself with your capabilities briefly. And Speak in English Language',
            },
          }),
        );
      }
    });

    connection.on('message', async message => {
      const parsedMessage = JSON.parse(message.toString());
      if (parsedMessage?.type === 'response.done') {
        // check output for function calls and other events
        if (Array.isArray(parsedMessage.response.output)) {
          parsedMessage?.response?.output?.forEach(async output => {
            const isToolCall = output?.type === 'function_call';

            // handle function calls
            if (isToolCall) {
              const { name, arguments: args, call_id: functionCallId } = output;

              const openAPISpec = await getOpenAPIJSON(agent, 'localhost', 'latest', true).catch(error => {
                console.error(error);
              });

              if (openAPISpec) {
                // Extract method and path from OpenAPI spec
                const pathEntry = Object.entries(openAPISpec.paths).find(([path]) => path.split('/api/')[1] === name);
                if (pathEntry) {
                  const [path, methods] = pathEntry;
                  const method = Object.keys(methods)[0];

                  const toolResponse = await AgentProcess.load(agent.data).run({
                    method,
                    path,
                    body: JSON.parse(args),
                  });

                  const result = toolResponse?.data;

                  const resultString = typeof result === 'string' ? result : JSON.stringify(result || null);

                  const finalOutput = {
                    dataPreview: resultString ? resultString.substring(0, 200) + (resultString.length > 200 ? '...' : '') : 'No data available',
                    fullData: result,
                  };

                  connection.send(
                    JSON.stringify({
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: functionCallId,
                        output: JSON.stringify(finalOutput),
                      },
                    }),
                  );

                  connection.send(
                    JSON.stringify({
                      type: 'response.create',
                    }),
                  );
                }
              }
            }
          });
        }
      }
    });

    res.json({
      success: true,
      message: 'WebSocket connection created successfully',
      callId,
    });
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    res.status(500).json({
      error: 'Failed to create WebSocket connection',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export { router as voiceRouter };
