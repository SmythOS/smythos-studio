import Joi from 'joi';

import { Request } from 'express';
import {
  BEDROCK_REGIONS,
  CUSTOM_LLM_FEATURES,
  CUSTOM_LLM_PROVIDERS,
  VERTEX_AI_REGIONS,
} from '../../../shared/constants/custom-llm.constants';
import { customModels } from '../../../shared/custom-models';
import { CUSTOM_LLM_SETTINGS_KEY } from '../../constants';
import { vault } from '../../services/SmythVault.class';
import * as teamData from '../../services/team-data.service';
import { uid } from '../../services/utils.service';
import { setVaultKeys } from '../router.helpers/vault.helper';

interface AuthInfo {
  accessToken: string;
  idToken: string;
  teamId: string;
  userEmail?: string;
}

//#region - Type Definitions
interface BaseInputParams extends AuthInfo {
  id?: string;
  name: string;
  features: string[];
  provider: string;
  tags: string[];
  settings: {
    foundationModel: string;
    customModel: string;
    region: string;
  };
}

type BedrockModelInputParams = BaseInputParams & {
  settings: {
    keyId: string;
    secretKey: string;
    sessionKey: string;
  };
};

type VertexAIModelInputParams = BaseInputParams & {
  settings: {
    projectId: string;
    jsonCredentials: string;
  };
};

export type CustomLLMInputParams = BedrockModelInputParams | VertexAIModelInputParams;

export type CustomLLMInfo = CustomLLMInputParams & {
  settings: {
    keyIDName?: string;
    secretKeyName?: string;
    sessionKeyName?: string;
    jsonCredentialsName?: string;
  };
};
//#endregion - Type Definitions

//#region - Functions to export
async function saveCustomLLM(req: Request, params: CustomLLMInputParams) {
  try {
    if (params.provider === 'Bedrock') {
      return await _saveBedrockModel(req, params as BedrockModelInputParams);
    } else if (params.provider === 'VertexAI') {
      return await _saveVertexAIModel(req, params as VertexAIModelInputParams);
    }
  } catch (error) {
    throw error;
  }
}

interface DeleteCustomLLMParams extends AuthInfo {
  id: string;
  provider: string;
  req: Request;
}
async function deleteCustomLLM(params: DeleteCustomLLMParams) {
  const { req, teamId, id, provider } = params;

  try {
    if (provider === 'Bedrock') {
      return await vault.deleteMultiple({
        req,
        team: teamId,
        entryIds: [`AWS Key ID (${id})`, `AWS Secret Key (${id})`, `AWS Session Key (${id})`],
      });
    } else if (provider === 'VertexAI') {
      return await vault.deleteMultiple({
        req,
        team: teamId,
        entryIds: [`Google JSON Credentials (${id})`],
      });
    }
  } catch (error) {
    throw error;
  }
}

async function getCustomLLMWithCredentials(
  params: AuthInfo & { provider: string; name: string; req: Request },
) {
  const { provider } = params;

  try {
    if (provider === 'Bedrock') {
      return await _getBedrockModel(params);
    } else if (provider === 'VertexAI') {
      return await _getVertexAIModel(params);
    }
  } catch (error) {
    throw error;
  }
}

async function getCustomLLMByName(req: Request, modelName: string): Promise<CustomLLMInfo | {}> {
  try {
    const allCustomModels = await teamData.getTeamSettingsObj(req, CUSTOM_LLM_SETTINGS_KEY);
    let modelInfo = {};

    for (const [key, model] of Object.entries(allCustomModels)) {
      if (model.name === modelName) {
        // Ensure id is present, using object key as fallback for legacy entries
        modelInfo = { ...model, id: model.id || key };
        break;
      }
    }

    return modelInfo;
  } catch (error) {
    return {};
  }
}

async function getCustomLLMByEntryId(req: Request, entryId: string) {
  try {
    const allCustomModels = await teamData.getTeamSettingsObj(req, CUSTOM_LLM_SETTINGS_KEY);
    return allCustomModels[entryId];
  } catch (error) {
    throw error;
  }
}
//#endregion - Functions to export

