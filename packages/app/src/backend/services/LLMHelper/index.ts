import { Request } from 'express';
import {
  DEFAULT_SMYTH_LLM_PROVIDERS_SETTINGS,
  SMYTH_LLM_PROVIDERS_SETTINGS_KEY,
} from '../../constants';
import { getTeamSettingsObj } from '../../services/team-data.service';
import { vault } from '../SmythVault.class';
import { LLMService } from './LLMService.class';

async function getUserLLMModels(req: Request) {
  const models = {};
  try {
    const team = req._team?.id;

    const llmProvider = new LLMService();
    const LLMModels = await llmProvider.getModels(req);

    const keys: any = await vault.get({ team, scope: ['global'] }, req);
    const enabledSmythOSProviders = await _getEnabledSmythOSProviders(req);

    for (let modelId in LLMModels) {
      let modelTpl = JSON.parse(JSON.stringify(LLMModels[modelId]));

      if (modelTpl.alias) {
        const aliasOptions = JSON.parse(JSON.stringify(LLMModels[modelTpl.alias] || {}));
        delete aliasOptions.hidden; //do not override hide option because we may want to hide the original model but keep the alias
        modelTpl = { ...modelTpl, ...aliasOptions }; //override the model config with the alias config
      }

      // get the key options
      const modelKeyOptions = modelTpl.keyOptions || {};
      delete modelTpl.keyOptions;

      const provider = modelTpl?.provider?.toLowerCase();
      const hasAPIKey = !!keys[provider?.toLowerCase()];

      if (hasAPIKey) {
        modelTpl = { ...modelTpl, ...modelKeyOptions }; //override the model config with the key config
        modelTpl.hasKey = true;
      }

      let enabled =
        typeof LLMModels[modelId].enabled === 'function'
          ? LLMModels[modelId].enabled({ user: req.user, team: req._team })
          : modelTpl.enabled;

      // Skip legacy models for users with built-in model access to avoid confusion
      if (_hasBuiltInModels(req) && modelId.startsWith('legacy/')) {
        enabled = false;
      }

      // V2: only applicable for GenAI LLM and SmythOS models
      if (modelId.startsWith('smythos/')) {
        enabled = enabled && enabledSmythOSProviders.includes(modelTpl?.provider?.toLowerCase());
      }

      // Only show Runware models to users with proper plan (indicated by having builtin models enabled)
      if (provider === 'runware') {
        enabled = enabled && _hasBuiltInModels(req);
      }

      // Hide DALL-E models from users with builtin models
      if (_hasBuiltInModels(req) && modelId.startsWith('dall-e')) {
        enabled = false;
      }

      if (!enabled || modelTpl.hidden || (!modelTpl?.components && !modelTpl?.features)) {
        continue;
      }

      // Add token tag to the model
      if (modelTpl?.tokens) {
        modelTpl?.tags?.push(_getTokenTag(modelTpl?.tokens));
      }

      delete modelTpl.enabled;
      delete modelTpl.hidden;
      delete modelTpl.alias;

      models[modelId] = modelTpl;
    }
  } catch (error) {
    console.error('Error getting User LLMs', error);
  }

  return models;
}

/**
 * Gets the list of enabled SmythOS LLM providers for the team
 * @param req - Express Request object containing team information
 * @returns Array of enabled provider names in lowercase
 */
async function _getEnabledSmythOSProviders(req: Request): Promise<string[]> {
  let smythosLLMProviders = (await getTeamSettingsObj(req, SMYTH_LLM_PROVIDERS_SETTINGS_KEY)) || {};

  // Allow builtin model for smyth staff
  const hasBuiltinModels = _hasBuiltInModels(req);

  if (!hasBuiltinModels) return [];

  smythosLLMProviders = { ...DEFAULT_SMYTH_LLM_PROVIDERS_SETTINGS, ...smythosLLMProviders };

  // Filter and map enabled providers
  const enabledProviders = Object.entries(smythosLLMProviders || {})
    .filter(([_, config]) => config?.enabled === true)
    .map(([provider]) => provider.toLowerCase());

  // Always include 'runware' provider since it's not configurable through the UI but should be enabled
  return [...enabledProviders, 'runware'];
}

function _getTokenTag(contextWindow) {
  if (!contextWindow) return '';

  if (contextWindow >= 1000000) {
    return `${Math.floor(contextWindow / 1000000)}M`;
  } else {
    return `${Math.floor(contextWindow / 1000)}K`;
  }
}

function _hasBuiltInModels(req: Request) {
  return (
    req._team.subscription.plan?.properties?.flags?.hasBuiltinModels ||
    req._team.subscription.plan?.isDefaultPlan ||
    false
  );
}

export default {
  getUserLLMModels,
};
