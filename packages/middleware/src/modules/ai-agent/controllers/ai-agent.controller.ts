import { AiAgentSettings, AiAgentState } from '@prisma/client';
import { Response } from 'express';
import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../types';
import ApiError from '../../../utils/apiError';
import errKeys from '../../../utils/errorKeys';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';
import { teamService } from '../../team/services';
import { agentDeploymentsService, aiAgentChatsService, aiAgentService, modelAgentService } from '../services';
import { checkAgentExistsOrThrow } from '../services/ai-agent.service';

export const getModelAgents: ExpressHandler<null, any> = async (req, res: Response) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const agents = await modelAgentService.listModelAgents(teamId);

  return res.status(httpStatus.OK).json({
    message: 'Model Agents retrieved successfully',
    agents,
  });
};

export const getAiAgents: ExpressHandler<null, any> = async (req, res: Response) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const { includeSettings, contributors, agentActivity, page, limit, search, sortField, order } = req.query;

  const { agents, total } = await aiAgentService.getAllAiAgents({
    teamId,
    include: {
      includeSettings: includeSettings === 'true',
      contributors: contributors === 'true',
      agentActivity: agentActivity === 'true',
    },
    pagination: {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    },

    sort: {
      field: sortField as any,
      order: order as any,
    },
    searchTerm: search as string | undefined,
  });

  return res.status(httpStatus.OK).json({
    message: 'Ai Agents retrieved successfully',
    agents,
    total,
  });
};

export const postSaveAgent: ExpressHandler<
  {
    id: string | undefined;
    name: string;
    description: string | undefined;
    data: object;
    lockId: string | undefined;
    spaceId: string | undefined;
  },
  { agent: any }
> = async (req, res) => {
  const { id, name, data, lockId, description, spaceId } = req.body;

  const teamId = authExpressHelpers.getTeamId(res);
  const parentTeamId = authExpressHelpers.getParentTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const agent = await aiAgentService.saveAgent({
    aiAgentId: id,
    data: {
      name,
      json: data,
      description,
    },
    teamId,
    parentTeamId,
    userId,
    lockId,
    spaceId,
  });

  res.status(httpStatus.OK).json({
    message: 'Agent saved successfully',
    agent,
  });
};

export const getAgentById: ExpressHandler<
  {},
  {
    agent: {
      name: string;
      updatedAt: Date;
      data: any;
      domain: any;
      [key: string]: any;
    };
  }
> = async (req, res) => {
  const { agentId } = req.params;
  const { include } = req.query;
  const includeArray: string[] = include ? (include as string).split(',') : [];
  const teamId = authExpressHelpers.getTeamId(res);
  const parentTeamId = authExpressHelpers.getParentTeamId(res);

  //* Special case for injecting model agents lazily (https://app.clickup.com/t/86et3e213)
  if (modelAgentService.isModelAgentId(agentId, teamId)) {
    console.log(`Acessing model agent with id ${agentId}`);
    const modelAgent = await modelAgentService.getModelAgentById(agentId, teamId, parentTeamId, { include: includeArray });
    return res.status(httpStatus.OK).json({
      message: 'Agent retrieved successfully',
      agent: modelAgent,
    });
  }

  const agent = await aiAgentService.getAgentById(agentId, null, {
    include: includeArray,
    anonymous: true,
  });

  const agentTeamId = (agent?.data as { teamId: string })?.teamId;

  const userId = authExpressHelpers.getUserId(res);

  const isDifferentTeam = agentTeamId && teamId && agentTeamId !== teamId;
  if (isDifferentTeam) {
    const hasAccess = await teamService.isUserPartOfTeam(userId, agentTeamId);

    if (!hasAccess) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found', errKeys.NOT_ALLOWED_TO_ACCESS_AGENT);
    }

    throw new ApiError(httpStatus.NOT_FOUND, 'Agent not found', `DIFFERENT_TEAM_${agentTeamId}`);
  }

  res.status(httpStatus.OK).json({
    message: 'Agent retrieved successfully',
    agent,
  });
};

export const accquireAgentLock: ExpressHandler<
  {
    agentId: string;
  },
  {
    lock: any;
  }
> = async (req, res) => {
  const { agentId } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const lock = await aiAgentService.accquireAgentLock({
    aiAgentId: agentId,
    teamId,
    userId,
  });

  res.status(httpStatus.OK).json({
    message: 'Agent lock acquired successfully',
    lock,
  });
};