//#region - Joi Base Validation Schemas
const baseValidationSchema = Joi.object({
  // Authentication and user information
  accessToken: Joi.string().required(),
  idToken: Joi.string().required(),
  teamId: Joi.string().required(),
  userEmail: Joi.string().email().required(),

  // Custom LLM details
  id: Joi.string()
    .optional()
    .pattern(/^[a-zA-Z0-9-_\s]+$/)
    .max(80),
  name: Joi.string()
    .pattern(/^[a-zA-Z0-9-_\s]+$/)
    .max(80)
    .required(),
  features: Joi.array().items(
    Joi.string().valid(...CUSTOM_LLM_FEATURES.map((feature) => feature.value)),
  ),
  provider: Joi.string()
    .valid(...CUSTOM_LLM_PROVIDERS.map((provider) => provider.value))
    .required(),
  tags: Joi.array().items(Joi.string().max(20)),
  settings: Joi.object({
    foundationModel: Joi.string()
      .valid(...Object.keys(customModels))
      .required(),
    customModel: Joi.string().max(200).allow(''),
    region: Joi.string()
      .valid(
        ...BEDROCK_REGIONS.map((region) => region.value),
        ...VERTEX_AI_REGIONS.map((region) => region.value),
      )
      .required(),
  }),
});

const bedrockValidationSchema = baseValidationSchema.concat(
  Joi.object({
    settings: {
      customModel: Joi.string().allow('').max(200),
      keyId: Joi.string().required().max(100),
      secretKey: Joi.string().required().max(100),
      sessionKey: Joi.string().max(2048).allow(''),
    },
  }),
);

const vertexAIValidationSchema = baseValidationSchema.concat(
  Joi.object({
    settings: {
      projectId: Joi.string().required().max(100),
      jsonCredentials: Joi.string().required().max(10000),
    },
  }),
);
//#endregion - Joi Base Validation Schemas

//#region - Provider Specific Functions
// TODO [CUSTOM_LLM]: we need to clean saved vault entries if the llm entry saving failed
async function _saveBedrockModel(req: Request, params: BedrockModelInputParams) {
  let { name, provider } = params;
  const { teamId, userEmail, id, features, settings } = params;
  let { foundationModel, customModel, region, keyId, secretKey, sessionKey } = settings;

  name = name?.trim();
  provider = provider?.trim();

  foundationModel = foundationModel?.trim();
  customModel = customModel?.trim();
  keyId = keyId?.trim();
  secretKey = secretKey?.trim();
  sessionKey = sessionKey?.trim();

  const { error } = bedrockValidationSchema.validate({ ...params });

  if (error) {
    throw new Error(`Invalid request. ${error.message}`);
  }

  const entryId = id || uid().toLowerCase();

  const keyIDName = `AWS Key ID (${entryId})`;
  const secretKeyName = `AWS Secret Key (${entryId})`;
  const sessionKeyName = `AWS Session Key (${entryId})`;

  const keyEntries = [
    {
      id: keyIDName,
      scope: ['CUSTOM_LLM'],
      name: keyIDName,
      key: keyId,
      metadata: {
        field: 'keyId',
        customLLMEntryId: entryId,
        customLLMEntryName: name,
      },
    },
    {
      id: secretKeyName,
      scope: ['CUSTOM_LLM'],
      name: secretKeyName,
      key: secretKey,
      metadata: {
        field: 'secretKey',
        customLLMEntryId: entryId,
        customLLMEntryName: name,
      },
    },
  ];

  if (settings?.sessionKey) {
    keyEntries.push({
      id: sessionKeyName,
      scope: ['CUSTOM_LLM'],
      name: sessionKeyName,
      key: sessionKey,
      metadata: {
        field: 'sessionKey',
        customLLMEntryId: entryId,
        customLLMEntryName: name,
      },
    });
  }

  const asyncOperations = [];

  asyncOperations.push(
    setVaultKeys({
      req,
      teamId,
      userEmail,
      keyEntries,
    }),
  );

  asyncOperations.push(
    teamData.saveTeamSettingsObj({
      req,
      settingKey: CUSTOM_LLM_SETTINGS_KEY,
      entryId,
      data: {
        id: entryId,
        name,
        provider,
        features,
        tags: [provider],
        settings: {
          foundationModel,
          customModel,
          region,
          keyIDName,
          secretKeyName,
          sessionKeyName: settings?.sessionKey ? sessionKeyName : '', // Store session key only if it exists
        },
      },
    }),
  );

  try {
    await Promise.all(asyncOperations);

    return { data: { id: entryId, name, provider } };
  } catch (error) {
    console.error('Error saving Bedrock model:', error?.message);
    throw error;
  }
}

