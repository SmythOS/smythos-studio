import Joi from 'joi';

export const postEmbodiment = {
  body: Joi.object({
    type: Joi.string().required(),
    properties: Joi.object().required(),
    aiAgentId: Joi.string().required(),
  }),
};

export const getEmbodiment = {
  params: Joi.object({
    embodimentId: Joi.number().required(),
  }),
};
export const getEmbodimentsByAgentId = {
  query: Joi.object({
    aiAgentId: Joi.string().required(),
  }),
};

export const updateEmbodiment = {
  body: Joi.object({
    type: Joi.string().required(),
    properties: Joi.object().required(),
    embodimentId: Joi.number().required(),
  }),
};

export const deleteEmbodiment = {
  params: Joi.object({
    embodimentId: Joi.number().required(),
  }),
};
