import express from 'express';
import {
  CUSTOM_LLM_SETTINGS_KEY,
  CUSTOM_MODELS_CACHE_KEY,
  DEFAULT_SMYTH_LLM_PROVIDERS_SETTINGS,
  SMYTH_LLM_PROVIDERS_SETTINGS_KEY,
} from '../../../constants';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import { cacheClient } from '../../../services/cache.service';
import { LLMService } from '../../../services/LLMHelper/LLMService.class';
import Vault from '../../../services/SmythVault.class';
import {
  deleteTeamSettingsObj,
  getTeamSettingsObj,
  saveTeamSettingsObj,
} from '../../../services/team-data.service';
import { Team } from '../../../types';
import { isSmythStaff } from '../../../utils';
import { isCustomLLMAllowed } from '../../../utils/customLLM';
import { customLLMHelper } from '../../router.helpers/customLLM.helper';
import { getVaultKeys, setVaultKey } from '../../router.utils';

const router = express.Router();

const vault = new Vault();
const OAUTH_SETTING_KEY = 'oauth';

// ------------------------------
// Internal helpers (pure, no side-effects)
// ------------------------------

/**
 * Flattens legacy auth_settings.oauth_info into auth_settings (new structure),
 * removes disallowed fields, and guarantees the presence of a name key.
 */
function normalizeAuthSettingsObject(authSettings: any): any {
  if (!authSettings || typeof authSettings !== 'object') return authSettings;

  // Remove disallowed fields
  if (authSettings.team) delete authSettings.team;

  // Flatten oauth_info if present (legacy)
  if (authSettings.oauth_info && typeof authSettings.oauth_info === 'object') {
    const legacyInfo = authSettings.oauth_info;
    const keysToFlatten = [
      'oauth_keys_prefix',
      'service',
      'platform',
      'scope',
      'authorizationURL',
      'tokenURL',
      'clientID',
      'clientSecret',
      'requestTokenURL',
      'accessTokenURL',
      'userAuthorizationURL',
      'consumerKey',
      'consumerSecret',
    ];
    for (const k of keysToFlatten) {
      // Always use value from oauth_info if it exists (overwrite existing)
      if (legacyInfo[k] !== undefined) {
        authSettings[k] = legacyInfo[k];
      }
    }
    delete authSettings.oauth_info;
  }

  // Ensure a name key exists to classify as named connection (even if empty)
  if (typeof authSettings.name === 'undefined') authSettings.name = '';

  return authSettings;
}

/**
 * Merges new settings into existing settings with legacy compatibility.
 * - Existing auth_settings (if present) are the base; otherwise old flat entry is used (sans tokens)
 * - Deep-merges oauth_info (legacy), then flattens and sanitizes to new shape
 */
function mergeAuthSettings(existingEntry: any, incomingNewSettings: any): any {
  // Determine existing settings base
  let existingAuthSettings = {} as any;
  if (existingEntry?.auth_settings) {
    existingAuthSettings = existingEntry.auth_settings;
  } else if (existingEntry && Object.keys(existingEntry).length > 0 && !existingEntry.auth_data) {
    // Old structure: remove likely token fields
    const { primary: _p, secondary: _s, expires_in: _e, ...oldSettings } = existingEntry;
    existingAuthSettings = oldSettings;
  }

  // Merge incoming
  let merged = { ...existingAuthSettings, ...(incomingNewSettings || {}) } as any;

  // Deep-merge oauth_info if present
  if (existingAuthSettings?.oauth_info && incomingNewSettings?.oauth_info) {
    merged.oauth_info = { ...existingAuthSettings.oauth_info, ...incomingNewSettings.oauth_info };
  }

  // Normalize to new shape (flatten & sanitize)
  merged = normalizeAuthSettingsObject(merged);
  return merged;
}

/*
  some endpoints are duplicated in /page/builder.ts, the concept is we require it to handle page specific ACLs
*/

router.get('/keys', includeTeamDetails, async (req, res) => {
  const allKeys = await getVaultKeys(req);

  // when something goes wrong, allKeys is null
  if (!allKeys) {
    return res.status(400).json({ success: false, error: 'Error getting keys!' });
  }

  res.send({ success: true, data: allKeys, teamId: req?._team?.id });
});