async function _saveVertexAIModel(req: Request, params: VertexAIModelInputParams) {
  const { accessToken, teamId, userEmail, id, name, provider, features, settings, idToken } =
    params;
  const { foundationModel, customModel, region, projectId, jsonCredentials } = settings;

  const { error } = vertexAIValidationSchema.validate(params);

  if (error) {
    throw new Error(`Invalid request. ${error.message}`);
  }

  const entryId = id || uid().toLowerCase();

  const jsonCredentialsName = `Google JSON Credentials (${entryId})`;

  const keyEntries = [
    {
      id: jsonCredentialsName,
      scope: ['CUSTOM_LLM'],
      name: jsonCredentialsName,
      key: jsonCredentials,
      metadata: {
        field: 'jsonCredentials',
        customLLMEntryId: entryId,
        customLLMEntryName: name,
      },
    },
  ];

  const asyncOperations = [];

  asyncOperations.push(
    setVaultKeys({
      req,
      teamId,
      userEmail,
      keyEntries,
    }),
  );

  let _customModel = customModel || '';

  if (_customModel && !_customModel.startsWith('projects/')) {
    _customModel = `projects/${projectId}/locations/${region}/endpoints/${_customModel}`;
  }

  asyncOperations.push(
    teamData.saveTeamSettingsObj({
      req,
      settingKey: CUSTOM_LLM_SETTINGS_KEY,
      entryId,
      data: {
        id: entryId,
        name,
        provider,
        features,
        tags: [provider],
        settings: {
          foundationModel,
          customModel: _customModel,
          region,
          projectId,
          jsonCredentialsName,
        },
      },
    }),
  );

  try {
    await Promise.all(asyncOperations);

    return { data: { id: entryId, name, provider } };
  } catch (error) {
    console.error('Error saving VertexAI model:', error?.message);
    throw error;
  }
}

async function _getBedrockModel(params: AuthInfo & { name: string; req: Request }) {
  const { teamId, name, req } = params;
  const accessToken = req?.user?.accessToken;
  const idToken = req?.session?.idToken;

  try {
    const modelInfo = (await getCustomLLMByName(req, name)) as CustomLLMInfo;

    const keyIDName = modelInfo?.settings?.keyIDName;
    const secretKeyName = modelInfo?.settings?.secretKeyName;
    const sessionKeyName = modelInfo?.settings?.sessionKeyName;

    const keys = [keyIDName, secretKeyName, sessionKeyName];
    const keyEntries = await vault.getMultiple(
      {
        req,
        team: teamId,
        keyNames: keys,
      },
      accessToken,
      idToken,
    );

    return {
      data: {
        ...modelInfo,
        settings: {
          ...modelInfo?.settings,
          keyId: keyEntries[keyIDName]?.key,
          secretKey: keyEntries[secretKeyName]?.key,
          sessionKey: keyEntries[sessionKeyName]?.key,
        },
      },
    };
  } catch (error) {
    throw error;
  }
}

async function _getVertexAIModel(params: AuthInfo & { name: string; req: Request }) {
  const { accessToken, idToken, teamId, name, req } = params;

  try {
    const modelInfo = (await getCustomLLMByName(req, name)) as CustomLLMInfo;

    const jsonCredentialsName = modelInfo?.settings?.jsonCredentialsName;

    const keyEntries = await vault.getMultiple(
      {
        req,
        team: teamId,
        keyNames: [jsonCredentialsName],
      },
      accessToken,
      idToken,
    );

    return {
      data: {
        ...modelInfo,
        settings: {
          ...modelInfo?.settings,
          jsonCredentials: keyEntries[jsonCredentialsName]?.key,
        },
      },
    };
  } catch (error) {
    throw error;
  }
}
//#endregion - Provider Specific Functions

export const customLLMHelper = {
  saveCustomLLM,
  deleteCustomLLM,
  getCustomLLMWithCredentials,
  getCustomLLMByName,
  getCustomLLMByEntryId,
};
