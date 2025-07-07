import { PrismaTransaction } from './fields.type';

export type Transactional<T = object> = T & {
  ctx?: {
    tx?: PrismaTransaction;
  };
};