router.post('/keys', includeTeamDetails, async (req, res) => {
  const result = await setVaultKey(req);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

router.put('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const result = await setVaultKey(req, keyId);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

router.get('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const team = req?._team?.id;

  const keyObj = await vault.get({ team, keyId }, req);

  // when something goes wrong, allKeys is null
  if (!keyObj) {
    return res.status(400).json({ success: false, error: 'Error getting key with ID.' });
  }

  res.send({ success: true, data: { [keyId]: keyObj } });
});

router.get('/keys/:keyId/exists', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const team = req?._team?.id;

  const isKeyExists = await vault.exists({ team, keyId }, req);

  res.send({ success: true, data: isKeyExists });
});

router.get('/keys/name/:keyName', includeTeamDetails, async (req, res) => {
  const { keyName } = req.params;

  const team = req?._team?.id;

  const isKeyExists = await vault.get({ team, keyName }, req);

  res.send({ success: true, data: { data: isKeyExists } });
});

router.get('/keys/name/:keyName/exists', includeTeamDetails, async (req, res) => {
  const { keyName } = req.params;
  const { excludeId } = req.query;
  const team = req?._team?.id;

  const isKeyExists = await vault.exists({ team, keyName, excludeId: excludeId as string }, req);

  res.send({ success: true, data: isKeyExists });
});

router.delete('/keys/:keyId', includeTeamDetails, async (req, res) => {
  const { keyId } = req.params;

  const team = req?._team?.id;

  const result = await vault.delete(keyId, team, req);

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: { keyId } });
});

/**
 * Sanitizes OAuth connections by replacing sensitive fields with placeholders.
 * Replaces tokens and expiration info with [REDACTED] to prevent exposure.
 */
function sanitizeOAuthConnections(connections: any): any {
  if (!connections || typeof connections !== 'object') return connections;

  const sanitized = {};

  for (const [key, value] of Object.entries(connections)) {
    if (!value || typeof value !== 'object') {
      sanitized[key] = value;
      continue;
    }

    // Deep clone the connection object
    const sanitizedConnection = JSON.parse(JSON.stringify(value));

    // Helper to sanitize sensitive fields
    const sanitizeTokenFields = (obj: any, location: string = '') => {
      if (!obj || typeof obj !== 'object') return;

      // List of sensitive field names to sanitize
      const sensitiveFields = ['primary', 'secondary', 'expires_in', 'refresh_token',
        'access_token', 'accessToken', 'refreshToken', 'token',
        'tokenSecret', 'accessTokenSecret'];

      for (const field of sensitiveFields) {
        if (obj[field] && typeof obj[field] === 'string' && obj[field] !== '[REDACTED]') {
          obj[field] = '[REDACTED]';
        }
      }

      // Also check for any field that looks like a token (JWT pattern or long string)
      // Exclude fields that are meant to be visible like clientID, clientSecret, consumerKey, etc.
      const excludedFields = ['clientID', 'clientSecret', 'consumerKey', 'consumerSecret',
        'oauth_keys_prefix', 'name', 'platform', 'service', 'type',
        'scope', 'authorizationURL', 'tokenURL', 'requestTokenURL',
        'accessTokenURL', 'userAuthorizationURL'];

      for (const [fieldName, fieldValue] of Object.entries(obj)) {
        if (typeof fieldValue === 'string' &&
          fieldValue.length > 40 &&
          !excludedFields.includes(fieldName) &&
          fieldValue !== '[REDACTED]') {
          // This might be a token - check for JWT pattern or OAuth token pattern
          const looksLikeToken = fieldValue.includes('.') || // JWT (has dots)
            fieldValue.match(/^[A-Za-z0-9_-]{40,}$/); // OAuth token pattern
          if (looksLikeToken) {
            obj[fieldName] = '[REDACTED]';
          }
        }
      }
    };

    // Sanitize auth_data (new structure)
    if (sanitizedConnection.auth_data && typeof sanitizedConnection.auth_data === 'object') {
      sanitizeTokenFields(sanitizedConnection.auth_data, 'auth_data');
    }

    // Sanitize auth_settings (might exist in legacy or contain misplaced tokens)
    if (sanitizedConnection.auth_settings && typeof sanitizedConnection.auth_settings === 'object') {
      sanitizeTokenFields(sanitizedConnection.auth_settings, 'auth_settings');
    }

    // Sanitize root level (legacy structure)
    sanitizeTokenFields(sanitizedConnection, 'root');

    sanitized[key] = sanitizedConnection;
  }

  return sanitized;
}

router.get('/oauth-connections', includeTeamDetails, async (req, res) => {
  try {
    const settings = await getTeamSettingsObj(req, OAUTH_SETTING_KEY);
    if (settings === null) {
      console.error('Failed to get OAuth settings due to an internal error.');
      return res.status(500).json({ success: false, error: 'Failed to retrieve OAuth connections.' });
    }

    // Parse any stringified entries before sanitization
    const parsedSettings = {};
    if (settings && typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value === 'string') {
          try {
            parsedSettings[key] = JSON.parse(value);
          } catch (e) {
            // If parsing fails, keep as is
            parsedSettings[key] = value;
          }
        } else {
          parsedSettings[key] = value;
          // Log warning if tokens are exposed (for security monitoring)
          if (value && typeof value === 'object') {
            const hasExposedTokens =
              (value.auth_data?.primary && value.auth_data.primary !== '[REDACTED]') ||
              (value.primary && value.primary !== '[REDACTED]');
            if (hasExposedTokens) {
              console.warn(`[OAuth Security] Connection ${key} has unsanitized tokens - will be sanitized before sending to frontend`);
            }
          }
        }
      }
    }

    // Sanitize the settings before sending to frontend
    const sanitizedSettings = sanitizeOAuthConnections(parsedSettings);
    res.json(sanitizedSettings);
  } catch (error) {
    console.error('Error fetching OAuth connections:', error);
    res.status(500).json({ success: false, error: 'An unexpected error occurred while fetching OAuth connections.' });
  }
});

