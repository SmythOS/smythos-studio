import JwtM2M from './jwtM2M.verfication';
import UserToken from './userToken.veification';

export interface AuthStrategy {
  name: string;
  verifyToken: (token: string) => Promise<{
    error?: string | null;
    data?: any | null;
    success: boolean;
  }>;
}

const tokenVerStrategies = {
  userToken: new UserToken(),
  jwtM2M: new JwtM2M(),
};

export default tokenVerStrategies;
