import multer from "multer";

import Chatbot from "@embodiment/modules/chatbot/services/Chatbot.class";
import { Agent } from "@smythos/sre";

declare global {
  namespace Express {
    interface Request {
      _agent_authinfo: any; // Define your custom property here
      _chatbot: Chatbot;
      _agent: Agent;
      session: any;
      files: multer.File[];
      sessionID: string;
    }
  }
}
