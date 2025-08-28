import { Agent } from 'smyth-runtime';
import multer from 'multer';

declare global {
    namespace Express {
        interface Request {
            _agent_authinfo: any; // Define your custom property here
            _chatbot: any;
            _agent: Agent;
            session: any;
            files: multer.File[];
            sessionID: string;
        }
    }
}
