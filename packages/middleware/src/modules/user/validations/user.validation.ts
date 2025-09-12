import Joi from 'joi';

export const createSetting = {
  body: Joi.object({
    settingKey: Joi.string().required(),
    settingValue: Joi.string().required(),
  }),
};

export const getSetting = {
  params: Joi.object({
    settingKey: Joi.string().required(),
  }),
};

export const deleteSetting = {
  params: Joi.object({
    settingKey: Joi.string().required(),
  }),
};

export const createSettingM2M = {
  params: Joi.object({
    userId: Joi.number().required(),
  }),
  body: Joi.object({
    settingKey: Joi.string().required(),
    settingValue: Joi.string().required(),
  }),
};

export const getSettingM2M = {
  params: Joi.object({
    settingKey: Joi.string().required(),
    userId: Joi.number().required(),
  }),
};

export const deleteSettingM2M = {
  params: Joi.object({
    settingKey: Joi.string().required(),
    userId: Joi.number().required(),
  }),
};

export const getSettingsM2M = {
  params: Joi.object({
    userId: Joi.number().required(),
  }),
};

export const getUserM2M = {
  params: Joi.object({
    userId: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  }),
};
