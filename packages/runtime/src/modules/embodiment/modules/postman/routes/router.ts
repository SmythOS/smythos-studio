import express from 'express';

import { PostmanRole } from '@smythos/server-common';

// Internal imports
import { constructServerUrl } from '@embodiment/helpers/openapi-adapter.helper';

const router = express.Router();

// Create Postman Role instance
const postmanRole = new PostmanRole([], {
  serverOrigin: (req: express.Request) => {
    const domain = req.hostname;
    const serverOrigin = constructServerUrl(domain);
    return serverOrigin;
  },
});

// Mount Postman Role
postmanRole.mount(router);

export { router as postmanRouter };
