import { Router } from 'express';

import { OpenAIRole } from '@smythos/server-common';

const router = Router();

// Create OpenAIRole instance
const openaiRole = new OpenAIRole();

// Mount OpenAIRole
openaiRole.mount(router);

export { router as openaiRouter };
