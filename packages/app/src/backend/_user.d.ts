// declare (req._user = req.user.claims;) so that express.Request can access the user claims.

declare namespace Express {
  export interface Request {
    _user: any;
    _team: any;
    session: any;
    _usageLimitMessage: string;
  }
}
