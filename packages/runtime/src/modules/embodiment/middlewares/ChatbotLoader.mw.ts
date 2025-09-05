import { Agent, Logger } from '@smythos/sre';

import Chatbot from '../services/Chatbot.class';
import ApiError from '../utils/apiError';

const console = Logger('[Embodiment] Middleware: Chatbot Loader');

// TODO : handle cache TTL

const chatbotCache = { 0: 1 };
export default async function ChatbotLoader(req, res, next) {
  console.log('ChatbotLoader');
  const agent: Agent = req._agent;
  if (!agent) return next();
  try {
    if (chatbotCache[agent.id] && !agent.usingTestDomain) {
      const chatBotData = chatbotCache[agent.id];
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
      chatbotCache[agent.id] = chatbot.serialize(); // we cannot store an object in session, so we serialize it
    }
  } catch (error) {
    if (error.errKey == 'MODEL_NOT_SUPPORTED') {
      console.warn(error.message);
      return next(new ApiError(400, error.message, error.errKey));
    }
  }

  next();
}
