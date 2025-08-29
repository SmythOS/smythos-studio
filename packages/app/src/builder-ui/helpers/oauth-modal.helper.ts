import { OAUTH_SERVICES, mapServiceNameToInternal } from '@src/shared/utils/oauth.utils';

/**
 * Interface for OAuth connection form data
 */
export interface OAuthConnectionFormData {
  name: string;
  platform: string;
  oauthService: string;
  authorizationURL?: string;
  tokenURL?: string;
  clientID?: string;
  clientSecret?: string;
  scope?: string;
  requestTokenURL?: string;
  accessTokenURL?: string;
  userAuthorizationURL?: string;
  consumerKey?: string;
  consumerSecret?: string;
}

/**
 * Interface for OAuth connection info
 */
export interface OAuthConnectionInfo {
  oauth_keys_prefix?: string;
  service?: string;
  name?: string;
  platform?: string;
  authorizationURL?: string;
  tokenURL?: string;
  clientID?: string;
  clientSecret?: string;
  scope?: string;
  requestTokenURL?: string;
  accessTokenURL?: string;
  userAuthorizationURL?: string;
  consumerKey?: string;
  consumerSecret?: string;
}

/**
 * Generate OAuth connection modal HTML
 */
export function generateOAuthModalHTML(
  currentName: string,
  currentPlatform: string,
  currentService: string,
  currentOauthInfo: OAuthConnectionInfo
): string {
  const consumerKeyValue = currentOauthInfo.consumerKey || '';
  const consumerSecretValue = currentOauthInfo.consumerSecret || '';

  return `
    <form id="oauth-connection-form" class="grid gap-4 py-4">
      <!-- Name Field -->
      <div class="grid grid-cols-4 items-center gap-4 form-group">
        <label for="name" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name <span class="text-red-500">*</span></label>
        <div class="col-span-3">
          <input type="text" id="name" name="name" value="${currentName}" required 
                 class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" />
        </div>
      </div>
      <!-- Platform Field -->
      <div class="grid grid-cols-4 items-center gap-4 form-group">
        <label for="platform" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Platform <span class="text-red-500">*</span></label>
        <div class="col-span-3">
          <input type="text" id="platform" name="platform" value="${currentPlatform}" required
                 placeholder="e.g., Google Mail, HubSpot CRM"
                 class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" />
        </div>
      </div>
      <!-- OAuth Service Selector -->
      <div class="grid grid-cols-4 items-center gap-4 form-group">
        <label for="oauthService" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Auth Service <span class="text-red-500">*</span></label>
        <div class="col-span-3">
          <select id="oauthService" name="oauthService" required
                  class="input flex items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm h-9 w-full outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500">
            ${OAUTH_SERVICES
      .map(
        (service) =>
          `<option value="${service}" ${service === currentService ? 'selected' : ''}>${service}</option>`,
      )
      .join('')}
          </select>
        </div>
      </div>
      <!-- OAuth 2.0 Fields Container -->
      <div id="oauth2-fields" class="contents hidden">
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="authorizationURL" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Auth URL</label>
            <div class="col-span-3"><input type="text" id="authorizationURL" name="authorizationURL" value="${currentOauthInfo.authorizationURL || ''}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="tokenURL" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Token URL</label>
            <div class="col-span-3"><input type="text" id="tokenURL" name="tokenURL" value="${currentOauthInfo.tokenURL || ''}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="clientID" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Client ID</label>
            <div class="col-span-3"><input type="text" id="clientID" name="clientID" value="${currentOauthInfo.clientID || ''}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="clientSecret" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Client Secret</label>
            <div class="col-span-3"><input type="password" id="clientSecret" name="clientSecret" value="${currentOauthInfo.clientSecret || ''}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
           <div class="grid grid-cols-4 items-center gap-4 form-group" data-oauth-field="scope">
            <label for="scope" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Scopes</label>
            <div class="col-span-3"><textarea id="scope" name="scope" class="input w-full bg-white border text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 text-sm px-3 py-2 border-gray-300 focus:border-b-2 focus:border-b-blue-500 min-h-[70px] resize-none">${currentOauthInfo.scope || ''}</textarea></div>
          </div>
      </div>

      <!-- OAuth 1.0a Fields Container -->
      <div id="oauth1-fields" class="contents hidden">
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="requestTokenURL" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Request Token URL</label>
            <div class="col-span-3"><input type="text" id="requestTokenURL" name="requestTokenURL" value="${currentOauthInfo.requestTokenURL || ''}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="accessTokenURL" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Access Token URL</label>
            <div class="col-span-3"><input type="text" id="accessTokenURL" name="accessTokenURL" value="${currentOauthInfo.accessTokenURL || ''}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="userAuthorizationURL" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">User Auth URL</label>
            <div class="col-span-3"><input type="text" id="userAuthorizationURL" name="userAuthorizationURL" value="${currentOauthInfo.userAuthorizationURL || ''}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="consumerKey" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Consumer Key</label>
            <div class="col-span-3"><input type="text" id="consumerKey" name="consumerKey" value="${consumerKeyValue}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4 form-group">
            <label for="consumerSecret" class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Consumer Secret</label>
            <div class="col-span-3"><input type="password" id="consumerSecret" name="consumerSecret" value="${consumerSecretValue}" class="input bg-white border border-gray-300 text-gray-900 rounded block w-full h-9 px-3 py-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-b-2 focus:border-b-blue-500" /></div>
          </div>
      </div>

      <!-- Callback URL Display Container -->
      <div id="callback-url-display" class="grid grid-cols-4 items-center gap-4 hidden">
          <label class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Callback URL</label>
          <div class="col-span-3 text-sm text-gray-500 break-all"></div>
      </div>
    </form>
  `;
}