export const releaseAgentLock: ExpressHandler<
  {
    agentId: string;
    lockId: string;
  },
  {}
> = async (req, res) => {
  const { agentId, lockId } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  await aiAgentService.releaseAgentLock({
    aiAgentId: agentId,
    teamId,
    lockId,
  });

  res.status(httpStatus.OK).json({
    message: 'Agent lock released successfully',
  });
};

export const sendAgentLockBeat: ExpressHandler<
  {
    agentId: string;
    lockId: string;
  },
  {}
> = async (req, res) => {
  const { agentId, lockId } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  console.log('teamId', teamId);

  await aiAgentService.beatAgentLock({
    aiAgentId: agentId,
    teamId,
    lockId,
  });

  res.status(httpStatus.OK).json({
    message: 'Agent lock beat sent successfully',
  });
};
export const getAgentLockStatus: ExpressHandlerWithParams<
  {
    agentId: string;
  },
  {},
  {
    status: any;
  }
> = async (req, res) => {
  const { agentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  const status = await aiAgentService.getAgentLockStatus({
    aiAgentId: agentId,
    teamId,
  });

  res.status(httpStatus.OK).json({
    message: 'Agent lock status sent successfully',
    status,
  });
};

export const deleteAgent: ExpressHandlerWithParams<{ agentId: string }, {}, {}> = async (req, res) => {
  const { agentId: id } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  await aiAgentService.deleteAgent(id, teamId);

  res.status(httpStatus.OK).json({
    message: 'Agent deleted successfully',
  });
};

// AI AGENTS STATE

export const getState: ExpressHandlerWithParams<
  {
    agentId: string;
    key: string;
  },
  {},
  {
    state: {
      key: string;
      value: string;
    };
  }
> = async (req, res) => {
  const { agentId, key } = req.params;
  await checkAgentExistsOrThrow(agentId, null, { anonymous: true });

  const state = await aiAgentService.getState(agentId, key);

  res.status(httpStatus.OK).json({
    message: 'States retrieved successfully',
    state,
  });
};

export const createState: ExpressHandler<
  {
    agentId: string;
    key: string;
    value: string;
  },
  {
    state: AiAgentState;
  }
> = async (req, res) => {
  const { agentId } = req.params;
  const { key, value } = req.body;

  const state = await aiAgentService.createState(agentId, key, value);

  res.status(httpStatus.OK).json({
    message: 'State created successfully',
    state,
  });
};

export const deleteState: ExpressHandlerWithParams<
  {
    agentId: string;
    key: string;
  },
  {},
  {}
> = async (req, res) => {
  const { agentId, key } = req.params;

  await aiAgentService.deleteState(agentId, key);

  res.status(httpStatus.OK).json({
    message: 'State deleted successfully',
  });
};

// AGENT settings

export const getAgentSettings: ExpressHandlerWithParams<
  { agentId: string },
  {},
  {
    settings: AiAgentSettings[];
  }
> = async (req, res) => {
  const { agentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);
  await checkAgentExistsOrThrow(agentId, teamId);

  const settings = await aiAgentService.getAgentSettings(agentId, teamId);
  return res.json({
    message: 'Settings retrieved successfully',
    settings,
  });
};

export const getAgentSetting: ExpressHandlerWithParams<
  {
    key: string;
    agentId: string;
  },
  {},
  {
    setting: AiAgentSettings;
  }
> = async (req, res) => {
  const { key, agentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  await checkAgentExistsOrThrow(agentId, teamId);
  const setting = await aiAgentService.getAgentSetting(agentId, key, teamId);
  res.json({
    message: 'Setting retrieved successfully',
    setting,
  });
};

export const createAgentSetting: ExpressHandler<
  {
    key: string;
    value: string;
  },
  {
    setting: AiAgentSettings;
  }
> = async (req, res) => {
  const { key, value } = req.body;
  const { agentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  await checkAgentExistsOrThrow(agentId, teamId);

  const newSetting = await aiAgentService.createAgentSetting(agentId, key, value, teamId);
  res.json({
    message: 'Setting updated successfully',
    setting: newSetting,
  });
};

export const deleteAgentSetting: ExpressHandlerWithParams<
  {
    key: string;
    agentId: string;
  },
  {},
  {}
> = async (req, res) => {
  const { key, agentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  await checkAgentExistsOrThrow(agentId, teamId);

  await aiAgentService.deleteAgentSetting(agentId, key, teamId);
  res.json({
    message: 'Setting deleted successfully',
  });
};

// AGENT DEPLOYMENT

export const createDeployment: ExpressHandler<
  {
    version?: string | null;
    agentId: string;
    releaseNotes?: string | null;
  },
  {
    deployment: any;
  }
> = async (req, res) => {
  const { version: unformattedVersion, agentId, releaseNotes } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);

  const newDeployment = await agentDeploymentsService.createDeployment({
    aiAgentId: agentId,
    unformattedVersion,
    releaseNotes,
    teamId,
  });

  res.status(httpStatus.CREATED).json({
    deployment: newDeployment,
  });
};

export const getDeploymentById: ExpressHandlerWithParams<
  {
    deploymentId: string;
  },
  {},
  {
    deployment: any;
  }
> = async (req, res) => {
  const { deploymentId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);

  const deployment = await agentDeploymentsService.getDeploymentById(deploymentId, teamId);

  res.status(httpStatus.OK).json({
    deployment,
  });
};

export const getDeployments: ExpressHandlerWithParams<
  {
    agentId: string;
  },
  {},
  {
    deployments: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const { agentId } = req.params;
  const { include } = req.query;
  const includeArray: string[] = include ? (include as string).split(',') : [];

  const deployments = await agentDeploymentsService.listDeploymentsByAgentId({
    teamId,
    aiAgentId: agentId,
    include: includeArray,
  });

  res.status(httpStatus.OK).json({
    deployments,
  });
};

export const getLatestDeployment: ExpressHandlerWithParams<
  {
    agentId: string;
  },
  {},
  {
    deployment: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const { agentId } = req.params;

  const deployment = await agentDeploymentsService.getLatestAgentDeployment({
    teamId,
    aiAgentId: agentId,
  });

  res.status(httpStatus.OK).json({
    deployment,
  });
};

// #region Agent Conversations
export const getTeamConversations: ExpressHandler<
  {},
  {
    data: any;
  }
> = async (req, res) => {
  const { isOwner, page, limit, sortField, order } = req.query as { [key: string]: any };
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const conversationsData = await aiAgentChatsService.getConversations({
    teamId,
    userId,
    query: {
      isOwner: isOwner == 'true',
    },

    sort: {
      order: order as any,
      field: sortField as any,
    },

    pagination: {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    },
  });

  res.status(httpStatus.OK).json({
    data: conversationsData,
  });
};

export const getMyConversations: ExpressHandler<
  {},
  {
    conversations: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const conversations = await aiAgentChatsService.getMyConversations({
    teamId,
    userId,

    pagination: {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    },
  });

  res.status(httpStatus.OK).json({
    conversations,
  });
};

export const createTeamConversation: ExpressHandler<
  {
    conversation: any;
  },
  {
    conversation: any;
  }
> = async (req, res) => {
  const { conversation: conversationData } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const conversation = await aiAgentChatsService.createTeamConversation({
    teamId,
    userId,
    data: conversationData,
  });

  res.status(httpStatus.CREATED).json({
    conversation,
  });
};

export const updateTeamConversation: ExpressHandlerWithParams<
  {
    conversationId: string;
  },
  {
    conversation: any;
  },
  {}
> = async (req, res) => {
  const { conversationId } = req.params;
  const { conversation } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  await aiAgentChatsService.updateTeamConversation({
    teamId,
    userId,
    conversationId,
    data: conversation,
  });

  res.status(httpStatus.OK).json({
    message: 'Conversation updated successfully',
  });
};

export const deleteTeamConversation: ExpressHandlerWithParams<
  {
    conversationId: string;
  },
  {},
  {}
> = async (req, res) => {
  const { conversationId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  await aiAgentChatsService.deleteTeamConversation({
    teamId,
    userId,
    conversationId,
  });

  res.status(httpStatus.OK).json({
    message: 'Conversation deleted successfully',
  });
};

export const getTeamConversationById: ExpressHandlerWithParams<
  {
    conversationId: string;
  },
  {},
  {
    conversation: any;
  }
> = async (req, res) => {
  const { conversationId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const conversation = await aiAgentChatsService.getTeamConversationById({
    teamId,
    userId,
    conversationId,
  });

  res.status(httpStatus.OK).json({
    conversation,
  });
};

// # endregion
