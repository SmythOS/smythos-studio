import NodeClient from '@logto/node';
export {
  LogtoClientError,
  LogtoError,
  LogtoRequestError,
  OidcError,
  PersistKey,
  Prompt,
  ReservedResource,
  ReservedScope,
  UserScope,
  buildOrganizationUrn,
  getOrganizationIdFromUrn,
  organizationUrnPrefix,
} from '@logto/node';
import { Router } from 'express';

class ExpressStorage {
  request: any;
  constructor(request) {
    this.request = request;
  }
  async setItem(key, value) {
    this.request.session[key] = value;
  }
  async getItem(key) {
    const value = this.request.session[key];
    if (value === undefined) {
      // console.log(
      //   `>> Auth logger: Logto attempted to get item from session with key ${key} but it is undefined`,
      //   this.request.session,
      // );
      return null;
    }
    return String(value);
  }
  async removeItem(key) {
    this.request.session[key] = undefined;
  }
}

const createNodeClient = (request, response, config) => {
  // We assume that `session` is configured in the express app, but need to check it there.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!request.session) {
    throw new Error('session_not_configured');
  }
  const storage = new ExpressStorage(request);
  return new NodeClient(config, {
    storage,
    navigate: (url) => {
      response.redirect(url);
    },
  });
};
const handleAuthRoutes = (config) => {
  // eslint-disable-next-line new-cap
  const router = Router();
  const prefix = config.authRoutesPrefix ?? 'logto';
  router.use(`/${prefix}/:action`, async (request: any, response) => {
    let { action } = request.params;
    const nodeClient = createNodeClient(request, response, config);

    if (
      typeof request?.session?.pendingPath === 'string' &&
      request?.session?.pendingPath.includes('_auth=sign-up') &&
      !request.session._smyth_signup
    ) {
      action = 'sign-up'; //smythos patch to force signup screen when _auth=sign-up is in the url
      request.session._smyth_signup = true;
      //request?.session?.pendingPath.
    }
    switch (action) {
      case 'sign-in': {
        await nodeClient.signIn(`${config.baseUrl}/${prefix}/sign-in-callback`);
        request.session._smyth_signup = false;
        break;
      }
      case 'sign-up': {
        await nodeClient.signIn(`${config.baseUrl}/${prefix}/sign-in-callback`, 'signUp');
        break;
      }
      case 'sign-in-callback': {
        if (request.url) {
          await nodeClient.handleSignInCallback(`${config.baseUrl}${request.originalUrl}`);

          // Get the pending path or default to base URL
          const redirectPath = request.session.pendingPath || config.baseUrl;

          // Create URL object and add signin parameter
          const redirectUrl = new URL(redirectPath, config.baseUrl);
          redirectUrl.searchParams.set('signin', 'true');

          // Clear the pending path and redirect
          delete request.session.pendingPath;
          response.redirect(redirectUrl.toString());
          request.session._smyth_signup = false;
        }
        break;
      }
      case 'sign-out': {
        await nodeClient.signOut(config.baseUrl);
        request.session._smyth_signup = false;
        break;
      }
      default: {
        response.status(404).end();
      }
    }
  });
  return router;
};
const withLogto = (config) => async (request, response, next) => {
  const client = createNodeClient(request, response, config);
  const user = await client.getContext({
    getAccessToken: config.getAccessToken,
    resource: config.resource,
    fetchUserInfo: config.fetchUserInfo,
    getOrganizationToken: config.getOrganizationToken,
  });
  // eslint-disable-next-line @silverhand/fp/no-mutating-methods
  Object.defineProperty(request, 'user', { enumerable: true, get: () => user });
  next();
};

export { handleAuthRoutes, withLogto };
