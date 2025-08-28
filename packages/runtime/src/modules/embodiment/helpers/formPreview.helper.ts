import config from '@embodiment/config';
import axios, { AxiosError } from 'axios';

export type CallSkillParams = {
    agentId: string;
};

export type CallSkillBody = {
    componentId: string;
    payload?: Record<string, any> | null | '';
    version?: 'dev' | 'latest';
};

export type CallSkillType = {
    params: CallSkillParams;
    body: CallSkillBody;
    endpoint: string;
};

export async function callSkill({ params, body, endpoint }: CallSkillType) {
    const RUNTIME_AGENT_URL = config.env.BASE_URL;

    const request: {
        body: string | null;
        headers: { [key: string]: string };
    } = { body: null, headers: {} };

    request.body = JSON.stringify(body?.payload || {});
    request.headers = {
        'Content-Type': 'application/json',
        'X-DEBUG-SKIP': 'true',
        ...(body.version !== 'dev' && { 'X-AGENT-VERSION': body.version }), // if version is dev, don't send it
        'X-AGENT-ID': params.agentId,
    };

    try {
        const res = await axios.post(`${RUNTIME_AGENT_URL}/api/${endpoint}`, request.body, {
            headers: request.headers,
        });
        return res.data;
    } catch (error) {
        const axiosErr = error as AxiosError;
        return axiosErr.response?.data || axiosErr.message;
    }
}
