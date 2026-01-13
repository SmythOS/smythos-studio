import express from 'express';

import { SwaggerRole } from '@smythos/server-common';

import { constructServerUrl } from '@embodiment/helpers/openapi-adapter.helper';

const router = express.Router();

// Create Swagger Role instance
const swaggerRole = new SwaggerRole([], {
  staticPath: '/static/embodiment/swagger',
  serverOrigin: (req: express.Request) => {
    const domain = req.hostname;
    const serverOrigin = constructServerUrl(domain);
    return serverOrigin;
  },
});

// Mount Swagger Role
swaggerRole.mount(router);

export { router as swaggerRouter };
