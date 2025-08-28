import { Agent } from 'smyth-runtime';
const MCP_SETTINGS_KEY = 'mcp';

export const isMcpEnabled = (agent: Agent) => {
    if (agent.usingTestDomain) {
        return true;
    }
    const mcpSettings = agent.agentSettings?.get(MCP_SETTINGS_KEY);
    let isEnabled = false;
    if (mcpSettings) {
        try {
            const parsedMcpSettings = JSON.parse(mcpSettings);
            if (parsedMcpSettings.isEnabled) {
                isEnabled = true;
            }
        } catch (error) {
            isEnabled = false;
        }
    }
    return isEnabled;
};

export function extractMCPToolSchema(jsonSpec: any, method: string) {
    if (method.toLowerCase() === 'get') {
        const schema = jsonSpec?.parameters;
        if (!schema) return {};

        const properties = {};
        const required = [];

        schema.forEach(param => {
            if (param.in === 'query') {
                properties[param.name] = param.schema;
                if (param.required) {
                    required.push(param.name);
                }
            }
        });

        return {
            type: 'object',
            properties,
            required
        };
    }
    const schema = jsonSpec?.requestBody?.content?.['application/json']?.schema;
    return schema;
}

export function formatMCPSchemaProperties(schema: any) {
    const properties = schema?.properties || {};
    for (const property in properties) {
        const propertySchema = properties[property];

        if (propertySchema.type === 'array') {
            properties[property] = {
                type: 'array',
                items: {
                    type: ['string', 'number', 'boolean', 'object', 'array'],
                },
            };
        }
    }
    return properties;
}