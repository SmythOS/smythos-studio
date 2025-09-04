import { NextFunction, Request, Response } from 'express';

export const defaultAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // prefill all info needed by app in req object
  req.user = {
    id: '1',
    // @ts-ignore
    email: 'admin@smythos.com',
    role: 'admin',
    accessToken: 'UI_AUTH_TOKEN',
    isAuthenticated: true,
    claims: {
      email: 'admin@smythos.com',
      id: '1',
      sub: '1',
    },
  };

  console.log('SET THE req._user to: ', req._user);
  console.log('SET THE req.user to: ', req.user);
  next();
};
