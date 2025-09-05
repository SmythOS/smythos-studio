import axios from 'axios';
import qs from 'querystring';
import config from '../config';
// M2M test
const postData = {
  grant_type: 'client_credentials',
  resource: 'https://default.logto.app/api',
  scope: 'all',
};

const base64Credentials = Buffer.from(`${config.env.LOGTO_M2M_APP_ID}:${config.env.LOGTO_M2M_APP_SECRET}`, 'utf8').toString('base64');

const tokenData = {
  access_token: null,
};
export function getM2MToken(resource?, scope?) {
  return new Promise((resolve, reject) => {
    if (tokenData.access_token) {
      return resolve(tokenData.access_token);
    }

    const body = {
      grant_type: 'client_credentials',
      resource: resource || config.env.LOGTO_API_RESOURCE,
      scope: scope || '',
    };
    axios({
      method: 'post',
      url: `${config.env.LOGTO_SERVER}/oidc/token`,
      headers: {
        Authorization: `Basic ${base64Credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify(body),
    })
      .then(response => {
        tokenData.access_token = response.data.access_token;
        setTimeout(() => {
          tokenData.access_token = null;
        }, (response.data.expires_in - 100) * 1000);
        resolve(tokenData.access_token);
      })
      .catch(error => {
        reject({ error: error.response.data });
      });
  });
}
