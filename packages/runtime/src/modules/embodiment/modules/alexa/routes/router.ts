import express from 'express';

import { AlexaRole } from '@smythos/server-common';

import { constructServerUrl } from '@embodiment/helpers/openapi-adapter.helper';

const router = express.Router();

// Create Alexa Role instance
const alexaRole = new AlexaRole([], {
  serverOrigin: (req: express.Request) => {
    const domain = req.hostname;
    const serverOrigin = constructServerUrl(domain);
    return serverOrigin;
  },
});

// Mount Alexa Role
alexaRole.mount(router);

export { router as alexaRouter };
