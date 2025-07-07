/* eslint-disable import/no-mutable-exports */
import Redis from 'ioredis';
import { config } from '../../config/config';

const clusterSentinels = config.variables.REDIS_CLUSTER_SENTINELS!.split(',').map(node => {
  const [host, port] = node.split(':');
  return { host, port: parseInt(port, 10) };
});

// const redisConn = new Redis(clusterDefinitions[0].port, clusterDefinitions[0].host, {
//   maxRetriesPerRequest: null,
// });

const redisConn = new Redis({
  sentinels: clusterSentinels,
  name: config.variables.REDIS_CLUSTER_MASTER_NAME,
  password: config.variables.REDIS_CLUSTER_PASSWORD,
  maxRetriesPerRequest: null,
});

export default redisConn;
