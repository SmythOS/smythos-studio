export interface LogtoUser {
  id: string;
  username: string | null;
  email: string;
  picture: string;
  primaryEmail: string;
  primaryPhone: string | null;
  name: string | null;
  avatar: string | null;
  customData: object;
  identities: object;
  lastSignInAt: number;
  createdAt: number;
  applicationId: string | null;
  isSuspended: boolean;
}
