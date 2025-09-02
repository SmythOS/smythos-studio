import Joi from 'joi';

export const postDomain = {
  body: Joi.object({
    name: Joi.string().required(),
  }),
};

export const putUpdateDomain = {
  body: Joi.object({
    name: Joi.string().required(),
    data: Joi.object({
      aiAgentId: Joi.string().required().optional().allow(null).allow(''),
    }),
  }),
};

export const queryDomain = {
  body: Joi.object({
    name: Joi.string().required(),
  }),
};
export const deleteDomain = {
  body: Joi.object({
    name: Joi.string().required(),
  }),
};

export const queryEndpoint = {
  body: Joi.object({
    path: Joi.string().required(),
    domainName: Joi.string().required(),
    method: Joi.string().required().valid('GET', 'POST', 'PUT', 'DELETE'),
  }),
};

export const deleteEndpoint = {
  body: Joi.object({
    path: Joi.string().required(),
    domainName: Joi.string().required(),
    // methods allowed: GET, POST, PUT, DELETE
    method: Joi.string().required().valid('GET', 'POST', 'PUT', 'DELETE'),
  }),
};

export const postEndpoint = {
  body: Joi.object({
    path: Joi.string().required(),
    data: Joi.object({
      method: Joi.string().required().valid('GET', 'POST', 'PUT', 'DELETE'),
      componentId: Joi.any().required(),
    }).required(),
    agentId: Joi.string().required(),
    domainName: Joi.string().required(),
  }),
};

export const getDomainsM2M = {
  query: Joi.object({
    verified: Joi.boolean().optional(),
    name: Joi.string().optional().allow(null).allow(''),
    aiAgentId: Joi.string().optional().allow(null).allow(''),
  }),
};
