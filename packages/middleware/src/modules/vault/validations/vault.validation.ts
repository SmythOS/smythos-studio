import Joi from 'joi';

export const createVaultSecret = {
    body: Joi.object({
        teamId: Joi.string().alphanum().required(),
        secretId: Joi.string().required(),
        key: Joi.string()
            .required()
            .max(300),
        value: Joi.string().required().max(10000),
        metadata: Joi.object().optional()
    })
}

export const updateSecretMetadata = {
    body: Joi.object({
        metadata: Joi.object().required()
    })
}

export const syncVaultSecret = {
    body: Joi.object({
        teamId: Joi.string().alphanum().required(),
        secrets: Joi.array().items(Joi.object().keys({
            secretId: Joi.string().required(),
            key: Joi.string()
                .required()
                .max(300)
            ,
            value: Joi.string().required().max(10000),
            metadata: Joi.object().optional()
        })).required(),
    })
}