import { PrismaClient } from '@~internal/prisma/client/index.js';
import { beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

// 2
beforeEach(() => {
  mockReset(prisma);
});

// 3
const prisma = mockDeep<PrismaClient>();

export { prisma };