/**
 * Set prefill values for known OAuth services
 */
export function setPrefillValuesForService(dialog: HTMLElement, selectedService: string, baseUrl: string) {
  const service = mapServiceNameToInternal(selectedService);
  const callbackUrl = `${baseUrl}/oauth/${service}/callback`;

  if (selectedService === 'Google') {
    (dialog.querySelector('#authorizationURL') as HTMLInputElement).value =
      'https://accounts.google.com/o/oauth2/v2/auth';
    (dialog.querySelector('#tokenURL') as HTMLInputElement).value =
      'https://oauth2.googleapis.com/token';
    (dialog.querySelector('#scope') as HTMLTextAreaElement).value =
      'https://www.googleapis.com/auth/gmail.readonly';
  } else if (selectedService === 'LinkedIn') {
    (dialog.querySelector('#authorizationURL') as HTMLInputElement).value =
      'https://www.linkedin.com/oauth/v2/authorization';
    (dialog.querySelector('#tokenURL') as HTMLInputElement).value =
      'https://www.linkedin.com/oauth/v2/accessToken';
    (dialog.querySelector('#scope') as HTMLTextAreaElement).value =
      'r_liteprofile r_emailaddress';
  } else if (selectedService === 'Twitter') {
    (dialog.querySelector('#requestTokenURL') as HTMLInputElement).value =
      'https://api.twitter.com/oauth/request_token';
    (dialog.querySelector('#accessTokenURL') as HTMLInputElement).value =
      'https://api.twitter.com/oauth/access_token';
    (dialog.querySelector('#userAuthorizationURL') as HTMLInputElement).value =
      'https://api.twitter.com/oauth/authorize';
  }

  return callbackUrl;
}

/**
 * Update field visibility based on selected OAuth service
 */
