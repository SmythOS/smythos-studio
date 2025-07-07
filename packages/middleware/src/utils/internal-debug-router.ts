import { Router } from 'express';
import ApiError from './apiError';

const internalDebugRouter = Router();

internalDebugRouter.get('/throw_err', (req, res) => {
  const { code = 500 } = req.query;
  throw new ApiError(code as number, 'This is a test error');
});

export default internalDebugRouter;
