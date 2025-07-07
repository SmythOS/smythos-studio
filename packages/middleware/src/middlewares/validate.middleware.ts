import { NextFunction } from 'express';
import Joi, { ObjectSchema, Schema } from 'joi';
import httpStatus from 'http-status';
import { pick } from '../utils/pick';
import ApiError from '../utils/apiError';

type SchemaObject = {
  body?: ObjectSchema<any> | Schema;
  query?: ObjectSchema<any> | Schema;
  params?: ObjectSchema<any> | Schema;
};

const validate = (schema: SchemaObject) => (req: any, _res: any, next: NextFunction) => {
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map(details => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  Object.assign(req, value);
  return next();
};

export { validate };
