import domains from './domains';
import vectors from './vectors';
import agents from './agents';
import agentSettings from './agent-settings';
import templates from './templates';
import teams from './teams';
import user from './user';
import builder from './builder';
import vault from './vault';
import plans from './plans';
import quota from './quota';
import account from './account';
import aiagents from './aiagents';
import logs from './logs';
import { chatRouter } from './chat';
import { onboardRouter } from './onboard';
import collection from './collection';
import subteams from './subteams';

const routers = {
  domains,
  vectors,
  agents,
  templates,
  teams,
  user,
  builder,
  vault,
  plans,
  quota,
  account,
  aiagents,
  agent_settings: agentSettings,
  logs,
  chat: chatRouter,
  onboard: onboardRouter,
  collection,
  subteams,
};

export default routers;
