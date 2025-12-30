import express from 'express';

import { OpenAPIRole } from '@smythos/server-common';

const router = express.Router();

// Create OpenAPI Role instance
const openapiRole = new OpenAPIRole();

// Mount OpenAPI Role
openapiRole.mount(router);

export { router as apiRouter };
