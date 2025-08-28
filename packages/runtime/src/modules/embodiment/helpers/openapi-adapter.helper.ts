import { AgentDataConnector } from "@smythos/sre";
import {
  getAgentIdByDomain,
  getAgentDataById,
} from "@embodiment/helpers/agent.helper";
import { addDefaultComponentsAndConnections } from "@core/services/agent-helper";
import config from "@embodiment/config";
import { Logger } from "@smythos/sre";
import type { AgentData, OpenAPISpec } from "@embodiment/types/openapi.types";

const console = Logger("[Embodiment] Helper: OpenAPI Adapter");

/**
 * AgentDataConnector implementation for sre-embodiment-server
 * This adapter integrates the SRE core AgentDataConnector with the embodiment server's
 * existing agent data retrieval mechanisms.
 */
class EmbodimentAgentDataConnector extends AgentDataConnector {
  async getAgentData(agentId: string, version?: string): Promise<AgentData> {
    return getAgentDataById(agentId, version) as Promise<AgentData>;
  }

  async getAgentIdByDomain(domain: string): Promise<string> {
    return getAgentIdByDomain(domain);
  }

  async getAgentSettings(
    agentId: string,
    version?: string
  ): Promise<{ [key: string]: any }> {
    const agentData = await this.getAgentData(agentId, version);
    return agentData?.settings || {};
  }

  async getAgentEmbodiments(agentId: string): Promise<any[]> {
    const agentData = await this.getAgentData(agentId);
    return agentData?.embodiments || [];
  }

  async isDeployed(agentId: string): Promise<boolean> {
    try {
      const agentData = await this.getAgentData(agentId);
      return agentData?.deployed || false;
    } catch (error) {
      console.warn(
        `Failed to check deployment status for agent ${agentId}:`,
        error
      );
      return false;
    }
  }

  async listTeamAgents(
    teamId: string,
    deployedOnly?: boolean,
    includeData?: boolean
  ): Promise<AgentData[]> {
    // This method would need to be implemented based on your team agent retrieval logic
    // For now, returning empty array as it's not used in the current OpenAPI generation
    console.warn(
      "listTeamAgents not fully implemented in EmbodimentAgentDataConnector"
    );
    return [];
  }

  getAgentConfig(agentId: string): { [key: string]: any } {
    // Return empty config for now, as this is not used in OpenAPI generation
    return {};
  }
}

// Create singleton instance
const agentDataConnector = new EmbodimentAgentDataConnector();

/**
 * Constructs the server URL from domain using environment configuration
 */
function constructServerUrl(domain: string): string {
  const server_url_scheme =
    config.env.NODE_ENV === "DEV" &&
    config.env.AGENT_DOMAIN_PORT &&
    domain.includes(config.env.AGENT_DOMAIN)
      ? "http"
      : "https";
  const server_url_port =
    config.env.NODE_ENV === "DEV" &&
    config.env.AGENT_DOMAIN_PORT &&
    domain.includes(config.env.AGENT_DOMAIN)
      ? `:${config.env.AGENT_DOMAIN_PORT}`
      : "";
  return `${server_url_scheme}://${domain}${server_url_port}`;
}

/**
 * Generates OpenAPI JSON specification for an agent
 *
 * @param agent - The agent data object
 * @param domain - The domain for the server URL
 * @param version - The API version
 * @param aiOnly - Whether to include only AI-exposed endpoints
 * @returns Promise<object> - The OpenAPI specification
 */
export async function getOpenAPIJSON(
  agent: any,
  domain: string,
  version: string,
  aiOnly: boolean = false
): Promise<OpenAPISpec> {
  const server_url = constructServerUrl(domain);
  const result = await agentDataConnector.getOpenAPIJSON(
    agent,
    server_url,
    version,
    aiOnly
  );
  return result;
}

/**
 * Generates OpenAPI JSON specification for an agent by ID
 *
 * @param agentId - The agent ID
 * @param domain - The domain for the server URL
 * @param version - The API version
 * @param aiOnly - Whether to include only AI-exposed endpoints
 * @param addDefaultFileParsingAgent - Whether to add default file parsing components
 * @returns Promise<any> - The OpenAPI specification or error
 */
export async function getOpenAPIJSONById(
  agentId: string,
  domain: string,
  version: string,
  aiOnly: boolean = false,
  addDefaultFileParsingAgent: boolean = false
): Promise<any> {
  try {
    if (!agentId) {
      return { error: "Agent not found" };
    }

    const agentData = await getAgentDataById(agentId, version).catch(
      (error) => {
        console.error("Failed to fetch agent data:", error);
        return {
          error: `Failed to fetch agent data: ${error.message || error}`,
        };
      }
    );

    if (agentData?.error) {
      return agentData;
    }

    if (addDefaultFileParsingAgent) {
      addDefaultComponentsAndConnections(agentData);
    }

    const server_url = constructServerUrl(domain);
    const result = await agentDataConnector.getOpenAPIJSON(
      agentData,
      server_url,
      version,
      aiOnly
    );
    return result;
  } catch (error) {
    return { error: error.message || "OpenAPI generation failed" };
  }
}

/**
 * Generates OpenAPI JSON specification for AI consumption
 *
 * @param domain - The domain to get the agent for
 * @param version - The API version
 * @param addDefaultFileParsingAgent - Whether to add default file parsing components
 * @returns Promise<any> - The OpenAPI specification or error
 */
export async function getOpenAPIJSONForAI(
  domain: string,
  version: string,
  addDefaultFileParsingAgent: boolean = false
): Promise<any> {
  try {
    const agentId = await getAgentIdByDomain(domain);
    if (!agentId) {
      return { error: "Agent not found" };
    }

    return getOpenAPIJSONById(
      agentId,
      domain,
      version,
      true,
      addDefaultFileParsingAgent
    );
  } catch (error) {
    return { error: error.message || "OpenAPI generation failed" };
  }
}

// Export utility functions for backward compatibility
export {
  getAgentIdByDomain,
  getAgentDataById,
} from "@embodiment/helpers/agent.helper";
