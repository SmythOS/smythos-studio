import Joi from 'joi';

export const getTeamSubs = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
};
