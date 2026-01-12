import { MCPRole } from '@smythos/server-common';
import express from 'express';

const router = express.Router();

// Create MCPRole instance
const mcpRole = new MCPRole([]);

// Mount MCPRole
mcpRole.mount(router);

export { router as mcpRouter };
