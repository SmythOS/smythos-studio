import { AiAgent, AiPlugin, WaitList } from '../src/utils/models';
import { AiPluginJson } from './external-files.type';

export type WaitListReq = Omit<WaitList, 'id' | 'createdAt'>;
export type WaitListRes = {
  message: string;
};

export type PostAiPluginReq = {
  url: string;
};
export type PostAiPluginRes = {
  message: string;
  id: string | number;
};

export type GetAiPluginParams = {
  pluginId: string;
};

export type GetDataSourceParams = {
  dataSourceId: string;
};

export type GetAiPluginRes = Pick<AiPlugin, 'name' | 'description' | 'iconUrl'> & {
  json: AiPluginJson;
  openAiContent: string;
  readmeMD: string;
};

export interface ListAiPluginsReq {
  page: number;
  limit: number;
  search: string;
}
export interface ListAiPluginsRes {
  plugins: Pick<AiPlugin, 'id' | 'name' | 'description' | 'iconUrl'>[];
  total: number;
}

export type AiAgentReq = Omit<AiAgent, 'id' | 'createdAt'>;
export type AiAgentRes = {
  id: number;
};

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