router.put('/oauth-connections', includeTeamDetails, async (req, res) => {
  const { entryId, data: newSettings } = req.body;

  // Validate entryId format
  if (!entryId || typeof entryId !== 'string' || !entryId.startsWith('OAUTH_') || !entryId.endsWith('_TOKENS')) {
    return res.status(400).json({ success: false, error: 'Invalid or missing entryId.' });
  }
  // Validate incoming settings data (basic check)
  if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing connection settings data.' });
  }

  try {
    // 1. Fetch all existing OAuth settings for the team
    const existingSettingsMap = await getTeamSettingsObj(req, OAUTH_SETTING_KEY);
    if (existingSettingsMap === null) {
      // Handle case where fetching settings failed (getTeamSettingsObj handles internal errors)
      return res.status(500).json({ success: false, error: 'Failed to retrieve existing OAuth settings.' });
    }

    // 2. Get the specific entry being updated, or default to an empty object
    const existingEntry = existingSettingsMap[entryId] || {};
    // 3. Preserve existing auth_data (if it exists) OR migrate from old structure
    let preservedAuthData = existingEntry.auth_data || {}; // Keep existing tokens

    // If auth_data is empty but tokens exist at root level (old structure), migrate them
    if ((!preservedAuthData.primary && !preservedAuthData.secondary) &&
      (existingEntry.primary || existingEntry.secondary)) {
      // console.log('[OAuth Edit] Migrating tokens from old structure to new auth_data');
      preservedAuthData = {
        primary: existingEntry.primary || '',
        secondary: existingEntry.secondary || '',
        expires_in: existingEntry.expires_in || ''
      };
    }

    // 4-5. Merge and normalize the settings using helper
    const mergedAuthSettings = mergeAuthSettings(existingEntry, newSettings);

    // 6. Construct the final data object with the new structure
    const finalDataToSave = {
      auth_data: preservedAuthData, // Preserved tokens
      auth_settings: mergedAuthSettings, // Merged configuration
    };

    // 7. Save the updated entry back using saveTeamSettingsObj
    const result = await saveTeamSettingsObj({
      req,
      settingKey: OAUTH_SETTING_KEY,
      entryId: entryId,
      data: finalDataToSave,
    });

    // 8. Handle save result
    if (!result.success) {
      console.error(`[PUT /oauth-connections] Failed to save settings for ${entryId}:`, result.error);
      return res.status(500).json({ success: false, error: result.error || 'Failed to save OAuth connection.' });
    }

    // Respond with success and potentially the saved data (or just success status)
    // Returning the saved data might be useful for the client
    res.json({ success: true, data: finalDataToSave }); // Respond with the data that was saved

  } catch (error) {
    console.error(`[PUT /oauth-connections] Error processing request for ${entryId}:`, error);
    res.status(500).json({ success: false, error: 'An unexpected error occurred while saving the OAuth connection.' });
  }
});

