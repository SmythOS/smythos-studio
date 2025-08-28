import config from "../config";
import axios from "axios";

import { Logger } from "@smythos/sre";

import { getM2MToken } from "./logto-helper";
import { mwSysAPI } from "./smythAPIReq";

import { AccessCandidate, ConnectorService } from "@smythos/sre";
import { defaultFileParsingAgent } from "../default-file-parsing-agent";
import { AGENT_AUTH_SETTINGS_KEY } from "@core/constants";

const console = Logger("(Core) Service: Agent Helper");

export function extractAgentVerionsAndPath(url) {
  const regex = /^\/v(\d+(\.\d+)?)?(\/api\/.+)/;
  const match = url.match(regex);

  if (match) {
    return {
      path: match[3],
      version: match[1] || "",
    };
  } else {
    return {
      path: url,
      version: "",
    };
  }
}

export async function getAgentDomainById(agentId: string) {
  const token = (await getM2MToken("https://api.smyth.ai")) as string;
  const agentDataConnector = ConnectorService.getAgentDataConnector();

  const Authorization = `Bearer ${token}`;

  //TODO : OPTIMIZE THIS : use aiAgentId param instead of getting all domains then filtering
  const result: any = await mwSysAPI
    .get("/domains?verified=true", { headers: { Authorization } })
    .catch((error) => ({ error }));

  if (result.error) {
    throw new Error("Error getting domain info");
  }

  const domain = result.data.domains.find(
    (domainEntry: any) => domainEntry?.aiAgent?.id === agentId
  )?.name;

  if (!domain) {
    const deployed = await agentDataConnector.isDeployed(agentId);
    if (deployed) {
      return `${agentId}.${config.env.PROD_AGENT_DOMAIN}`;
    }
  }
  return domain;
}

export async function readAgentOAuthConfig(agentData) {
  //const authInfo = agentData?.auth;
  const authInfo = await getAgentAuthData(agentData.id);
  const method = authInfo?.method;
  const provider = authInfo?.provider[authInfo?.method];
  if (!provider) {
    return {};
  }
  const authOIDCConfigURL = provider.OIDCConfigURL;
  const clientID = provider.clientID;
  const clientSecret = provider.clientSecret;
  const openid: any = await axios
    .get(authOIDCConfigURL)
    .catch((error) => ({ error }));

  const tokenURL = openid?.data?.token_endpoint;
  const authorizationURL = openid?.data?.authorization_endpoint;

  return {
    authorizationURL,
    tokenURL,
    clientID,
    clientSecret,
    method,
    provider,
  };
}

export function addDefaultComponentsAndConnections(agentData) {
  console.log(
    `Adding default components and connections for file parsing agent`
  );
  agentData.data.components?.unshift(...defaultFileParsingAgent.components);
  agentData.data.connections?.unshift(...defaultFileParsingAgent.connections);
}

// #region Agent Auth Data

/**
 * Fetches agent authentication data from the account connector
 * @param agentId - The ID of the agent
 * @returns Promise containing the agent settings
 */
async function fetchAgentAuthData(agentId: string) {
  const accountConnector = ConnectorService.getAccountConnector();
  return await accountConnector
    .user(AccessCandidate.agent(agentId))
    .getAgentSetting(AGENT_AUTH_SETTINGS_KEY);
}

/**
 * Gets agent authentication data
 * @param agentId - The ID of the agent
 * @returns Promise containing the agent auth settings
 */
export async function getAgentAuthData(agentId: string) {
  const freshSettings = await fetchAgentAuthData(agentId);

  return JSON.parse(freshSettings || "{}");
}
// #endregion Agent Auth Data

const MOCK_DATA = {
  SETTINGS_KEY: "agent-mock-data",
} as const;

export async function getMockData(agentId: string) {
  const accountConnector = ConnectorService.getAccountConnector();
  const mockData = await accountConnector
    .user(AccessCandidate.agent(agentId))
    .getAgentSetting(MOCK_DATA.SETTINGS_KEY);
  return JSON.parse(mockData || "{}");
}