export function updateOAuthFieldVisibility(
  dialog: HTMLElement,
  selectedValue: string,
  mapServiceFunc?: (service: string) => string
) {
  const oauth1Container = dialog.querySelector('#oauth1-fields');
  const oauth2Container = dialog.querySelector('#oauth2-fields');
  const callbackDisplayContainer = dialog.querySelector('#callback-url-display');

  const isOAuth2 = ['Google', 'LinkedIn', 'Custom OAuth2.0'].includes(selectedValue);
  const isOAuth1 = ['Twitter', 'Custom OAuth1.0'].includes(selectedValue);
  const isClientCreds = selectedValue === 'OAuth2 Client Credentials';

  // Show/hide main containers
  oauth1Container?.classList.toggle('hidden', !isOAuth1);
  oauth2Container?.classList.toggle('hidden', !(isOAuth2 || isClientCreds));

  // Toggle specific fields within OAuth2
  const scopeGroup = dialog.querySelector('[data-oauth-field="scope"]');
  const authURLGroup = dialog.querySelector('#authorizationURL')?.closest('.form-group');

  if (scopeGroup) {
    scopeGroup.classList.toggle('hidden', isClientCreds || !isOAuth2);
  }
  if (authURLGroup) {
    authURLGroup.classList.toggle('hidden', isClientCreds || !isOAuth2);
  }

  // Handle callback URL display
  callbackDisplayContainer?.classList.toggle(
    'hidden',
    isClientCreds || (!isOAuth2 && !isOAuth1),
  );

  if (!callbackDisplayContainer?.classList.contains('hidden')) {
    const callbackUrlDiv = callbackDisplayContainer?.querySelector('div.col-span-3');
    const service = selectedValue === 'None' ? '' : selectedValue;
    let callbackURL = '';

    try {
      const baseUrl = window.location.origin;
      const serviceInternal = mapServiceFunc ? mapServiceFunc(service) : mapServiceNameToInternal(service);
      if (serviceInternal && serviceInternal !== 'none') {
        callbackURL = `${baseUrl}/oauth/${serviceInternal}/callback`;
      }
    } catch (e) {
      console.error('Error creating callback URL:', e);
    }

    if (callbackUrlDiv) {
      callbackUrlDiv.textContent = callbackURL;
    }
  }
}

/**
 * Validate OAuth connection form data
 */
export function validateOAuthFormData(formData: Record<string, string>): { isValid: boolean; error?: string } {
  if (!formData.name || formData.name.trim() === '') {
    return { isValid: false, error: 'Name field is required.' };
  }
  if (!formData.platform || formData.platform.trim() === '') {
    return { isValid: false, error: 'Platform field is required.' };
  }
  if (!formData.oauthService || formData.oauthService === 'None') {
    return { isValid: false, error: 'Auth Service must be selected.' };
  }
  return { isValid: true };
}

/**
 * Build OAuth settings object for saving
 */
export function buildOAuthSettingsForSave(
  formData: Record<string, string>,
  connectionId: string,
  type: 'oauth' | 'oauth2' | 'oauth2_client_credentials'
) {
  const service = mapServiceNameToInternal(formData.oauthService);
  const oauthPrefix = connectionId.replace('_TOKENS', '');

  // Build the new oauth_info object from the form data
  const newOauthInfo: any = {
    oauth_keys_prefix: oauthPrefix,
    service,
    name: formData.name.trim(),
    platform: formData.platform.trim(),
  };

  // Add type-specific fields from formData to newOauthInfo
  if (type === 'oauth2' || type === 'oauth2_client_credentials') {
    newOauthInfo.tokenURL = formData.tokenURL || '';
    newOauthInfo.clientID = formData.clientID || '';
    newOauthInfo.clientSecret = formData.clientSecret || '';
    if (type === 'oauth2') {
      newOauthInfo.authorizationURL = formData.authorizationURL || '';
      newOauthInfo.scope = formData.scope || '';
    }
  } else if (type === 'oauth') {
    newOauthInfo.requestTokenURL = formData.requestTokenURL || '';
    newOauthInfo.accessTokenURL = formData.accessTokenURL || '';
    newOauthInfo.userAuthorizationURL = formData.userAuthorizationURL || '';
    newOauthInfo.consumerKey = formData.consumerKey || '';
    newOauthInfo.consumerSecret = formData.consumerSecret || '';
  }

  // Build the auth_settings object to be saved
  const authSettingsToSave: any = {
    name: newOauthInfo.name,
    type: type,
    oauth_info: newOauthInfo,
  };

  // Add tokenURL for OAuth2 types
  if (type === 'oauth2' || type === 'oauth2_client_credentials') {
    authSettingsToSave.tokenURL = newOauthInfo.tokenURL;
  }

  return authSettingsToSave;
}

/**
 * Generate a unique ID for OAuth connections
 */
export function generateOAuthConnectionId(): string {
  return (Date.now() + Math.random()).toString(36).replace('.', '').toUpperCase();
}
