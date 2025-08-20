import { AiAgent, AiAgentSettings, AiAgentState } from '@prisma/client';
import httpStatus from 'http-status';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../../types';
import { agentDeploymentsService, aiAgentChatsService, aiAgentService } from '../../services';

export const getAgentById: ExpressHandler<
  // IN
  {},
  {
    agent: {
      name: string;
      updatedAt: Date;
      data: any;
      [key: string]: any;
    };
  }
> = async (req, res) => {
  const { agentId } = req.params;
  const { include } = req.query;
  const includeArray: string[] = include ? (include as string).split(',') : [];

  const agent = await aiAgentService._getAgentWithSaltById(agentId, { include: includeArray });

  res.status(httpStatus.OK).json({
    message: 'Agent retrieved successfully',
    agent,
  });
};

export const getAgentByDomain: ExpressHandler<
  // IN
  {},
  {
    agent: AiAgent;
  }
> = async (req, res) => {
  const { domainName } = req.query;

  const agent = await aiAgentService.getAgentByDomain(domainName as string);

  res.status(httpStatus.OK).json({
    message: 'Agent retrieved successfully',
    agent,
  });
};

// AI AGENTS STATE

export const getState: ExpressHandlerWithParams<
  // IN
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
  await aiAgentService.checkAgentExistsOrThrow(agentId, null, { anonymous: true });

  const state = await aiAgentService.getState(agentId, key);

  res.status(httpStatus.OK).json({
    message: 'States retrieved successfully',
    state,
  });
};

export const createState: ExpressHandler<
  // IN
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
  // IN
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

export const getStates: ExpressHandlerWithParams<
  // IN
  {
    agentId: string;
  },
  {},
  {
    states: AiAgentState[];
  }
> = async (req, res) => {
  const { agentId } = req.params;
  await aiAgentService.checkAgentExistsOrThrow(agentId, null, { anonymous: true });

  const states = await aiAgentService.getStates(agentId);

  res.status(httpStatus.OK).json({
    message: 'States retrieved successfully',
    states,
  });
};

// AI AGENTS DEPLOYMENT

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

  const deployment = await agentDeploymentsService.getDeploymentById(deploymentId, undefined, {
    anonymous: true,
  });

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
  const { agentId } = req.params;

  const deployments = await agentDeploymentsService.listDeploymentsByAgentId({
    teamId: undefined,
    aiAgentId: agentId,
    options: {
      anonymous: true,
    },
  });

  res.status(httpStatus.OK).json({
    deployments,
  });
};

export const getDeploymentByMajorMinorVersion: ExpressHandlerWithParams<
  {
    agentId: string;
    majorVersion: string;
    minorVersion: string;
  },
  {},
  {
    deployment: any;
  }
> = async (req, res) => {
  const { agentId, majorVersion, minorVersion } = req.params;

  const deployment = await agentDeploymentsService.getDeploymentByMajorMinorVersion(agentId, majorVersion, minorVersion, undefined, {
    anonymous: true,
  });

  res.status(httpStatus.OK).json({
    deployment,
  });
};

export const getAgentSettings: ExpressHandlerWithParams<
  { agentId: string },
  {},
  {
    settings: AiAgentSettings[];
  }
> = async (req, res) => {
  const { agentId } = req.params;
  await aiAgentService.checkAgentExistsOrThrow(agentId, undefined, { anonymous: true });

  const settings = await aiAgentService.getAgentSettings(agentId, undefined, { anonymous: true });
  return res.json({
    message: 'Settings retrieved successfully',
    settings,
  });
};

// #region Agent Conversations

export const getConversationById: ExpressHandlerWithParams<
  {
    conversationId: string;
  },
  {},
  {
    conversation: any;
  }
> = async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await aiAgentChatsService.getConversationByIdM2M(conversationId);

  res.status(httpStatus.OK).json({
    conversation,
  });
};

export const getConversations: ExpressHandler<
  {},
  {
    conversations: any;
  }
> = async (req, res) => {
  const { ownerId, agentId } = req.query as { [key: string]: string };

  const conversations = await aiAgentChatsService.getConversationsM2M({
    query: {
      ownerId: !Number.isNaN(+ownerId) ? +ownerId : undefined,
      agentId,
    },
  });

  res.status(httpStatus.OK).json({
    conversations,
  });
};

export const getConversationsByAgentId: ExpressHandlerWithParams<
  {
    agentId: string;
  },
  {},
  {
    conversations: any;
  }
> = async (req, res) => {
  const { agentId } = req.params;

  const conversations = await aiAgentChatsService.getConversationsByAgentIdM2M(agentId);

  res.status(httpStatus.OK).json({
    conversations,
  });
};

export const createConversation: ExpressHandler<
  {
    conversation: any;
  },
  {
    conversation: any;
  }
> = async (req, res) => {
  const { conversation } = req.body;

  const newConversation = await aiAgentChatsService.createConversationM2M(conversation);

  res.status(httpStatus.CREATED).json({
    conversation: newConversation,
  });
};

export const updateConversation: ExpressHandlerWithParams<
  {
    conversationId: string;
  },
  {
    conversation: any;
  },
  {
    conversation: any;
  }
> = async (req, res) => {
  const { conversationId } = req.params;
  const { conversation } = req.body;

  const updated = await aiAgentChatsService.updateConversationM2M(conversationId, conversation);

  res.status(httpStatus.OK).json({
    message: 'Agent conversation updated successfully',
    conversation: updated,
  });
};

export const deleteConversation: ExpressHandlerWithParams<
  {
    conversationId: string;
  },
  {},
  {}
> = async (req, res) => {
  const { conversationId } = req.params;

  await aiAgentChatsService.deleteConversationM2M(conversationId);

  res.status(httpStatus.OK).json({
    message: 'Agent conversation deleted successfully',
  });
};

// #endregion Agent Conversations

export const getTeamAgents: ExpressHandlerWithParams<
  {
    teamId: string;
  },
  {},
  {
    agents: Array<any>;
    total: number;
  }
> = async (req, res) => {
  const { teamId } = req.params;
  const { deployedOnly, includeData } = req.query;

  const { agents, total } = await aiAgentService.getTeamAgents({
    teamId,
    deployedOnly: deployedOnly === true,
    pagination: {
      page: Number(req.query.page) || undefined,
      limit: Number(req.query.limit) || undefined,
    },
    includeData: includeData === true,
  });

  res.status(httpStatus.OK).json({
    agents,
    total,
  });
};
