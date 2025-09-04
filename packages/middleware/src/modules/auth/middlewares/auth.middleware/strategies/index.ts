import DefaultM2MAuth from './defaultM2MAuth.verification';
import DefaultUIAuth from './defaultUIAuth.verification';

export interface AuthStrategy {
  name: string;
  verifyToken: (token: string) => Promise<{
    error?: string | null;
    data?: any | null;
    success: boolean;
  }>;
}

const tokenVerStrategies = {
  defaultUIAuth: new DefaultUIAuth(),
  defaultM2MAuth: new DefaultM2MAuth(),
};

export default tokenVerStrategies;
