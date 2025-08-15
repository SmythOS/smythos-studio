import account from './account';
import agentSettings from './agent-settings';
import agents from './agents';
import aiagents from './aiagents';
import builder from './builder';
import { chatRouter } from './chat';
import collection from './collection';
import logs from './logs';
import { onboardRouter } from './onboard';
import plans from './plans';
import quota from './quota';
import teams from './teams';
import templates from './templates';
import user from './user';
import vault from './vault';

const routers = {
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
};

export default routers;
