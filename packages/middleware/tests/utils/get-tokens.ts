import { config } from '../../config/config';
import axios from 'axios';
import qs from 'qs';

const base64Credentials = Buffer.from(`${config.variables.LOGTO_M2M_APP_ID}:${config.variables.LOGTO_MACHINE_APP_SECRET}`, 'utf8').toString('base64');

export function getM2MToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = {
      grant_type: 'client_credentials',
      resource: config.variables.LOGTO_RESOURCE_INDICATOR,
      scope: '',
    };
    axios({
      method: 'post',
      url: `${config.variables.LOGTO_API_DOMAIN}/oidc/token`,
      headers: {
        Authorization: `Basic ${base64Credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify(body),
    })
      .then(response => {
        resolve(response.data.access_token);
      })
      .catch(error => {
        // reject({ error: error.response.data });
        reject(error);
      });
  });
}
