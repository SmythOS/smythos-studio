import { Request } from 'express';
import Joi from 'joi';
import { USER_CUSTOM_LLM_SETTINGS_KEY } from '../../constants';
import { LLMService } from '../../services/LLMHelper/LLMService.class';
import * as teamData from '../../services/team-data.service';
import { uid } from '../../services/utils.service';

/**
 * User Custom LLM Helper
 *
 * Manages user custom LLM configurations with the following data structure:
 * {
 *   id: {
 *     name: <the friendly name>,
 *     id: <id of the entry>,
 *     modelId: <the model id entered by the user>,
 *     baseURL: <base url>,
 *     fallbackLLM: <llm ID from builtin LLMs>
 *   }
 * }
 *
 * The 'id' is generated using uid() like custom-llm, not normalized from name.
 * This provides the same ID generation pattern as custom-llm but without ACL restrictions.
 */

//#region - Type Definitions
export interface UserCustomLLMInputParams {
  id?: string;
  name: string;
  modelId: string;
  baseURL: string;
  provider: string;
  fallbackLLM: string;
  features?: string[];
}

export interface UserCustomLLMInfo extends UserCustomLLMInputParams {
  id: string; // Always present in stored data
}

interface UserCustomLLMModel {
  isUserCustomLLM: boolean;
  [key: string]: any;
}
//#endregion - Type Definitions

//#region - Validation Schema
const userCustomLLMValidationSchema = Joi.object({
  id: Joi.string()
    .optional()
    .pattern(/^[a-zA-Z0-9-_]+$/)
    .max(80),
  name: Joi.string().trim().required().min(1).max(80),
  modelId: Joi.string().trim().required().min(1).max(200),
  baseURL: Joi.string()
    .trim()
    .required()
    .uri({ scheme: ['http', 'https'] })
    .max(500),
  provider: Joi.string().trim().required().valid('OpenAI', 'Ollama'),
  fallbackLLM: Joi.string().trim().required().min(1).max(100),
  features: Joi.array().items(Joi.string()).optional(),
});
//#endregion - Validation Schema

//#region - Core Functions
/**
 * Saves a user custom LLM configuration
 * @param req - Express request object
 * @param params - User Custom LLM parameters
 * @returns Promise with the saved data
 */
async function saveUserCustomLLM(req: Request, params: UserCustomLLMInputParams) {
  try {
    // Trim all string parameters
    const trimmedParams = {
      ...params,
      name: params.name?.trim(),
      modelId: params.modelId?.trim(),
      baseURL: params.baseURL?.trim(),
      provider: params.provider?.trim(),
      fallbackLLM: params.fallbackLLM?.trim(),
      features: params.features || ['text'],
    };

    // Validate input parameters
    const { error } = userCustomLLMValidationSchema.validate(trimmedParams);
    if (error) {
      throw new Error(`Invalid request. ${error.message}`);
    }

    // Generate or use provided ID - using uid() like custom-llm
    const entryId = trimmedParams.id || uid().toLowerCase();

    // Create the user custom LLM data object
    const userCustomLLMData: UserCustomLLMInfo = {
      id: entryId,
      name: trimmedParams.name,
      modelId: trimmedParams.modelId,
      baseURL: trimmedParams.baseURL,
      fallbackLLM: trimmedParams.fallbackLLM,
      features: trimmedParams.features,
      provider: trimmedParams.provider,
    };

    // Save to team settings
    const result = await teamData.saveTeamSettingsObj({
      req,
      settingKey: USER_CUSTOM_LLM_SETTINGS_KEY,
      entryId,
      data: userCustomLLMData,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to save user custom LLM configuration');
    }

    return { data: { id: entryId, name: trimmedParams.name } };
  } catch (error) {
    console.error('Error saving user custom LLM model:', error?.message);
    throw error;
  }
}

/**
 * Gets a user custom LLM configuration by name
 * @param req - Express request object
 * @param modelName - The name of the model to retrieve
 * @returns Promise with the model info or empty object
 */
async function getUserCustomLLMByName(
  req: Request,
  modelName: string,
): Promise<UserCustomLLMInfo | {}> {
  try {
    const allUserCustomModels = await teamData.getTeamSettingsObj(
      req,
      USER_CUSTOM_LLM_SETTINGS_KEY,
    );
    let modelInfo = {};

    if (allUserCustomModels && typeof allUserCustomModels === 'object') {
      for (const [key, model] of Object.entries(allUserCustomModels)) {
        if (model && typeof model === 'object' && model.name === modelName) {
          // Ensure id is present, using object key as fallback for legacy entries
          modelInfo = { ...model, id: model.id || key };
          break;
        }
      }
    }

    return modelInfo;
  } catch (error) {
    console.error('Error getting user custom LLM by name:', error?.message);
    return {};
  }
}

/**
 * Gets a user custom LLM configuration by entry ID
 * @param req - Express request object
 * @param entryId - The ID of the entry to retrieve
 * @returns Promise with the model info
 */
async function getUserCustomLLMByEntryId(
  req: Request,
  entryId: string,
): Promise<UserCustomLLMInfo | null> {
  try {
    const allUserCustomModels = await teamData.getTeamSettingsObj(
      req,
      USER_CUSTOM_LLM_SETTINGS_KEY,
    );

    if (!allUserCustomModels || typeof allUserCustomModels !== 'object') {
      return null;
    }

    const model = allUserCustomModels[entryId];
    if (!model || typeof model !== 'object') {
      return null;
    }

    // Ensure id is present
    return { ...model, id: model.id || entryId };
  } catch (error) {
    console.error('Error getting user custom LLM by entry ID:', error?.message);
    throw error;
  }
}

/**
 * Retrieves all user custom LLM models for a team.
 * Filters models to only return those marked as user custom LLMs.
 * Returns an empty object if no models are found or if an error occurs.
 *
 * @param req - Express request object containing team information
 * @returns Promise resolving to a record of UserCustomLLMModel objects keyed by model ID, or empty object on error
 */
async function getAllUserCustomLLMs(req: Request): Promise<Record<string, UserCustomLLMModel>> {
  try {
    const llmProvider = new LLMService();
    const allCustomModels = await llmProvider.getCustomModels(req);

    if (!allCustomModels || typeof allCustomModels !== 'object') {
      return {};
    }

    // Filter models to only include those marked as user custom LLMs
    const userCustomModels: Record<string, UserCustomLLMModel> = {};

    for (const [modelId, model] of Object.entries(allCustomModels)) {
      if (
        model &&
        typeof model === 'object' &&
        'isUserCustomLLM' in model &&
        (model as UserCustomLLMModel).isUserCustomLLM === true
      ) {
        userCustomModels[modelId] = model as UserCustomLLMModel;
      }
    }

    return userCustomModels;
  } catch {
    return {};
  }
}

/**
 * Deletes a user custom LLM configuration
 * @param req - Express request object
 * @param entryId - The ID of the entry to delete
 * @returns Promise with the result
 */
async function deleteUserCustomLLM(req: Request, entryId: string) {
  try {
    const result = await teamData.deleteTeamSettingsObj(req, USER_CUSTOM_LLM_SETTINGS_KEY, entryId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete user custom LLM configuration');
    }

    return result;
  } catch (error) {
    console.error('Error deleting user custom LLM model:', error?.message);
    throw error;
  }
}
//#endregion - Core Functions

//#region - Export Helper Object
export const userCustomLLMHelper = {
  saveUserCustomLLM,
  getUserCustomLLMByName,
  getUserCustomLLMByEntryId,
  getAllUserCustomLLMs,
  deleteUserCustomLLM,
};
//#endregion - Export Helper Object
