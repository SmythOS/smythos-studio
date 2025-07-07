import { query } from 'express';
import Joi from 'joi';

export const postAiAgent = {
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string(),
  }),
};

export const verifyDomain = {
  body: Joi.object({
    domain: Joi.string()
      .regex(/^(?:[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*\.)+[a-zA-Z]{2,}$/)
      .message('Invalid domain format')
      .required(),
  }),
};
export const getAiAgents = {
  query: Joi.object({
    includeSettings: Joi.boolean().optional().default(false),
    contributors: Joi.boolean().optional().default(false),
    agentActivity: Joi.boolean().optional().default(false),
    page: Joi.number().optional().default(1),
    limit: Joi.number().optional().default(10),
  }),
};

export const postSaveAgent = {
  body: Joi.object({
    id: Joi.string().optional().allow(null),
    name: Joi.string().required(),
    description: Joi.string().optional().allow(null).allow(''),
    data: Joi.object().required(),
    lockId: Joi.string().optional().allow(null),
    spaceId: Joi.string().optional().allow(null),
  }),
};

export const deleteAgent = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
};

export const requestAccess = {
  body: Joi.object({
    agentId: Joi.string().required(),
    email: Joi.string().email().required(),
  }),
};

export const getAgentById = {
  query: Joi.object({
    include: Joi.string().optional().allow(null).allow(''),
  }),
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
};

// AGENT LOCKING
export const accquireAgentLock = {
  body: Joi.object({
    agentId: Joi.string().required(),
  }),
};

export const getAgentLockStatus = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
};

export const releaseAgentLock = {
  body: Joi.object({
    agentId: Joi.string().required(),
    lockId: Joi.string().required(),
  }),
};

export const sendAgentLockBeat = {
  body: Joi.object({
    agentId: Joi.string().required(),
    lockId: Joi.string().required(),
  }),
};

// AI AGENT STATE

export const createState = {
  body: Joi.object({
    key: Joi.string().required(),
    value: Joi.string().required(),
  }),
};

export const getState = {
  params: Joi.object({
    key: Joi.string().required(),
    agentId: Joi.string().required(),
  }),
};

export const deleteState = {
  params: Joi.object({
    key: Joi.string().required(),
    agentId: Joi.string().required(),
  }),
};

// AI AGENT SETTINGS

export const createAgentSetting = {
  body: Joi.object({
    key: Joi.string().required(),
    value: Joi.string().required(),
  }),
};

export const getAgentByDomain = {
  query: Joi.object({
    domainName: Joi.string().required(),
    method: Joi.any().optional(), // SHOULD BE REMOVED (BACKWARD COMPATIBILITY)
    endpointPath: Joi.any().optional(), // SHOULD BE REMOVED (BACKWARD COMPATIBILITY)
  }),
};

export const postDeployment = {
  body: Joi.object({
    // version regex should match: "1.0", "1.23"

    version: Joi.string()
      .regex(/^\d+\.\d+$/)
      .optional()
      .allow(null),

    releaseNotes: Joi.string().optional().allow(null),
    agentId: Joi.string().required(),
  }),
};

export const getDeployment = {
  params: Joi.object({
    deploymentId: Joi.string().required(),
  }),
};

export const getLatestDeployment = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
};

export const getDeploymentsByAgentId = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  query: Joi.object({
    include: Joi.string().optional().allow(null).allow(''),
  }),
};

export const getDeploymentByMajorMinorVersion = {
  params: Joi.object({
    agentId: Joi.string().required(),
    majorVersion: Joi.number().required(),
    minorVersion: Joi.number().required(),
  }),
};

export const getAgentCallLogs = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  query: Joi.object({
    sourceId: Joi.string().optional().allow(null).allow(''),
    componentId: Joi.string().optional().allow(null).allow(''),
    inputDateFrom: Joi.string().optional().allow(null).allow(''),
    inputDateTo: Joi.string().optional().allow(null).allow(''),
    outputDateFrom: Joi.string().optional().allow(null).allow(''),
    outputDateTo: Joi.string().optional().allow(null).allow(''),
    sessionID: Joi.string().optional().allow(null).allow(''),
    workflowID: Joi.string().optional().allow(null).allow(''),
    processID: Joi.string().optional().allow(null).allow(''),
    tags: Joi.string().optional().allow(null).allow(''),

    page: Joi.number().optional().default(1),
    limit: Joi.number().optional().default(50),
  }),
};

export const getAgentCallLogsSessions = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  query: Joi.object({
    page: Joi.number().optional().default(1),
    limit: Joi.number().optional().default(50),
  }),
};

export const addAgentCallLog = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  body: Joi.object({
    sourceId: Joi.string().optional().allow(null).allow(''),
    componentId: Joi.string().optional().allow(null).allow(''),
    input: Joi.alternatives().try(Joi.object(), Joi.array()).optional().allow(null),
    output: Joi.alternatives().try(Joi.object(), Joi.array()).optional().allow(null),
    inputTimestamp: Joi.date().optional().allow(null).allow(''),
    outputTimestamp: Joi.date().optional().allow(null).allow(''),
    result: Joi.string().optional().allow(null).allow(''),
    error: Joi.string().optional().allow(null).allow(''),
    domain: Joi.string().optional().allow(null).allow(''),
    inputTokens: Joi.number().optional().allow(null).allow(''),
    outputTokens: Joi.number().optional().allow(null).allow(''),
    sourceName: Joi.string().optional().allow(null).allow(''),
    componentName: Joi.string().optional().allow(null).allow(''),
    sessionID: Joi.string().optional().allow(null).allow(''),
    workflowID: Joi.string().optional().allow(null).allow(''),
    processID: Joi.string().optional().allow(null).allow(''),
    tags: Joi.string().optional().allow(null).allow(''),
  }),
};

