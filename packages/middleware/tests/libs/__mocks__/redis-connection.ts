import { Redis } from 'ioredis';
import { beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

// 2
beforeEach(() => {
  mockReset(redisConn);
});

const redisConn = mockDeep<Redis>();

export default redisConn;
