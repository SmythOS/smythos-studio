import { NextFunction, Request, Response } from 'express';
import LLMHelper from '../services/LLMHelper';

export async function llmModelsLoaderMiddleware(req: Request, res: Response, next: NextFunction) {
  res.locals.LLMModels = await LLMHelper.getUserLLMModels(req).catch((error) => {
    console.error('Error fetching LLM models:', error?.message);
    return [];
  });

  next();
}
