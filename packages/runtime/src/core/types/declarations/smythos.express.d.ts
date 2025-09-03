import multer from "multer";

import { Agent } from "@smythos/sre";

import Chatbot from "@embodiment/services/Chatbot.class";

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
