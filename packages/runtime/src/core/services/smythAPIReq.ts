import axios from 'axios';
import config from '../config';

//middleware sys API
export const mwSysAPI = axios.create({
    baseURL: `${config.env.SMYTH_API_BASE_URL}/_sysapi/v1`,
});
export const mwUserAPI = axios.create({
    baseURL: `${config.env.SMYTH_API_BASE_URL}/v1`,
});

export function includeAuth(token: string) {
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
}

/**
 * Extracts a Bearer token from the Authorization header
 * @param authHeader - The Authorization header value
 * @returns The extracted token or null if the token is invalid
 */
export const extractBearerToken = (authHeader: string | undefined): string | null => {
    if (!authHeader) {
        return null;
    }

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice(7).trim();

    if (!token?.length) {
        return null;
    }

    return token;
};
