import account from './account';
import agentSettings from './agent-settings';
import agents from './agents';
import builder from './builder';
import { chatRouter } from './chat';
import collection from './collection';
import { onboardRouter } from './onboard';
import teams from './teams';
import user from './user';
import vault from './vault';

const routers = {
  agents,
  teams,
  user,
  builder,
  vault,
  account,
  agent_settings: agentSettings,
  chat: chatRouter,
  onboard: onboardRouter,
  collection,
};

export default routers;
