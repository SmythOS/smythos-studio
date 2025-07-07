import axios, { AxiosError } from 'axios';
import { config } from '../../../../config/config';
import _ from 'lodash';
import { BULK_CALL_PREFIX, BULK_CALL_PREFIX_V2, _ID_KEY } from '../services/ai-agent-bulk-calls.service';
import redisConn from '../../../connections/redis.connection';

export interface BulkCallJob {
  data: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  index: string;
}
export interface BulkCall {
  data: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedIds?: string;
  failedMsg?: string;
  agentId: string;
  componentId: string;
  teamId: string;
}

export class AgentBulkCallUtils {
  // getJobKey() {
  //   return `${BULK_CALL_PREFIX}:${this.teamId}:${this.agentId}:${this.componentId}`;
  // }

  getBulkIdKey({ teamId, agentId, componentId }: { teamId: string; agentId: string; componentId: string }) {
    return `${BULK_CALL_PREFIX}:${teamId}:${agentId}:${componentId}`;
  }

  public prepareAgentBulkCallRowData(inputs: any[], data: any) {
    // Prepare the row data for the skill call
    return inputs.reduce(
      (acc, input) => ({
        ...acc,
        [input.name]: data[input.name],
      }),
      {},
    );
  }

  public async fetchAgentSkill({
    values,
    endpoint,
    method,
    agentId,
    version = 'latest',
  }: {
    values: any;
    endpoint: string;
    method: string;
    agentId: string;
    version?: string;
  }) {
    const _method = method.toUpperCase();

    const RUNTIME_AGENT_URL = config.variables.SMYTH_AGENT_RUNTIME_API;

    const request: {
      body: string | null;
      headers: { [key: string]: string };
    } = { body: null, headers: {} };

    request.body = JSON.stringify(values);
    request.headers = {
      ...(_method === 'POST' && { 'Content-Type': 'application/json' }),
      'X-DEBUG-SKIP': 'true',
      ...(version !== 'dev' && { 'X-AGENT-VERSION': version }), // if version is dev, don't send it
      'X-AGENT-ID': agentId,
    };

    try {
      if (_method === 'GET') {
        const _params = new URLSearchParams(values);
        const res = await axios.get(`${RUNTIME_AGENT_URL}/api/${endpoint}?${_params.toString()}`, {
          headers: request.headers,
        });
        return res.data;
      } else if (_method === 'POST') {
        const res = await axios.post(`${RUNTIME_AGENT_URL}/api/${endpoint}`, request.body, {
          headers: request.headers,
        });
        return res.data;
      }
    } catch (error) {
      const axiosErr = error as AxiosError;

      return axiosErr.response?.data || axiosErr.message;
    }
  }

  public markBulkFailed(jobId: string, msg?: string) {
    return redisConn.hset(jobId, {
      status: 'failed',
      failedMsg: msg,
    });
  }

  public async isBulkRunningInProcess(jobId: string) {
    // return bulksRunningInProcessStore.get(jobId) === true;
    return redisConn.smembers('bulksRunningInProcess').then(res => res.includes(jobId));
  }

  public async markBulkRunningInProcess(jobId: string) {
    // bulksRunningInProcessStore.set(jobId, true);
    return redisConn.sadd('bulksRunningInProcess', jobId);
  }

  public async removeBulkRunningInProcess(jobId: string) {
    // bulksRunningInProcessStore.del(jobId);
    return redisConn.srem('bulksRunningInProcess', jobId);
  }

  async addBulkToStopList(jobId: string) {
    // bulksToStop.push(jobId);
    return redisConn.sadd('bulksToStop', jobId);
  }

  public async removeBulkFromStopList(jobId: string) {
    // bulksToStop = bulksToStop.filter(j => j !== jobId);
    return redisConn.srem('bulksToStop', jobId);
  }

  public async isBulkInStopList(jobId: string) {
    // return bulksToStop.includes(jobId);
    return redisConn.smembers('bulksToStop').then(res => res.includes(jobId));
  }
}

export const agentBulkCallUtils = new AgentBulkCallUtils();
