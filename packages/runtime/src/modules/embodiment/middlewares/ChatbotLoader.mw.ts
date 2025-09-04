import { Agent } from '@smythos/sre';
import Chatbot from '../services/Chatbot.class';
import ApiError from '../utils/apiError';
//TODO : handle cache TTL

const __chatbot_cache = { 0: 1 };
export default async function ChatbotLoader(req, res, next) {
  console.log('ChatbotLoader');
  const agent: Agent = req._agent;
  if (!agent) return next();
  try {
    if (__chatbot_cache[agent.id] && !agent.usingTestDomain) {
      const chatBotData = __chatbot_cache[agent.id];
      if (chatBotData.agentVersion == agent.version) {
        console.log(`Chatbot loaded from cache, domain=${chatBotData.domain} version=${chatBotData.version}`);
        const chatbot = new Chatbot(req);
        chatbot.deserialize(chatBotData);
        req._chatbot = chatbot;
      }
    }
    if (!req._chatbot) {
      const chatbot = new Chatbot(req);
      req._chatbot = chatbot;

      await req._chatbot.init();
      __chatbot_cache[agent.id] = chatbot.serialize(); //we cannot store an object in session, so we serialize it
    }
  } catch (error) {
    if (error.errKey == 'MODEL_NOT_SUPPORTED') {
      console.warn(error.message);
      return next(new ApiError(400, error.message, error.errKey));
    }
  }

  next();
}
