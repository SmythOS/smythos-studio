import { Request } from 'express';
import Joi from 'joi';
import { LOCAL_LLM_SETTINGS_KEY } from '../../constants';
import * as teamData from '../../services/team-data.service';
import { uid } from '../../services/utils.service';

/**
 * Local LLM Helper
 *
 * Manages local LLM configurations with the following data structure:
 * {
 *   id: {
 *     name: <the friendly name>,
 *     id: <id of the entry>,
 *     modelId: <the model id entered by the user>,
 *     baseUrl: <base url>,
 *     fallbackLLM: <llm ID from builtin LLMs>
 *   }
 * }
 *
 * The 'id' is the normalized version of 'name'.
 * Example: "Deepseek r1 001" -> "Deepseek-r1-001"
 */

//#region - Type Definitions
export interface LocalLLMInputParams {
  id?: string;
  name: string;
  modelId: string;
  baseUrl: string;
  fallbackLLM: string;
}

export interface LocalLLMInfo extends LocalLLMInputParams {
  id: string; // Always present in stored data
}
//#endregion - Type Definitions

//#region - Utility Functions
/**
 * Normalizes a name to create a valid ID
 * Converts spaces and special characters to hyphens, removes multiple consecutive hyphens
 * @param name - The friendly name to normalize
 * @returns The normalized ID
 * @example normalizeName("Deepseek r1 001") -> "Deepseek-r1-001"
 */
export function normalizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-'); // Replace multiple consecutive hyphens with single hyphen
}
//#endregion - Utility Functions

//#region - Validation Schema
const localLLMValidationSchema = Joi.object({
  id: Joi.string()
    .optional()
    .pattern(/^[a-zA-Z0-9-_]+$/)
    .max(80),
  name: Joi.string().required().min(1).max(80).trim(),
  modelId: Joi.string().required().min(1).max(200).trim(),
  baseUrl: Joi.string()
    .required()
    .uri({ scheme: ['http', 'https'] })
    .max(500)
    .trim(),
  fallbackLLM: Joi.string().required().min(1).max(100).trim(),
});
//#endregion - Validation Schema

//#region - Core Functions
/**
 * Saves a local LLM configuration
 * @param req - Express request object
 * @param params - Local LLM parameters
 * @returns Promise with the saved data
 */
async function saveLocalLLM(req: Request, params: LocalLLMInputParams) {
  try {
    // Trim all string parameters
    const trimmedParams = {
      ...params,
      name: params.name?.trim(),
      modelId: params.modelId?.trim(),
      baseUrl: params.baseUrl?.trim(),
      fallbackLLM: params.fallbackLLM?.trim(),
    };

    // Validate input parameters
    const { error } = localLLMValidationSchema.validate(trimmedParams);
    if (error) {
      throw new Error(`Invalid request. ${error.message}`);
    }

    // Generate or use provided ID
    let entryId = trimmedParams.id;
    if (!entryId) {
      const normalizedName = normalizeName(trimmedParams.name);
      entryId = normalizedName || uid().toLowerCase();
    }

    // Create the local LLM data object
    const localLLMData: LocalLLMInfo = {
      id: entryId,
      name: trimmedParams.name,
      modelId: trimmedParams.modelId,
      baseUrl: trimmedParams.baseUrl,
      fallbackLLM: trimmedParams.fallbackLLM,
    };

    // Save to team settings
    const result = await teamData.saveTeamSettingsObj({
      req,
      settingKey: LOCAL_LLM_SETTINGS_KEY,
      entryId,
      data: localLLMData,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to save local LLM configuration');
    }

    return { data: { id: entryId, name: trimmedParams.name } };
  } catch (error) {
    console.error('Error saving local LLM model:', error?.message);
    throw error;
  }
}

/**
 * Gets a local LLM configuration by name
 * @param req - Express request object
 * @param modelName - The name of the model to retrieve
 * @returns Promise with the model info or empty object
 */
async function getLocalLLMByName(req: Request, modelName: string): Promise<LocalLLMInfo | {}> {
  try {
    const allLocalModels = await teamData.getTeamSettingsObj(req, LOCAL_LLM_SETTINGS_KEY);
    let modelInfo = {};

    if (allLocalModels && typeof allLocalModels === 'object') {
      for (const [key, model] of Object.entries(allLocalModels)) {
        if (model && typeof model === 'object' && model.name === modelName) {
          // Ensure id is present, using object key as fallback for legacy entries
          modelInfo = { ...model, id: model.id || key };
          break;
        }
      }
    }

    return modelInfo;
  } catch (error) {
    console.error('Error getting local LLM by name:', error?.message);
    return {};
  }
}

/**
 * Gets a local LLM configuration by entry ID
 * @param req - Express request object
 * @param entryId - The ID of the entry to retrieve
 * @returns Promise with the model info
 */
async function getLocalLLMByEntryId(req: Request, entryId: string): Promise<LocalLLMInfo | null> {
  try {
    const allLocalModels = await teamData.getTeamSettingsObj(req, LOCAL_LLM_SETTINGS_KEY);

    if (!allLocalModels || typeof allLocalModels !== 'object') {
      return null;
    }

    const model = allLocalModels[entryId];
    if (!model || typeof model !== 'object') {
      return null;
    }

    // Ensure id is present
    return { ...model, id: model.id || entryId };
  } catch (error) {
    console.error('Error getting local LLM by entry ID:', error?.message);
    throw error;
  }
}

/**
 * Gets all local LLM configurations for a team
 * @param req - Express request object
 * @returns Promise with all local models
 */
async function getAllLocalLLMs(req: Request): Promise<Record<string, LocalLLMInfo>> {
  try {
    const allLocalModels = await teamData.getTeamSettingsObj(req, LOCAL_LLM_SETTINGS_KEY);

    if (!allLocalModels || typeof allLocalModels !== 'object') {
      return {};
    }

    // Ensure all entries have proper id field
    const normalizedModels: Record<string, LocalLLMInfo> = {};
    for (const [key, model] of Object.entries(allLocalModels)) {
      if (model && typeof model === 'object') {
        normalizedModels[key] = { ...model, id: model.id || key };
      }
    }

    return normalizedModels;
  } catch (error) {
    console.error('Error getting all local LLMs:', error?.message);
    return {};
  }
}

/**
 * Deletes a local LLM configuration
 * @param req - Express request object
 * @param entryId - The ID of the entry to delete
 * @returns Promise with the result
 */
async function deleteLocalLLM(req: Request, entryId: string) {
  try {
    const result = await teamData.deleteTeamSettingsObj(req, LOCAL_LLM_SETTINGS_KEY, entryId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete local LLM configuration');
    }

    return result;
  } catch (error) {
    console.error('Error deleting local LLM model:', error?.message);
    throw error;
  }
}
//#endregion - Core Functions

//#region - Export Helper Object
export const localLLMHelper = {
  saveLocalLLM,
  getLocalLLMByName,
  getLocalLLMByEntryId,
  getAllLocalLLMs,
  deleteLocalLLM,
  normalizeName,
};
//#endregion - Export Helper Object
