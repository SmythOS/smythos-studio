import { OpenAPISpec } from '@core/types/openapi.types';
import { Tool } from '@modelcontextprotocol/sdk/types';
import { AccessCandidate, ConnectorService } from '@smythos/sre';

export const createToolsFromOpenAPI = (openAPI: OpenAPISpec, baseUrl: string): Tool[] => {
  const tools: Tool[] = [];

  for (const [path, methods] of Object.entries(openAPI.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== 'object' || !operation) continue;

      const toolName = operation.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const description = operation.summary || operation.description || `${method.toUpperCase()} ${path}`;

      // Build parameters from path parameters, query parameters, and request body
      const parameters: any = {
        type: 'object',
        properties: {},
        required: [],
      };

      // Add path parameters
      if (operation.parameters) {
        for (const param of operation.parameters) {
          if (param.in === 'path' || param.in === 'query') {
            parameters.properties[param.name] = {
              type: param.schema?.type || 'string',
              description: param.description,
            };
            if (param.required) {
              parameters.required.push(param.name);
            }
          }
        }
      }

      // Add request body parameters (for POST, PUT, PATCH)
      if (operation.requestBody?.content?.['application/json']?.schema) {
        const schema = operation.requestBody.content['application/json'].schema;
        if (schema.properties) {
          Object.assign(parameters.properties, schema.properties);
          if (schema.required) {
            parameters.required.push(...schema.required);
          }
        }
      }

      tools.push({
        name: toolName,
        description,
        parameters,
        endpointInfo: {
          method: method.toUpperCase(),
          path,
          baseUrl,
        },
      });
    }
  }

  return tools;
};

export const createSpecInfoFromOpenAPI = (openAPI: OpenAPISpec) => {
  return {
    title: openAPI.info?.title || 'API Assistant',
    description: openAPI.info?.description || '',
  };
};

export const buildInstructions = (specInfo: { title: string; description: string }): string => {
  const baseInstructions = `Speak conversationally and naturally, as if talking to a friend. Use casual language, contractions, and natural speech patterns. Avoid overly formal or robotic language.

IMPORTANT: Before denying any user request, carefully examine all available tools and their capabilities. Many requests that might seem impossible can actually be accomplished using the available tools. Only deny requests if you're certain no available tool can help.

Use "I" and "me" when referring to yourself, and "we" when talking about the service's capabilities. Avoid technical terms like "API" or "service" - just speak naturally about what you can do.

IMPORTANT VOICE OPTIMIZATION: When speaking information, format it appropriately for voice:
- Phone numbers: Say each digit individually (e.g., "five-five-five, one-two-three, four-five-six-seven")
- Currency: Say the full amount naturally (e.g., "twenty-five dollars and fifty cents" not "25.50")
- Dates: Use natural format (e.g., "March fifteenth, twenty-twenty-four" not "03/15/2024")
- Times: Use conversational format (e.g., "quarter past three" or "three fifteen" not "15:15")
- Numbers: Use natural language for large numbers (e.g., "one thousand two hundred" not "1200")
- Email addresses: Spell out each character (e.g., "john dot smith at company dot com")
- URLs: Spell out each character or use "dot" and "slash" (e.g., "w w w dot example dot com slash page")
- Addresses: Use natural format with street names spelled out
- File sizes: Use conversational units (e.g., "two and a half megabytes" not "2.5MB")
- Percentages: Say naturally (e.g., "seventy-five percent" not "75%")
- Temperatures: Include units naturally (e.g., "seventy-two degrees Fahrenheit")
- Measurements: Use conversational units (e.g., "five feet ten inches" not "5'10"")

Your operating over an audio channel so following these instructions is critical:
Keep responses conversational and concise. Break down the information into digestible pieces.
When using tools, briefly acknowledge what you're doing: "Let me check that for you..." or "I'll look that up..." Then, when you get the results, summarize the key information in a conversational way rather than reading data verbatim. Focus on what's most relevant to the user's question.
`;
  if (specInfo) {
    return `IMPORTANT: When you first connect, introduce yourself naturally. Use the following information (not verbatim) for your identity and introduction: ${specInfo.title}
optional information about the service: "${specInfo.description}"

${baseInstructions}`;
  } else {
    return `You are a friendly and knowledgeable voice assistant. Speak naturally and conversationally, as if talking to a friend.

${baseInstructions} Start by briefly introducing yourself.`;
  }
};

export const getVoiceConfig = (specInfo: { title: string; description: string }, tools: Tool[]) => {
  const instructions = buildInstructions(specInfo);

  return {
    type: 'session.update',
    session: {
      type: 'realtime',
      instructions,
      audio: {
        input: {
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
        output: {
          voice: 'alloy',
        },
      },
      tools: tools.map(tool => ({
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    },
  };
};

export const getAPIKeyFromVault = async (agentId: string, keyName: string): Promise<string | null> => {
  try {
    const accessCandidate = AccessCandidate.agent(agentId);
    const vaultConnector = ConnectorService.getVaultConnector();

    const apiKey = await vaultConnector
      .user(accessCandidate)
      .get(keyName)
      .catch(error => {
        console.error('Error retrieving API key from vault:', error);
        return null;
      });

    return apiKey;
  } catch (error) {
    console.error('Failed to get API key:', error);
    return null;
  }
};
