import Joi from 'joi';

export const chatValidations = {
    chatCompletion: {
        headers: Joi.object({
            authorization: Joi.string().required()
        }).required(),
        query: Joi.object({
            include_status: Joi.boolean().optional(),
        }),
        body: Joi.object({
            messages: Joi.array()
                .items(
                    Joi.object({
                        role: Joi.string().valid('system', 'user', 'assistant').required(),
                        content: Joi.string().allow(null).required(),
                    })
                )
                .required(),
            model: Joi.string().required(),
            stream: Joi.boolean().optional(),
        }).required(),
    },
};
