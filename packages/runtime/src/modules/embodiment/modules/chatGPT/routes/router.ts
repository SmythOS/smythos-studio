import express from 'express';

import { ChatGPTRole } from '@smythos/server-common';

import { constructServerUrl } from '@embodiment/helpers/openapi-adapter.helper';

const router = express.Router();

// Create ChatGPTRole instance
const chatGPTRole = new ChatGPTRole([], {
  serverOrigin: (req: express.Request) => {
    const domain = req.hostname;
    const serverOrigin = constructServerUrl(domain);
    return serverOrigin;
  },
});

// Mount ChatGPTRole
chatGPTRole.mount(router);

export { router as chatGPTRouter };
