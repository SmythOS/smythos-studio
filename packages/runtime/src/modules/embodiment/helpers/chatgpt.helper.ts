import fs from 'fs';
import path from 'path';

import { JSONContentHelper, TemplateStringHelper } from '@smythos/sre';

import { getAgentDataById, getAgentEmbodiments, getAgentIdByDomain } from '@core/helpers/agent.helper';

import { EMBODIMENT_TYPES } from '@embodiment/constants';
import { ChatGPTManifest } from '@embodiment/types/chatgpt.types';

let chatGPTDataPath = './data/chatGPT';

// Path to data files differs between server ('./data/chatGPT') and tests ('../data/chatGPT').
if (process.env.TEST_ENV) {
  chatGPTDataPath = '../data/chatGPT';
}

// a function that splits a string on a word boundary not exceeding a max characters length
function splitOnSeparator(str = '', maxLen, separator = ' .') {
  if (str.length <= maxLen) {
    return str;
  }

  // Find the last occurrence of the separator before maxLen
  let idx = str.lastIndexOf(separator, maxLen);

  // If the separator is not found, return the substring up to maxLen
  if (idx === -1) {
    return str.substring(0, maxLen);
  }

  // Return the substring from the start of the string to the last occurrence of the separator
  return str.substring(0, idx);
}

//FIXME load version from prod domain
export async function getChatGPTManifestById(agentId: string, domain: string, version: string): Promise<ChatGPTManifest> {
  console.log('getChatGPTManifestById', agentId, domain, version);
  if (!agentId) {
    throw new Error('Agent not found');
  }
  const agentData = await getAgentDataById(agentId, version).catch(error => {
    console.error(error);
    return { error };
  });
  if (agentData?.error) {
    throw new Error(agentData.error);
  }

  const embodiments = await getAgentEmbodiments(agentId);

  // find chatgpt embodiment as we have multiple embodiments per agent
  const chatgptEmbodiment = embodiments.find((embodiment: any) => embodiment.type?.toLowerCase() === EMBODIMENT_TYPES.ChatGPT.toLowerCase());

  // Extract properties from the ChatGPT embodiment
  const _chatgptDesctiption = chatgptEmbodiment?.properties?.modelDescription;
  const _chatgptHumanName = chatgptEmbodiment?.properties?.humanName;
  const _chatgptModelName = chatgptEmbodiment?.properties?.modelName;
  const _chatgptHumanDescription = chatgptEmbodiment?.properties?.humanDescription;
  const _contactEmail = chatgptEmbodiment?.properties?.contactEmail;
  const _legalInfoUrl = chatgptEmbodiment?.properties?.legalInfoUrl;

  const name = _chatgptHumanName || agentData.name || 'Smyth Agent';
  const modelName = _chatgptModelName || name.replace(/ /g, '_') || 'Smyth Agent';

  //data.description is deprecated, use data.shortDescription for human description and data.behavior for model description
  const humanDescription = splitOnSeparator(
    _chatgptHumanDescription || agentData.data.shortDescription || agentData.data.description || '',
    120,
    '.',
  );
  const description = splitOnSeparator(_chatgptDesctiption || agentData.data.behavior || agentData.data.description || '', 8000, '.');

  const icon_url = chatgptEmbodiment?.properties?.logoUrl || 'https://proxy-02.api.smyth.ai/static/img/icon.svg';
  const contact_email = _contactEmail || '';
  const legal_info_url = _legalInfoUrl || '';

  const aiPluginTemplate = fs.readFileSync(path.resolve(__dirname, `${chatGPTDataPath}/ai-plugin.tpl.json`), 'utf8');

  let manifest = TemplateStringHelper.create(aiPluginTemplate).parse({
    human_name: name,
    model_name: modelName,
    human_description: humanDescription,
    model_description: description,
    icon_url,
    contact_email,
    legal_info_url,
    domain,
  }).result;
  const parsedManifest = JSONContentHelper.create(manifest).tryParse();
  manifest = typeof parsedManifest === 'string' ? JSON.parse(parsedManifest) : parsedManifest;

  const auth = (manifest as any).auth;
  const authMethod = agentData.data?.auth?.method;
  const authProvider = agentData.data?.auth?.provider[authMethod];
  if (authProvider) {
    if (authMethod === 'oauth-oidc') {
      auth.type = 'oauth';
      auth.client_url = `https://${domain}/oauth/authorize`;
      auth.scope = 'offline_access openid profile email';
      auth.authorization_url = `https://${domain}/oauth/token`;
      auth.authorization_content_type = 'application/json';
      auth.verification_tokens = {
        openai: authProvider?.OIDCOpenAIVerificationToken,
      };
    }

    if (authMethod === 'api-key-bearer') {
      auth.type = 'service_http';
      auth.authorization_type = 'bearer';
      auth.verification_tokens = {
        openai: authProvider?.BearerOpenAIVerificationToken,
      };
    }
  }

  return manifest as unknown as ChatGPTManifest;
}

export async function getChatGPTManifest(domain: string, version: string): Promise<ChatGPTManifest> {
  const agentId = await getAgentIdByDomain(domain);
  if (!agentId) {
    throw new Error('Agent not found');
  }

  return getChatGPTManifestById(agentId, domain, version);
}
