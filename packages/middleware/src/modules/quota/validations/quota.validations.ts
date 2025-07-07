import Joi from 'joi';

export const getAgentTasksUsageByIdM2M = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
};

export const getAgentTasksUsageWithinM2M = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
  query: Joi.object({
    startDate: Joi.date().optional().allow(null),
    endDate: Joi.date().optional().allow(null),
  }),
};

export const getTeamTasksUsageByIdM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
};

export const getTeamTasksUsageWithinM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
  query: Joi.object({
    startDate: Joi.date().optional().allow(null),
    endDate: Joi.date().optional().allow(null),
  }),
};

export const consumeTeamTasksByAgentIdM2M = {
  params: Joi.object({
    agentId: Joi.string().required(),
  }),
  body: Joi.object({
    day: Joi.date().required(),
    number: Joi.number().required(),
  }),
};

export const getMonthlyLLMTokensAndApiRequestsUsage = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
  query: Joi.object({
    date: Joi.date().optional(), // Validate optional `date` as a query parameter
  }),
};

export const trackLLMTokensAndApiRequestsUsage = {
  params: Joi.object({
    agentId: Joi.string().required(),
    teamId: Joi.string().required(),
  }),
  body: Joi.object({
    date: Joi.date(),
    units: Joi.number().required(),
    class: Joi.string().required(),
    sourceId: Joi.string().required(),
    userKey: Joi.boolean().required(),
  }),
};

export const getTotalUsageForBillingCycleM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
};

export const getTotalUsageForBillingCycle = {
  params: Joi.object({}),
};