export const updateAgentCallLog = {
  params: Joi.object({
    callId: Joi.string().required(),
  }),

  body: Joi.object({
    sourceId: Joi.string().optional().allow(null).allow(''),
    componentId: Joi.string().optional().allow(null).allow(''),
    input: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
    output: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
    result: Joi.string().optional().allow(null).allow(''),
    error: Joi.string().optional().allow(null).allow(''),
    inputTimestamp: Joi.date().optional().allow(null).allow(''),
    outputTimestamp: Joi.date().optional().allow(null).allow(''),
    domain: Joi.string().optional().allow(null).allow(''),
    inputTokens: Joi.number().optional().allow(null).allow(''),
    outputTokens: Joi.number().optional().allow(null).allow(''),
    sourceName: Joi.string().optional().allow(null).allow(''),
    componentName: Joi.string().optional().allow(null).allow(''),
    sessionID: Joi.string().optional().allow(null).allow(''),
    workflowID: Joi.string().optional().allow(null).allow(''),
    processID: Joi.string().optional().allow(null).allow(''),
    tags: Joi.string().optional().allow(null).allow(''),
  }),
};

export const createBulkCall = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
  body: Joi.object({
    rows: Joi.array().items(Joi.object()).min(1).max(4000).required(),

    componentId: Joi.string().required(),
  }),
  options: Joi.object({
    delay: Joi.number().optional().allow(null),
  }).optional(),
};

export const callSkill = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  body: Joi.object({
    componentId: Joi.string().required(),
    payload: Joi.object().optional().allow(null).allow(''),
    // only allow dev and prod, and a reg expression for matching vX.X
    version: Joi.string()
      .optional()
      .allow('dev', 'latest')
      .regex(/^v\d+\.\d+$/),
  }),
};

export const getBulkCallInfo = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  query: Joi.object({
    componentId: Joi.string().required(),
  }),
};
export const getLatestBulkCallInfo = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  query: Joi.object({
    componentId: Joi.string().required(),
  }),
};

export const stopBulkCall = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),

  query: Joi.object({
    componentId: Joi.string().required(),
  }),
};

export const getAgentByIdM2M = {
  query: Joi.object({
    include: Joi.string().optional().allow(null).allow(''),
  }),
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
};

export const getConversationByIdM2M = {
  params: Joi.object({
    conversationId: Joi.string().required(),
  }),
};

export const getConversationsM2M = {
  query: Joi.object({
    ownerId: Joi.number().optional(),
    agentId: Joi.string().optional(),
  }),
};

// export const getConversationByAgentIdM2M = {
//   params: Joi.object({
//     agentId: Joi.string().required(),
//   }),
// };

export const createConversationM2M = {
  body: Joi.object({
    conversation: Joi.object({
      label: Joi.string().optional().allow(null).allow(''),
      summary: Joi.string().optional().allow(null).allow(''),
      teamId: Joi.string().required(),
      ownerId: Joi.number().optional(),
      aiAgentId: Joi.string().required(),
      chunkSize: Joi.number().optional().allow(null),
      lastChunkID: Joi.string().optional().allow(null),
    }),
  }),
};

export const updateConversationM2M = {
  params: Joi.object({
    conversationId: Joi.string().required(),
  }),
  body: Joi.object({
    conversation: Joi.object({
      ownerId: Joi.number().optional().allow(null),
      chunkSize: Joi.number().optional().allow(null),
      lastChunkID: Joi.string().optional().allow(null),
      label: Joi.string().optional().allow(null),
      summary: Joi.string().optional().allow(null),
    }),
  }),
};

export const deleteConversationM2M = {
  params: Joi.object({
    conversationId: Joi.string().required(),
  }),
};

export const deleteConversationsByAgentIdM2M = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
};

export const getTeamConversations = {
  query: Joi.object({
    isOwner: Joi.boolean().optional().default(false),

    page: Joi.number().optional().default(1),
    limit: Joi.number().optional().default(10),

    order: Joi.string().optional().default('desc'),
    sortField: Joi.string().optional().default('createdAt'),
  }),
};
export const getMyConversations = {
  query: Joi.object({
    page: Joi.number().optional().default(1),
    limit: Joi.number().optional().default(10),
  }),
};

export const createTeamConversation = {
  body: Joi.object({
    conversation: Joi.object({
      label: Joi.string().optional().allow(null).allow(''),
      summary: Joi.string().optional().allow(null).allow(''),
      aiAgentId: Joi.string().required(),
      chunkSize: Joi.number().optional().allow(null),
      lastChunkID: Joi.string().optional().allow(null),
    }),
  }),
};

export const updateTeamConversation = {
  params: Joi.object({
    conversationId: Joi.string().required(),
  }),
  body: Joi.object({
    conversation: Joi.object({
      label: Joi.string().optional().allow(null),
      summary: Joi.string().optional().allow(null),
    }),
  }),
};

export const getTeamConversationById = {
  params: Joi.object({
    conversationId: Joi.string().required(),
  }),
};

export const deleteTeamConversation = {
  params: Joi.object({
    conversationId: Joi.string().required(),
  }),
};

export const getTeamAgents = {
  params: Joi.object().keys({
    teamId: Joi.string().required(),
  }),
  query: Joi.object().keys({
    deployedOnly: Joi.boolean().default(false),
    includeData: Joi.boolean().default(false),
    page: Joi.number().min(1),
    limit: Joi.number().min(1),
  }),
};
