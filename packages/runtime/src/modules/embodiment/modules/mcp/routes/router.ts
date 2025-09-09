import express from 'express';
import agentLoader from '@embodiment/middlewares/agentLoader.mw';
import { Agent, AgentProcess } from '@smythos/sre';
import { getOpenAPIJSON } from '@embodiment/helpers/openapi-adapter.helper';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { extractMCPToolSchema, formatMCPSchemaProperties, isMcpEnabled } from '../services/mcp.services';

const router = express.Router();
// let transport: SSEServerTransport;
const clientTransports = new Map<string, { transport: SSEServerTransport; server: Server }>();

router.get('/sse', agentLoader, async (req: any, res) => {
  try {
    const agent: Agent = req._agent;
    if (agent?.data?.auth?.method && agent?.data?.auth?.method !== 'none') {
      return res.status(400).send({
        error: 'Agents with authentication enabled are not supported for MCP',
      });
    }
    await agent.agentSettings?.ready();
    const isEnabled = isMcpEnabled(agent);
    if (!isEnabled) {
      return res.status(503).send({ error: 'MCP is not enabled for this agent' });
    }

    const openAPISpec = await getOpenAPIJSON(agent, 'localhost', 'latest', true);

    // Server implementation
    const server = new Server(
      {
        name: openAPISpec.info.title,
        version: openAPISpec.info.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    req.on('error', (error: any) => {
      console.error('Error:', error);
      // server.close();
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log('Client disconnected');
      clientTransports.delete(transport.sessionId);
      // server.close();
    });

    server.onerror = (error: any) => {
      console.error('Server error:', error);
      // server.close();
    };

    server.onclose = async () => {
      console.log('Server closing');
      // await server.close();
      // process.exit(0);
    };
    // Extract available endpoints and their methods
    const tools: Tool[] = Object.entries(openAPISpec.paths).map(([path, methods]) => {
      const method = Object.keys(methods)[0];
      const endpoint = path.split('/api/')[1];
      const operation = methods[method];
      const schema = extractMCPToolSchema(operation, method);
      const properties = formatMCPSchemaProperties(schema);

      return {
        name: endpoint,
        description: operation.summary || `Endpoint that handles ${method.toUpperCase()} requests to ${endpoint}. ` + `${schema?.description || ''}`,
        inputSchema: {
          type: 'object',
          properties,
          required: schema?.required || [],
        },
      };
    });

    // Tool handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));

    server.setRequestHandler(CallToolRequestSchema, async request => {
      try {
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new Error('No arguments provided');
        }

        // Find the matching tool from our tools array
        const tool = tools.find(t => t.name === name);
        if (!tool) {
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
        }

        try {
          // Extract method and path from OpenAPI spec
          const pathEntry = Object.entries(openAPISpec.paths).find(([path]) => path.split('/api/')[1] === name);
          if (!pathEntry) {
            throw new Error(`Could not find path for tool: ${name}`);
          }

          const [path, methods] = pathEntry;
          const method = Object.keys(methods)[0];

          // Process the request through the agent
          const result = await AgentProcess.load(agent.data).run({
            method,
            path,
            body: args,
          });

          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
            isError: false,
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error processing request: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    const transport = new SSEServerTransport('/emb/mcp/message', res);
    await server.connect(transport);

    clientTransports.set(transport.sessionId, { transport, server });
    console.log('Generated sessionId', transport.sessionId);
    console.log('MCP Server running on sse');
  } catch (error: any) {
    console.error(error);
    return res.status(500).send({ error: error.message });
  }
});

router.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log('Received sessionId', sessionId);
  const transport = clientTransports.get(sessionId as string)?.transport;
  if (!transport) {
    return res.status(404).send({ error: 'Transport not found' });
  }
  await transport.handlePostMessage(req, res, req.body);
});

export { router as mcpRouter };
