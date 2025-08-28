import config from '@embodiment/config';
import { AccessCandidate, ConnectorService } from 'smyth-runtime';
import { getM2MToken } from '@embodiment/helpers/logto.helper';
import { mwSysAPI } from '@core/services/smythAPIReq';
import { PROD_VERSION_VALUES, TEST_VERSION_VALUES } from '@embodiment/constants';
import axios from 'axios';
import { includeAuth } from '@core/services/smythAPIReq';

export function extractAgentVerionsAndPath(url) {
    const regex = /^\/v(\d+(\.\d+)?)?(\/api\/.+)/;
    const match = url.match(regex);

    if (match) {
        return {
            path: match[3],
            version: match[1] || '',
        };
    } else {
        return {
            path: url,
            version: '',
        };
    }
}

export function getAgentIdAndVersion(model: string) {
    const [agentId, version] = model.split('@');
    let agentVersion = version?.trim() || undefined;
    if (TEST_VERSION_VALUES.includes(agentVersion)) {
        agentVersion = '';
    }
    if (PROD_VERSION_VALUES.includes(agentVersion)) {
        agentVersion = 'latest';
    }

    return { agentId, agentVersion };
}

export async function getAgentEmbodiments(agentID) {
    try {
        const token = (await getM2MToken('https://api.smyth.ai')) as string;
        const url = `${config.env.SMYTH_API_BASE_URL}/_sysapi/v1/embodiments?aiAgentId=${agentID}`;
        console.log('calling URL', url);

        const response = await axios.get(`${config.env.SMYTH_API_BASE_URL}/_sysapi/v1/embodiments?aiAgentId=${agentID}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        // }
        // const response = await smythAPIReq.get(`/embodiments?aiAgentId=${agentID}`, includeAuth(token));

        return response.data.embodiments;
    } catch (error: any) {
        console.error(error.response?.data, error.message);
        console.log(`Error getting embodiments for agentId=${agentID}: ${error?.message}`);
        throw new Error(`Error getting embodiments for agentId=${agentID}: ${error?.message}`);

        ///throw error;
    }
}

export async function getAgentDomainById(agentId: string) {
    const token = (await getM2MToken('https://api.smyth.ai')) as string;
    const agentDataConnector = ConnectorService.getAgentDataConnector();

    const Authorization = `Bearer ${token}`;

    //TODO : OPTIMIZE THIS : use aiAgentId param instead of getting all domains then filtering
    const result: any = await mwSysAPI.get('/domains?verified=true', { headers: { Authorization } }).catch((error) => ({ error }));

    if (result.error) {
        throw new Error('Error getting domain info');
    }

    const domain = result.data.domains.find((domainEntry: any) => domainEntry?.aiAgent?.id === agentId)?.name;

    if (!domain) {
        const deployed = await agentDataConnector.isDeployed(agentId);
        if (deployed) {
            return `${agentId}.${config.env.PROD_AGENT_DOMAIN}`;
        } else {
            return `${agentId}.${config.env.AGENT_DOMAIN}`;
        }
    }
    return domain;
}

export async function readAgentOAuthConfig(agentData) {
    console.log('readAgentOAuthConfig', agentData?.id);
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
    const openid: any = await axios.get(authOIDCConfigURL).catch((error) => ({ error }));

    const tokenURL = openid?.data?.token_endpoint;
    const authorizationURL = openid?.data?.authorization_endpoint;

    return { authorizationURL, tokenURL, clientID, clientSecret, method, provider };
}

export async function getAgentIdByDomain(domain = '') {
    let agentId;
    //first check if this is the internal wildcard agents domain
    const isStageWildcardDomain = domain.includes(config.env.AGENT_DOMAIN);
    const isProdWildcardDomain = domain.includes(config.env.PROD_AGENT_DOMAIN);
    if (isStageWildcardDomain || isProdWildcardDomain) {
        //console.log('Internal agent domain detected', domain);
        agentId = domain.split('.')[0];
        //sanity check
        if (`${agentId}.${config.env.AGENT_DOMAIN}` !== domain && `${agentId}.${config.env.PROD_AGENT_DOMAIN}` !== domain) {
            throw new Error(`Invalid agent domain: ${domain}`);
        }

        //if this is a stage domain, no more check, return the agentId
        if (isStageWildcardDomain) return agentId;
    }

    const token = (await getM2MToken('https://api.smyth.ai')) as string;
    const Authorization = `Bearer ${token}`;
    //FIXME : filter domains by agentId and by domain Id once it's supported in the middleware
    const result: any = await mwSysAPI.get('/domains?verified=true', { headers: { Authorization } }).catch((error) => ({ error }));

    if (result.error) {
        throw new Error('Error getting domain info');
    }

    //we have an agentId from the wildcard domain, if this domain is already associated with
    if (agentId) {
        const hasDomain = result.data.domains.find((domainEntry: any) => domainEntry?.aiAgent?.id === agentId);
        if (hasDomain) {
            throw new Error('Wrong domain');
        }
    } else {
        agentId = result.data.domains.find((domainEntry: any) => domainEntry.name === domain)?.aiAgent?.id;
    }

    //if a custom domain is found, use it, otherwise use the agentId from the wildcard domain

    return agentId;
}

function migrateAgentData(data) {
    if (!data.version) {
        console.log(`Agent [${data.name}] has an old schema. Migrating to latest version...`);
        // version 0  ===> migrate from receptors/connectors to inputs/outputs
        const newData = JSON.parse(JSON.stringify(data));
        for (let component of newData.components) {
            component.outputs = component.connectors;
            component.inputs = component.receptors;
            component.outputProps = component.connectorProps;
            component.inputProps = component.receptorProps;
            delete component.connectors;
            delete component.receptors;
            delete component.connectorProps;
            delete component.receptorProps;
        }
        return newData;
    }

    if (data.version === '1.0.0') {
        //migrate .description to .behavior
        if (data.description && !data.behavior) {
            data.behavior = data.description;
            //delete newConfig.description;
        }
    }

    return data;
}

//TODO : cache versioned agent data. when an agent has a version, the data does not change, we can keep it in cache to avoid calling the api every time
export async function getAgentDataById(agentID, version) {
    console.log('getAgentDataById', agentID, version);
    try {
        const token = (await getM2MToken('https://api.smyth.ai')) as string;

        let agentObj;

        //FIXME : once we have the agent name in deployment api response, we can skip this call
        const response = await mwSysAPI.get(`/ai-agent/${agentID}?include=team.subscription`, includeAuth(token));
        agentObj = response.data.agent;
        const authData = agentObj.data.auth; //use most up to date auth data

        const tasksResponse = await mwSysAPI.get(`/quota/team/${agentObj.teamId}/tasks/subscription`, includeAuth(token));
        agentObj.taskData = tasksResponse.data;

        agentObj.data.debugSessionEnabled = agentObj?.data?.debugSessionEnabled && agentObj?.isLocked; //disable debug session if agent is not locked (locked agent means that it's open in the Agent builder)

        if (version) {
            const deploymentsList = await mwSysAPI.get(`/ai-agent/${agentID}/deployments`, includeAuth(token));
            const deployment =
                version == 'latest'
                    ? deploymentsList?.data?.deployments[0]
                    : deploymentsList?.data?.deployments?.find((deployment) => deployment.version === version);
            if (deployment) {
                const deployResponse = await mwSysAPI.get(`/ai-agent/deployments/${deployment.id}`, includeAuth(token));
                agentObj.data = deployResponse?.data?.deployment?.aiAgentData;
                agentObj.data.debugSessionEnabled = false; //never enable debug session when using a deployed version
                agentObj.data.agentVersion = deployment.version;
            } else {
                //if (version !== 'latest') {
                throw new Error(`Requested Deploy Version not found: ${version}`);
                //} // if version == 'latest' but no deployment is found we just fallback to the agent live data
            }
        }

        //TODO: Also include team and subscription info

        //agentObj.data.auth = authData;
        if (!agentObj?.data?.auth?.method || agentObj?.data?.auth?.method == 'none') agentObj.data.auth = authData;

        agentObj.data = migrateAgentData(agentObj.data);

        return agentObj;
    } catch (error: any) {
        console.error(error.response?.data, error.message);
        console.log(`Error getting agent data for agentId=${agentID}: ${error?.message}`);
        throw new Error(`Error getting agent data for agentId=${agentID}: ${error?.message}`);
    }
}

// #region Agent Auth Data
// Constants for agent auth data
const AGENT_AUTH = {
    SETTINGS_KEY: 'agent-auth-data',
    CACHE: {
        KEY_PREFIX: 'agent:auth_data',
        TTL: 60 * 60 * 24 * 7, // 7 days in seconds
    },
} as const;

/**
 * Fetches agent authentication data from the account connector
 * @param agentId - The ID of the agent
 * @returns Promise containing the agent settings
 */
async function fetchAgentAuthData(agentId: string) {
    const accountConnector = ConnectorService.getAccountConnector();
    return await accountConnector.user(AccessCandidate.agent(agentId)).getAgentSetting(AGENT_AUTH.SETTINGS_KEY);
}

/**
 * Gets agent authentication data with caching support
 * @param agentId - The ID of the agent
 * @returns Promise containing the agent auth settings
 */
// TODO: To get data from cache, we need to reset the cache from UI backend when auth data is updated
export async function getAgentAuthData(agentId: string) {
    // const cacheConnector = ConnectorService.getCacheConnector();
    // const cacheKey = `${AGENT_AUTH.CACHE.KEY_PREFIX}:${agentId}`;

    // const cachedSettings = await cacheConnector.user(AccessCandidate.agent(agentId))?.get(cacheKey);
    // if (cachedSettings) {
    //     return JSON.parse(cachedSettings);
    // }

    const freshSettings = await fetchAgentAuthData(agentId);

    // void cacheConnector
    //     .user(AccessCandidate.agent(agentId))
    //     .set(cacheKey, JSON.stringify(freshSettings), AGENT_AUTH.CACHE.TTL)
    //     .catch((error) => {
    //         console.warn('Error setting agent auth data in cache', error?.message || error);
    //     });

    return JSON.parse(freshSettings || '{}');
}
// #endregion Agent Auth Data