router.delete('/oauth-connections/:connectionId', includeTeamDetails, async (req, res) => {
  const { connectionId } = req.params;

  if (!connectionId || typeof connectionId !== 'string' || !connectionId.startsWith('OAUTH_') || !connectionId.endsWith('_TOKENS')) {
    return res.status(400).json({ success: false, error: 'Invalid or missing connectionId parameter.' });
  }

  try {
    const result = await deleteTeamSettingsObj(req, OAUTH_SETTING_KEY, connectionId);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'Failed to delete OAuth connection.' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error deleting OAuth connection ${connectionId}:`, error);
    res.status(500).json({ success: false, error: 'An unexpected error occurred while deleting the OAuth connection.' });
  }
});

async function getRecommendedModels(req) {
  let recommendedModels = (await getTeamSettingsObj(req, SMYTH_LLM_PROVIDERS_SETTINGS_KEY)) || {};

  const hasBuiltinModels =
    req._team.subscription.plan?.properties?.flags?.hasBuiltinModels ||
    isSmythStaff(req._user) ||
    false;

  // if (hasBuiltinModels) {
  recommendedModels = {
    ...DEFAULT_SMYTH_LLM_PROVIDERS_SETTINGS,
    ...recommendedModels,
  };
  // }

  return recommendedModels;
}

router.get('/recommended-models', includeTeamDetails, async (req, res) => {
  const recommendedModels = await getRecommendedModels(req);
  res.send({ success: true, data: recommendedModels });
});

router.put('/recommended-models/:providerId', includeTeamDetails, async (req, res) => {
  const { providerId } = req.params;
  const { enabled } = req.body;

  const result = await saveTeamSettingsObj({
    req,
    entryId: providerId,
    data: { enabled: Boolean(enabled) },
    settingKey: SMYTH_LLM_PROVIDERS_SETTINGS_KEY,
  });

  if (!result?.success) {
    return res.status(400).json({ success: false, error: result?.error });
  }

  res.send({ success: true, data: result?.data });
});

export default router;

// #region Custom LLM
const customLLMAccessMw = async (req: any, res: any, next: any) => {
  //* should be called after `includeTeamDetails` middleware to get the team details
  const teamDetails: Team = req._team;
  const userEmail: string = req?._user?.email || '';
  const flags: any = teamDetails?.subscription?.plan?.properties?.flags;

  if (
    !(
      teamDetails?.subscription?.properties?.customModelsEnabled ||
      flags?.['hasBuiltinModels'] ||
      flags?.['customModelsEnabled']
    ) &&
    !isSmythStaff(req?._user) &&
    !isCustomLLMAllowed(userEmail)
  ) {
    return res
      .status(403)
      .json({ success: false, error: 'Custom LLM models are not enabled for this team or user' });
  }

  return next();
};

// Create a middleware or helper function
const handleCustomLLMSave = async (req, res) => {
  const accessToken = req?.user?.accessToken;
  const teamId = req?._team?.id;
  const userEmail = req?._user?.email;
  const id = req.params?.id; // This will be undefined for POST requests

  try {
    const saveCustomLLM = await customLLMHelper.saveCustomLLM(req, {
      accessToken,
      teamId,
      userEmail,
      idToken: req?.session?.idToken,
      id,
      ...req.body,
    });

    // delete the custom LLM model cache
    await cacheClient.del(`${CUSTOM_MODELS_CACHE_KEY}:${teamId}`).catch((error) => {
      console.warn('Error deleting custom LLM model cache:', error);
    });

    res.status(200).json({ success: true, data: saveCustomLLM.data });
  } catch (error) {
    console.error('Error saving custom LLM model:', error);
    res.status(500).json({ success: false, error: 'Error saving custom LLM model.' });
  }
};

const customLLMRouteMiddlewares = [includeTeamDetails, customLLMAccessMw];

router.post('/custom-llm/', customLLMRouteMiddlewares, handleCustomLLMSave);
router.put('/custom-llm/:id', customLLMRouteMiddlewares, handleCustomLLMSave);

router.get('/custom-llm', includeTeamDetails, async (req, res) => {
  try {
    const llmProvider = new LLMService();
    const allCustomModels = await llmProvider.getCustomModels(req);
    res.status(200).json({ success: true, data: allCustomModels });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error getting custom LLM models.' });
  }
});

router.get('/custom-llm/:id', includeTeamDetails, async (req, res) => {
  try {
    const entryId = req.params.id;

    const modelInfo = await customLLMHelper.getCustomLLMByEntryId(req, entryId);

    res.status(200).json({ success: true, data: modelInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error getting custom LLM models.' });
  }
});

router.get('/custom-llm/with-credentials/:provider/:name', includeTeamDetails, async (req, res) => {
  try {
    const provider = req.params.provider;
    const name = req.params.name;
    const accessToken = req?.user?.accessToken;

    const customLLM = await customLLMHelper.getCustomLLMWithCredentials({
      accessToken,
      idToken: req?.session?.idToken,
      teamId: req?._team?.id,
      provider,
      name,
      req,
    });

    res.status(200).json({ success: true, data: customLLM.data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error getting custom LLM models.' });
  }
});

router.delete('/custom-llm/:provider/:id', customLLMRouteMiddlewares, async (req, res) => {
  try {
    const accessToken = req?.user?.accessToken;
    const idToken = req?.session?.idToken;
    const teamId = req?._team?.id;
    const provider = req.params.provider;
    const id = req.params.id;

    // It's not necessary to await for deleting the custom LLM model
    customLLMHelper.deleteCustomLLM({
      req,
      accessToken,
      idToken,
      teamId,
      id,
      provider,
    });

    const deleteModel = await deleteTeamSettingsObj(req, CUSTOM_LLM_SETTINGS_KEY, id);

    // delete the custom LLM model cache
    await cacheClient.del(`${CUSTOM_MODELS_CACHE_KEY}:${teamId}`).catch((error) => {
      console.warn('Error deleting custom LLM model cache:', error);
    });

    res.status(200).json({ success: true, data: deleteModel.data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error deleting custom LLM model.' });
  }
});
// #endregion
