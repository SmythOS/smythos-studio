import { errorToast, successToast } from '@src/shared/components/toast';
import { API_CALL_DATA_ENTRIES, SMYTHOS_DOCS_URL } from '@src/shared/constants/general'; // Adjust the path as necessary
import {
  deriveServiceFromOauthInfo,
  extractServiceFromConnection,
  getConnectionOauthInfo,
  saveOAuthConnection
} from '@src/shared/helpers/oauth-api.helper';
import {
  OAUTH_SERVICES,
  extractPlatformFromUrl,
  generateOAuthId,
  mapInternalToServiceName,
  mapServiceNameToInternal
} from '@src/shared/utils/oauth.utils';
import { builderStore } from '../../shared/state_stores/builder/store';
import { COMP_NAMES } from '../config';
import {
  generateOAuthModalHTML
} from '../helpers/oauth-modal.helper';
import { createBadge } from '../ui/badges'; // *** ADDED: Import createBadge ***
import { destroyCodeEditor, toggleMode } from '../ui/dom';
import { closeTwDialog, twEditValuesWithCallback } from '../ui/tw-dialogs';
import { delay, getVaultData, handleKvFieldEditBtn, handleKvFieldEditBtnForParams } from '../utils';
import { Workspace } from '../workspace/Workspace.class';
import { Component } from './Component.class';

declare var Metro;
declare var workspace: Workspace;

const maxUriLength = 8192; // Maximum URI length

export class APICall extends Component {
  public templateSupport = true;
  public eventTriggersActually = false;
  private boundHandleAuthMessage = this.handleAuthMessage.bind(this);
  private boundHandleFocusAfterAuth = this.handleFocusAfterAuth.bind(this);
  private oauthConnections: any = null;
  private oauthConnectionNames: any = null;
  private authCheckPromises: Map<string, Promise<boolean>> = new Map();
  private updateAuthButtonDebounceTimer: any = null;

  // Wrapper methods to use helper functions
  private extractPlatformFromUrl(url?: string): string {
    return extractPlatformFromUrl(url);
  }

  private extractServiceFromConnection(connection: any): string {
    return extractServiceFromConnection(connection);
  }

  private getConnectionOauthInfo(connection: any, connectionId?: string): any {
    return getConnectionOauthInfo(connection, connectionId);
  }

  private deriveServiceFromOauthInfo(oauthInfo: any): string {
    return deriveServiceFromOauthInfo(oauthInfo);
  }

  protected async prepare() {
    try {
      // console.log('[APICall.prepare] Getting OAuth connections from workspace cache...');

      // Get OAuth connections from workspace cache
      const oauthConnectionsData = await builderStore.getState().getOAuthConnections();
      // console.log('[APICall.prepare] OAuth connections retrieved from cache:', oauthConnectionsData);

      this.oauthConnections = oauthConnectionsData || {};
      const componentSpecificId = `OAUTH_${this.uid}_TOKENS`;

      // Use the centralized buildOAuthSelectOptions method
      const options = this.buildOAuthSelectOptions(this.oauthConnections, componentSpecificId, '[APICall.prepare]');

      // Add 'None' option at the start
      options.unshift({ value: 'None', text: 'None', badge: '' });

      // console.log('[APICall.prepare] Final options for select:', options);
      this.oauthConnectionNames = options;
    } catch (error) {
      console.error('[APICall.prepare] Exception:', error);
      this.oauthConnectionNames = [{ value: 'None', text: 'None', badge: '' }];
    }
    return true;
  }

  protected async init() {
    this.settings = {
      method: {
        type: 'select',
        label: 'Method',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        value: 'GET',
        validate: 'required',
        help: `The Method field defines the type of HTTP request your API call will use—such as GET to retrieve data, POST to create, or DELETE to remove. <br /><a style="color: #3b82f6;text-decoration: underline;" href="${SMYTHOS_DOCS_URL}/agent-studio/components/advanced/api-call" target="_blank">See full method guide →</a>`,
        hintPosition: 'bottom',
        tooltipClasses: 'w-64',
        arrowClasses: '-ml-11',
      },
      url: {
        type: 'input',
        label: 'URL',
        // as http://localhost... is not passing the url validation, so exclude it in localhost
        //validate: `required maxlength=${maxUriLength} ${isLocalhost ? 'url' : ''}`,
        validate: `required maxlength=${maxUriLength} custom=isUrlValid`,
        validateMessage: 'Provide a valid URL',
        attributes: { 'data-template-vars': 'true' },
        cls: 'pr-4',
        help: `Configure the URL field using static or dynamic values for flexibility. Use query (?key={{value}}) and path parameters ({{url}}/segment) to adapt endpoints. <br /><a style="color: #3b82f6;text-decoration: underline;" href="${SMYTHOS_DOCS_URL}/agent-studio/components/advanced/api-call" target="_blank">See URL configuration guide →</a>`,
        hintPosition: 'bottom',
        tooltipClasses: 'w-64',
        arrowClasses: '-ml-15',
        actions: [
          {
            label: '',
            icon: 'fa-regular fa-pen-to-square',
            id: 'editQueryParams',
            events: {
              click: handleKvFieldEditBtnForParams.bind(this, {
                showVault: true,
                vaultScope: COMP_NAMES.apiCall,
              }),
            },
          },
        ],
      },
      headers: {
        type: 'textarea',
        label: 'Headers',
        readonly: true,
        help: `Headers pass essential metadata like Content-Type and authentication details. <br />Edit them in the API component settings to match your API's requirements. <br /><a style="color: #3b82f6;text-decoration: underline;" href="${SMYTHOS_DOCS_URL}/agent-studio/components/advanced/api-call" target="_blank">See headers guide →</a>`,
        tooltipClasses: 'w-64',
        arrowClasses: '-ml-13',
        validate: `custom=isValidJson`,
        validateMessage: 'Provide a Valid JSON with non-empty keys',
        actions: [
          {
            label: '',
            icon: 'fa-regular fa-pen-to-square',
            id: 'editHeaders',
            events: {
              click: handleKvFieldEditBtn.bind(this, 'headers', {
                showVault: true,
                vaultScope: COMP_NAMES.apiCall,
              }),
            },
          },
        ],
      },
      contentType: {
        type: 'select',
        label: 'Content-Type',
        help: `The Content-Type header specifies the format of the data in the request body—e.g., application/json, multipart/form-data, or text/plain. Choose the type that matches your API's requirements. <br /><a style="color: #3b82f6;text-decoration: underline;" href="${SMYTHOS_DOCS_URL}/agent-studio/components/advanced/api-call" target="_blank">See Content-Type guide →</a>`,
        tooltipClasses: 'w-64',
        arrowClasses: '-ml-5',
        options: [
          'none',
          'application/json',
          'multipart/form-data',
          'binary',
          'application/x-www-form-urlencoded',
          'text/plain',
          'application/xml',
        ],
        value: 'none',
        events: {
          change: (event) => this.handleBodyEditButtons(),
        },
      },
      body: {
        type: 'textarea',
        label: 'Body',
        attributes: { 'data-template-vars': 'true', 'data-vault': `${COMP_NAMES.apiCall},All` },
        help: `Body contains data sent to the server. SmythOS dynamically adapts content based on selected Content-Type and allows integration of variables from other components. <br /><a style="color: #3b82f6;text-decoration: underline;" href="${SMYTHOS_DOCS_URL}/agent-studio/components/advanced/api-call" target="_blank">See Body guide →</a>`,
        tooltipClasses: 'w-64',
        arrowClasses: '-ml-17',
        actions: [
          {
            label: '',
            icon: 'fa-regular fa-pen-to-square',
            id: 'bodyEditBtn',
            events: {
              click: handleKvFieldEditBtn.bind(this, 'body', {
                showVault: true,
                vaultScope: COMP_NAMES.apiCall,
              }),
            },
          },
        ],
      },
      oauth_con_id: {
        type: 'select',
        label: 'OAuth Connection',
        section: 'OAuth',
        options: this.oauthConnectionNames,
        value: this.data.oauth_con_id || 'None',
        events: {
          change: (event) => this.handleOAuthConnectionChange(event.target.value),
        },
        actions: [
          // Always show "Create New" button
          {
            label: 'Add New',
            icon: 'fa-regular fa-lg fa-plus',
            id: 'createOAuthConnection',
            cls: 'mr-2 !mt-[-36px] !pt-[10px]',
            visible: () => true, // Always visible
            events: {
              click: () => {
                this.data.oauth_con_id = 'None';
                this.handleOAuthConnectionAction();
              },
            },
          },
          // Only show "Edit" button if a valid connection is selected
          {
            label: 'Edit',
            icon: 'fa-regular fa-pen-to-square',
            id: 'editOAuthConnection',
            cls: 'mt-[7px] !mr-[24px] !pt-[10px]',
            visible: () => this.data.oauth_con_id && this.data.oauth_con_id !== 'None',
            events: {
              click: () => this.handleOAuthConnectionAction(),
            },
          },
        ],
      },
      oauthService: {
        type: 'hidden',
        label: 'Authentication Service',
        section: 'OAuth',
        sectionHelp:
          'SmythOS supports OAuth 2.0 with OpenID Connect (OIDC) for secure user authentication and authorization.',
        sectionTooltipClasses: 'w-64 ml-12',
        sectionArrowClasses: '-ml-11',
        options: [...OAUTH_SERVICES],
        value: 'None',
        events: {
          change: (event) => this.handleServiceChange(event.target.value),
        },
      },
      scope: {
        type: 'hidden',
        label: 'Scopes *',
        section: 'OAuth',
        value: '', // Default empty, can be pre-filled based on service selection
      },
      authorizationURL: {
        type: 'hidden',
        label: 'Authorization URL (OAuth2.0) *',
        section: 'OAuth',
        value: '', // Default empty, can be pre-filled based on service selection
      },
      tokenURL: {
        type: 'hidden',
        label: 'Token URL (OAuth2.0) *',
        section: 'OAuth',
        value: '',
      },
      clientID: {
        type: 'hidden',
        label: 'Client ID *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `${COMP_NAMES.apiCall},All` },
      },
      clientSecret: {
        type: 'hidden',
        label: 'Client Secret *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `${COMP_NAMES.apiCall},All` },
      },
      oauth2CallbackURL: {
        type: 'hidden',
        html: `Callback URL (OAuth2.0)<br /><br /><span></span>`,
        label: 'Callback URL (OAuth2.0)',
        section: 'OAuth',
        // Setting default value to empty string ('') triggers 'setting changed' popup initially because when we check for setting changes, the value of the element is undefined since it's a div.
      },

      // OAuth1.0 Inputs
      requestTokenURL: {
        type: 'hidden',
        label: 'Request Token URL (OAuth1.0) *',
        section: 'OAuth',
        value: '',
      },
      accessTokenURL: {
        type: 'hidden',
        label: 'Access Token URL (OAuth1.0) *',
        section: 'OAuth',
        value: '',
      },
      userAuthorizationURL: {
        type: 'hidden',
        label: 'User Authorization URL (OAuth1.0) *',
        section: 'OAuth',
        value: '',
      },
      consumerKey: {
        type: 'hidden',
        label: 'Consumer Key (OAuth1.0) *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `${COMP_NAMES.apiCall},All` },
      },
      consumerSecret: {
        type: 'hidden',
        label: 'Consumer Secret (OAuth1.0) *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `${COMP_NAMES.apiCall},All` },
      },
      oauth1CallbackURL: {
        // Renamed to avoid conflict with OAuth2.0 callback URL
        type: 'hidden',
        html: 'Callback URL (OAuth1.0)<br /><br /><span></span>',
        label: 'Callback URL (OAuth1.0)',
        section: 'OAuth',
        // Setting default value to empty string triggers 'setting changed' popup initially because when we check for setting changes, the value of the element is undefined since it's a div.
      },
      authenticate: {
        type: 'button',
        label: 'Authenticate',
        section: 'OAuth',
        attributes: {},
        events: {
          click: (event) =>
            event.target.innerText === 'Sign Out'
              ? this.signOutFunction(event.target)
              : this.collectAndConsoleOAuthValues(event),
        },
      },
      proxy: {
        type: 'textarea',
        label: 'Proxy URLs',
        section: 'Advanced',
        validateMessage: `Enter your proxy URLs in the following format:<br/>
                [scheme]://[username]:[password]@[host]:[port]<br/><br/>
                For multiple URLs, place each one in a new line.<br/><br/>
                Example:<br/>
                http://user:pass@proxyserver-one.com:8080<br/>
                socks5://proxyserver-two.com:1080`,
        hintPosition: 'left',
        attributes: { 'data-template-vars': 'true', 'data-vault': `${COMP_NAMES.apiCall},All` },
      },
    };

    // Handle backward compatibility for existing components
    if (!this.data.oauth_con_id && this.data.oauthService && this.data.oauthService !== 'None') {
      // If there's an existing OAuth service but no oauth_con_id,
      // set oauth_con_id to the component's default OAuth connection ID
      this.data.oauth_con_id = `OAUTH_${this.uid}_TOKENS`;
    }

    for (let item of API_CALL_DATA_ENTRIES) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item]?.value;
    }

    if (this.properties.template && !this.data._templateVars) {
      this.data._templateVars = {};
    }

    this.inputSettings = {
      ...this.inputSettings,
      // ! DEPRECATED: Need to remove isFile implementation from everywhere
      isFile: {
        type: 'boolean',
        editConfig: { type: 'checkbox', label: 'Binary Input', value: false, cls: 'hidden' },
      },
    };

    this.properties.defaultInputs = [];
    this.properties.defaultOutputs = ['Response', 'Headers'];

    this.drawSettings.componentDescription = 'Effortlessly Connect to Any API Endpoint';

    const templateIcon = this.properties.template?.templateInfo?.icon || '';
    const templateIconColor = this.properties.template?.templateInfo?.color || '#000000';
    const svgIcon = templateIcon && templateIcon.startsWith('<svg');
    this.drawSettings.iconCSSClass = templateIcon
      ? `tpl-fa-icon ${templateIcon}`
      : `svg-icon ${this.constructor.name}`;
    if (svgIcon) this.drawSettings.iconCSSClass = templateIcon;
    //this.drawSettings.addOutputButton = '';
    this.drawSettings.color = templateIcon ? templateIconColor : '#00BCD4';

    this.drawSettings.showSettings = true;
  }

  public exportTemplate() {
    // if (this.properties.template) {
    //     return this.properties.template;
    // }
    let data = JSON.parse(JSON.stringify(this.data));
    const withSpaces = data.url ? data.url.replace(/\+/g, ' ') : '';
    let url = decodeURIComponent(withSpaces);
    let regex = /{{([A-Z]+):([\w\s]+)+:\[(.*?)\]}}/gm;
    let counter = 0;

    const settings = {};

    url = this.parseTemplateString(url, settings);

    data.url = url;

    let headers = JSON.parse(data.headers || '{}');
    for (let key in headers) {
      let value = headers[key];
      if (typeof value === 'string') {
        value = this.parseTemplateString(value, settings);
      }
      headers[key] = value;
    }
    data.headers = JSON.stringify(headers);

    data.body = data.body || '';
    data.body = this.parseTemplateString(data.body, settings);

    data.proxy = this.parseTemplateString(data.proxy, settings);

    const inputs = this.properties.inputProps;
    const outputs = this.properties.outputProps;

    const template = {
      name: this.title,
      componentName: this.constructor.name,
      description: this.description,
      settings,
      data,
      inputs,
      outputs,
    };

    return template;
  }
  /**
   * Handles changes in the authentication service selection, updates UI fields based on the selected service,
   * clears previous selections, and pre-fills fields with default or previously saved values.
   * @param {string} selectedValue - The currently selected authentication service value.
   */
  private handleServiceChange(selectedValue) {
    const sidebar = this.getSettingsSidebar();
    if (!sidebar) return '';
    let oauth2Fields = [
      'authorizationURL',
      'tokenURL',
      'clientID',
      'clientSecret',
      'oauth2CallbackURL',
      'scope',
    ];
    let oauth1Fields = [
      'requestTokenURL',
      'accessTokenURL',
      'userAuthorizationURL',
      'consumerKey',
      'consumerSecret',
      'oauth1CallbackURL',
    ];
    // Function to clear fields specifically for a new selection
    function clearFieldsForNewSelection(fieldsToClear) {
      fieldsToClear.forEach((fieldName) => {
        const input: any = sidebar.querySelector(`[data-field-name="${fieldName}"] input`);
        const textarea: any = sidebar.querySelector(`[data-field-name="${fieldName}"] textarea`);
        if (input) input.value = '';
        if (textarea) textarea.value = '';
      });
    }

    // Function to toggle field visibility
    function toggleFieldsVisibility(fields, shouldShow) {
      fields.forEach((fieldName) => {
        const field: any = sidebar.querySelector(`[data-field-name="${fieldName}"]`);
        if (field) field.style.display = shouldShow ? 'block' : 'none';
      });
    }

    // Function to pre-fill fields, avoiding overwriting non-empty values unless it's a new selection
    function prefillFields(fields, formData, isNewSelection) {
      fields.forEach((field) => {
        const input: any = sidebar.querySelector(`[data-field-name="${field}"] input`);
        const textarea: any = sidebar.querySelector(`[data-field-name="${field}"] textarea`);
        if (input && (isNewSelection || input.value === '')) input.value = formData[field] ?? '';
        if (textarea && (isNewSelection || textarea.value === ''))
          textarea.value = formData[field] ?? '';
      });
    }

    const isOAuth2 = [
      'Google',
      'LinkedIn',
      'Custom OAuth2.0',
      'OAuth2 Client Credentials',
    ].includes(selectedValue);
    let fieldsToUse = isOAuth2 ? [...oauth2Fields] : oauth1Fields; // Use a copy of oauth2Fields to prevent modifying the original array
    if (selectedValue === 'OAuth2 Client Credentials') {
      // if value is 'OAuth2 Client Credentials',Remove 'authorizationURL', 'oauth2CallbackURL', and 'scope' from fieldsToUse, also hide oauth1Fields
      fieldsToUse = fieldsToUse.filter(
        (field) => !['authorizationURL', 'oauth2CallbackURL', 'scope'].includes(field),
      );
      oauth2Fields = fieldsToUse;
      oauth1Fields = ['authorizationURL', 'oauth2CallbackURL', 'scope', ...oauth1Fields];
    }
    const isNewSelection = this.data.oauthService !== selectedValue; // Determine if it's a new selection
    if (isNewSelection) {
      clearFieldsForNewSelection([...oauth1Fields, ...oauth2Fields]); // Clear all fields if it's a new selection
    }
    // Toggle visibility based on the selected service
    const shouldShowOAuth1Fields = !isOAuth2 && selectedValue !== 'None';
    toggleFieldsVisibility(oauth2Fields, isOAuth2);
    toggleFieldsVisibility(oauth1Fields, shouldShowOAuth1Fields);

    if (!this.eventTriggersActually && this.data.oauthService === selectedValue) {
      // Case 1: Sidebar opens, simulate an event but saved state values are presnt
      prefillFields(fieldsToUse, this.data, false);
    } else if (this.eventTriggersActually && this.data.oauthService === selectedValue) {
      // Case 2: Actual event triggers, overwrite only, if values are empty and provider and state are same, otherwise rewrite everything if it's a new selection
      prefillFields(fieldsToUse, this.data, isNewSelection);
    } else if (isNewSelection) {
      // Case 3: New selection, pre-populate specific fields if applicable
      let formData = this.updateConfiguration(selectedValue, sidebar);
      if (formData) prefillFields(Object.keys(formData), formData, true);
    }

    this.eventTriggersActually = true; // Indicate that a real change event has been handled
    const oauth_button: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);
    if (oauth_button && oauth_button.innerText === 'Sign Out') {
      // check authentication inside setTimeout as it takes a moment to save changes when user switches provider
      setTimeout(async () => {
        this.activateSpinner(oauth_button);
        await this.signOutFunction(oauth_button);
      }, 0);
    } else {
      oauth_button.innerHTML = 'Authenticate';
    }
  }

  /**
   * Maps the selected authentication service to a predefined internal service name.
   * @param {string} service - The external name of the selected authentication service.
   * @returns {string} The internal service name corresponding to the selected service.
   */
  private mapSelectedService(service) {
    return mapServiceNameToInternal(service);
  }

  /**
   * Collects the OAuth configuration from the *selected connection*
   * and initiates the authentication flow.
   * @param {Event} event - The click event object.
   */
  private async collectAndConsoleOAuthValues(event) {
    const selectedConnectionId = this.data.oauth_con_id;
    if (selectedConnectionId === 'None' || !selectedConnectionId) {
      errorToast('Please select a valid OAuth Connection first', 'Error', 'alert');
      return;
    }

    // Ensure connections are loaded (they should be by the time this is clicked)
    if (!this.oauthConnections) {
      errorToast('OAuth connections not loaded. Please wait or refresh.', 'Error', 'alert');
      console.error('OAuth connections not loaded.');
      return;
    }

    // Find the selected connection object using the ID
    const selectedConnection = this.oauthConnections[selectedConnectionId];
    // console.log('[OAuth Auth] Selected connection:', selectedConnection);

    const synthesizedOauthInfo = this.getConnectionOauthInfo(selectedConnection, selectedConnectionId);
    // console.log('[OAuth Auth] Synthesized oauth_info:', synthesizedOauthInfo);

    if (!selectedConnection || !synthesizedOauthInfo) {
      errorToast('Selected OAuth connection details not found.', 'Error', 'alert');
      console.error(
        'Selected connection or its oauth_info not found for ID:',
        selectedConnectionId,
        'Connection:',
        selectedConnection
      );
      return;
    }

    // Validate that required fields are present
    if (!synthesizedOauthInfo.service) {
      console.error('[OAuth Auth] Missing service field in oauth_info:', synthesizedOauthInfo);
      errorToast('OAuth connection is missing required service information. Please edit and save the connection again.', 'Error', 'alert');
      return;
    }

    // --- Use synthesized oauth_info from the selected connection (supports old/new structures) ---
    const oauthInfoPayload = synthesizedOauthInfo;
    //console.log(oauthInfoPayload);
    const connectionType = oauthInfoPayload?.service; // 'oauth', 'oauth2', or 'oauth2_client_credentials'
    // Normalize callback URLs to the current backend origin across envs (local/staging/prod)
    const getDesiredBackendOrigin = () => {
      // Prefer configured backend server when available
      const candidate = (this.workspace && (this.workspace as any).server) || window.location.origin;
      try {
        const u = new URL(candidate);
        return u.origin;
      } catch {
        return String(candidate).replace(/\/$/, '');
      }
    };
    const desiredBackendOrigin = getDesiredBackendOrigin();
    const normalizeCallbackOrigin = (cb?: string, providerPath?: string) => {
      if (!providerPath) return cb;
      try {
        if (!cb) return `${desiredBackendOrigin}${providerPath}`;
        const current = new URL(cb);
        const desired = new URL(desiredBackendOrigin);
        if (current.origin !== desired.origin) {
          return `${desired.origin}${current.pathname}${current.search}${current.hash}`;
        }
        return cb;
      } catch {
        return `${desiredBackendOrigin}${providerPath}`;
      }
    };
    // --- Basic Payload Validation (on the fetched payload) ---
    //console.log(oauthInfoPayload);

    // Get connection type information from both sources
    const serviceType = oauthInfoPayload.service; // 'google', 'oauth1', 'oauth2', etc.

    // Ensure callback URL exists for the current flow (derive when missing)
    try {
      const internalService = (serviceType || connectionType || '').toLowerCase();
      const oauth2Path = `/oauth/${internalService === 'google' || internalService === 'linkedin' ? internalService : 'oauth2'}/callback`;
      const oauth1Path = `/oauth/${internalService === 'twitter' ? 'oauth1' : internalService}/callback`;

      // Ensure correct origin for OAuth2 callbacks
      if (connectionType === 'oauth2' || internalService === 'google' || internalService === 'linkedin') {
        oauthInfoPayload.oauth2CallbackURL = normalizeCallbackOrigin(
          oauthInfoPayload.oauth2CallbackURL,
          oauth2Path,
        );
      }

      // Ensure correct origin for OAuth1 callbacks
      if (connectionType === 'oauth' || internalService === 'oauth1' || internalService === 'twitter') {
        oauthInfoPayload.oauth1CallbackURL = normalizeCallbackOrigin(
          oauthInfoPayload.oauth1CallbackURL,
          oauth1Path,
        );
      }
    } catch (e) {
      console.warn('Could not normalize callback URL origin', e);
    }

    // Determine if this is a client credentials flow
    const isClientCredentials =
      connectionType === 'oauth2_client_credentials' || serviceType === 'oauth2_client_credentials';

    // Derive human-friendly service for UI checks
    const derivedService = mapInternalToServiceName(serviceType || connectionType || '');

    // --- Basic Payload Validation (on the fetched payload) ---
    let isValid = true;
    let missingFields = [];

    if (connectionType === 'oauth2' || isClientCredentials || derivedService === 'Google' || derivedService === 'LinkedIn') {
      if (!oauthInfoPayload.tokenURL) missingFields.push('Token URL');
      if (!oauthInfoPayload.clientID) missingFields.push('Client ID');
      if (!oauthInfoPayload.clientSecret) missingFields.push('Client Secret');
      if (
        (connectionType === 'oauth2' || derivedService === 'Google' || derivedService === 'LinkedIn') &&
        !isClientCredentials &&
        !oauthInfoPayload.authorizationURL
      ) {
        missingFields.push('Auth URL');
      }
      if ((connectionType === 'oauth2' || derivedService === 'Google' || derivedService === 'LinkedIn') && !isClientCredentials && !oauthInfoPayload.scope) {
        missingFields.push('Scopes');
      }
    } else if (connectionType === 'oauth') {
      // OAuth 1.0 validation remains the same
      if (!oauthInfoPayload.requestTokenURL) missingFields.push('Request Token URL');
      if (!oauthInfoPayload.accessTokenURL) missingFields.push('Access Token URL');
      if (!oauthInfoPayload.userAuthorizationURL) missingFields.push('User Auth URL');
      if (!oauthInfoPayload.consumerKey) missingFields.push('Consumer Key');
      if (!oauthInfoPayload.consumerSecret) missingFields.push('Consumer Secret');
    }
    //console.log(missingFields);
    if (missingFields.length > 0) {
      isValid = false;
    }

    if (!isValid) {
      errorToast(
        `Selected connection is missing required fields: ${missingFields.join(', ')}`,
        'Error',
        'alert',
      );
      return;
    }
    // --- End Basic Validation ---

    // Determine the correct backend endpoint based on connection type
    const endpoint = isClientCredentials ? 'client_credentials' : 'init';
    const url = `${this.workspace.server}/oauth/${endpoint}`;

    // The payload *is* the oauth_info from the selected connection
    const authData = { ...oauthInfoPayload }; // Send a copy
    //console.log('payload', authData);
    this.activateSpinner(event.target); // Assumes event.target is the button
    document.addEventListener('visibilitychange', this.boundHandleFocusAfterAuth);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error
        throw new Error(
          errorData.message || `Authentication request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.authUrl) {
        // Standard OAuth flow requiring popup
        window.open(data.authUrl, '_blank');
        window.addEventListener('message', this.boundHandleAuthMessage, false);
      } else if ('success' in data) {
        // Direct success/failure (e.g., client credentials)
        successToast(data.message, data.success ? '' : 'Error', data.success ? '' : 'alert');
        if (data.success) {
          // Manually update the local state for the connection to reflect success
          if (this.oauthConnections[selectedConnectionId]) {
            this.oauthConnections[selectedConnectionId].isAuthenticated = true;
            // Store tokens if returned (primarily for client_credentials)
            if (data.primary) {
              // Check if connection has new structure
              if (this.oauthConnections[selectedConnectionId].auth_data) {
                // New structure - store in auth_data
                this.oauthConnections[selectedConnectionId].auth_data.primary = data.primary;
                if (data.secondary) {
                  this.oauthConnections[selectedConnectionId].auth_data.secondary = data.secondary;
                }
                if (data.expires_in) {
                  this.oauthConnections[selectedConnectionId].auth_data.expires_in = data.expires_in;
                }
              } else {
                // Legacy structure - store at root level
                this.oauthConnections[selectedConnectionId].primary = data.primary;
                if (data.secondary) {
                  this.oauthConnections[selectedConnectionId].secondary = data.secondary;
                }
                if (data.expires_in) {
                  this.oauthConnections[selectedConnectionId].expires_in = data.expires_in;
                }
              }
            }
          }
          this.updateSidebarForOAuth(); // Update button text etc.
          await this.updateOAuthConnectionOptions(); // Refresh options to replace legacy entry
          this.refreshSettingsSidebar(); // Refresh the sidebar to show updated name
          this.updateOAuthActionButton(); // Update action button state
          // Note: updateAuthenticationButtonState not needed here as the button was already
          // set to "Sign Out" in updateSidebarForOAuth and we know it's authenticated

          // Update component's button state
          this.checkSettings();
        } else {
          // Update local state to reflect failure
          if (this.oauthConnections[selectedConnectionId]) {
            this.oauthConnections[selectedConnectionId].isAuthenticated = false;
            // Clear tokens from both structures on failure
            if (this.oauthConnections[selectedConnectionId].auth_data) {
              // New structure
              delete this.oauthConnections[selectedConnectionId].auth_data.primary;
              delete this.oauthConnections[selectedConnectionId].auth_data.secondary;
              delete this.oauthConnections[selectedConnectionId].auth_data.expires_in;
            }
            // Legacy structure
            delete this.oauthConnections[selectedConnectionId].primary;
            delete this.oauthConnections[selectedConnectionId].secondary;
            delete this.oauthConnections[selectedConnectionId].expires_in;
          }
          // Refresh sidebar to reflect failed authentication state
          this.refreshSettingsSidebar();
          // Note: updateAuthenticationButtonState will be called through refreshSettingsSidebar if needed
        }
        await this.updateButtonAndRemoveFocusListener(); // Restore button state
      } else {
        console.error('Unexpected response from authentication server:', data);
        throw new Error('Unexpected response from authentication server.');
      }
    } catch (error) {
      errorToast(`Authentication Failed: ${error?.message || error}`, 'Error', 'alert');
      console.error('Error during OAuth initiation:', error);
      // Update local state to reflect failure
      if (this.oauthConnections[selectedConnectionId]) {
        this.oauthConnections[selectedConnectionId].isAuthenticated = false;
        // Clear tokens from both structures on failure
        if (this.oauthConnections[selectedConnectionId].auth_data) {
          // New structure
          delete this.oauthConnections[selectedConnectionId].auth_data.primary;
          delete this.oauthConnections[selectedConnectionId].auth_data.secondary;
          delete this.oauthConnections[selectedConnectionId].auth_data.expires_in;
        }
        // Legacy structure
        delete this.oauthConnections[selectedConnectionId].primary;
        delete this.oauthConnections[selectedConnectionId].secondary;
        delete this.oauthConnections[selectedConnectionId].expires_in;
      }
      // Refresh sidebar to reflect failed authentication state
      this.refreshSettingsSidebar();
      // Note: updateAuthenticationButtonState will be called through refreshSettingsSidebar if needed
      await this.updateButtonAndRemoveFocusListener(); // Restore button state
    }
  }

  /**
   * Listens for authentication messages from a popup or redirected authentication flow, updates the UI
   * based on the success of the authentication, and removes the event listener after processing.
   * @param {MessageEvent} event - The message event from the authentication flow.
   */
  private handleAuthMessage(event: MessageEvent) {
    // Verify message origin
    if (event?.origin !== window?.location?.origin) {
      errorToast('Message origin does not match the current origin.');
      return console.error('Message origin does not match the current origin.');
    }

    // Handle specific message types
    switch (event.data?.type) {
      case 'oauth2':
      case 'oauth':
        // console.log('Authentication was successful');
        successToast(`${event.data.type} authentication was successful`);

        // Clear auth check cache for the current connection after successful auth
        if (this.data.oauth_con_id) {
          this.authCheckPromises.delete(this.data.oauth_con_id);
        }

        this.updateSidebarForOAuth();
        // Refresh options from server to replace any legacy entry with its named/unnamed converted form
        this.updateOAuthConnectionOptions().then(async () => {
          // If the previously selected id was legacy component-specific id, remap to the converted id if necessary
          const currentId = this.data.oauth_con_id;
          if (currentId && this.oauthConnections[currentId] === undefined) {
            // try to find a connection that has the same prefix but now exists only once
            const prefix = (currentId || '').replace(/_TOKENS$/, '');
            const remapped = Object.keys(this.oauthConnections).find((k) => k.startsWith(prefix) && k.endsWith('_TOKENS'));
            if (remapped) {
              this.data.oauth_con_id = remapped;
            }
          }
          this.refreshSettingsSidebar();
          this.updateOAuthActionButton();
          // Update authentication button state after sidebar refresh
          await this.updateAuthenticationButtonState();

          // Update component's button state
          this.checkSettings();
        });
        window.removeEventListener('message', this.boundHandleAuthMessage);
        break;

      case 'error':
        // Only handle errors that come with a data.message property (from OAuth router)
        if (event.data?.data?.message) {
          errorToast(
            `Authentication failed. Recheck your configuration. ${event?.data?.data?.message}`,
            'Error',
            'alert',
          );
        }
        break;

      default:
        // Don't show generic error toast as it might be from other sources
        console.warn('Unhandled message type:', event.data?.type);
        break;
    }
  }

  /**
   * Validates whether a given string is a well-formed URL.
   * @param {string} string - The string to be validated.
   * @returns {boolean} True if the string is a valid URL, false otherwise.
   */
  private isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
 * Checks the current authentication status for the selected connection.
 */
  private async checkAuthentication(): Promise<boolean> {
    const selectedValue = this.data.oauth_con_id;

    // If 'None' or no value is selected, it's not authenticated for this component.
    if (selectedValue === 'None' || !selectedValue) {
      return false;
    }

    // Check if we already have a pending auth check for this connection
    const existingPromise = this.authCheckPromises.get(selectedValue);
    if (existingPromise) {
      // console.log(`[checkAuth] Reusing existing auth check promise for: ${selectedValue}`);
      return existingPromise;
    }

    // console.log(`[checkAuth] Creating new auth check promise for: ${selectedValue}`);
    // Create new auth check promise
    const authCheckPromise = this.performAuthCheck(selectedValue);

    // Store the promise in the cache
    this.authCheckPromises.set(selectedValue, authCheckPromise);

    // Keep the cache for longer to handle rapid successive calls
    // We'll clear it after 1 second to allow all related UI updates to complete
    authCheckPromise.finally(() => {
      setTimeout(() => {
        // Only clear if it's still the same promise (not replaced by a newer one)
        if (this.authCheckPromises.get(selectedValue) === authCheckPromise) {
          this.authCheckPromises.delete(selectedValue);
        }
      }, 1000); // Keep cache for 1 second after completion
    });

    // Also set a timeout to clear stale promises (increase to 5 seconds)
    setTimeout(() => {
      // Only clear if it's still the same promise
      if (this.authCheckPromises.get(selectedValue) === authCheckPromise) {
        this.authCheckPromises.delete(selectedValue);
      }
    }, 5000); // Clear after 5 seconds max

    return authCheckPromise;
  }

  /**
   * Performs the actual authentication check (separated for caching)
   */
  private async performAuthCheck(selectedValue: string): Promise<boolean> {
    // Ensure connections are loaded.
    if (!this.oauthConnections) {
      console.warn('Attempted to check auth status, but oauthConnections is not loaded.');
      return false;
    }

    let connectionId: string | null = null;
    let selectedConnection: any = null;

    // Determine the actual connection ID. It could be the ID directly or the name.
    if (selectedValue.startsWith('OAUTH_') && selectedValue.endsWith('_TOKENS')) {
      // Value looks like an ID
      connectionId = selectedValue;
      selectedConnection = this.oauthConnections[connectionId];
    } else {
      // Value might be a name, try to find the corresponding ID
      const foundEntry = Object.entries(this.oauthConnections).find(
        ([id, conn]: [string, any]) => conn?.auth_settings?.name === selectedValue,
      );
      if (foundEntry) {
        connectionId = foundEntry[0];
        selectedConnection = foundEntry[1];
      }
    }

    // If no valid connection was found by ID or name
    if (!connectionId || !selectedConnection) {
      console.warn(
        `Attempted to check auth status, but connection data is missing or invalid for selection: ${selectedValue}`,
      );
      return false;
    }

    // Get OAuth info from either new or old structure
    const oauthInfo = this.getConnectionOauthInfo(selectedConnection, connectionId);

    // Derive oauth_keys_prefix if not found
    let oauth_keys_prefix = oauthInfo?.oauth_keys_prefix;
    if (!oauth_keys_prefix && connectionId && connectionId.startsWith('OAUTH_') && connectionId.endsWith('_TOKENS')) {
      oauth_keys_prefix = connectionId.replace('_TOKENS', '');
    }

    if (!oauth_keys_prefix) {
      console.warn(`Cannot determine oauth_keys_prefix for connection: ${connectionId}`);
      return false;
    }

    // Call backend checkAuth to get actual authentication status
    const authCheckPayload = {
      oauth_keys_prefix: oauth_keys_prefix,
    };

    // console.log(`[checkAuth] Sending auth check request for ${connectionId}`);

    try {
      const response = await fetch(`${this.workspace.server}/oauth/checkAuth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authCheckPayload),
      });

      if (!response.ok) {
        console.error(
          `Auth check failed for ${oauth_keys_prefix}: HTTP status ${response.status}`,
        );
        return false;
      }

      const data = await response.json();

      // Backend response is the source of truth
      const isAuthenticated = Boolean(data.success);

      // Update local cache with backend result
      if (this.oauthConnections[connectionId]) {
        this.oauthConnections[connectionId].isAuthenticated = isAuthenticated;
      }

      // console.log(`[checkAuth] Connection ${connectionId}: authenticated=${isAuthenticated}`);
      return isAuthenticated;
    } catch (error) {
      console.error(`Error during auth check for ${oauth_keys_prefix}:`, error);
      return false;
    }
  }

  private updateConfiguration(selectedValue, sidebar) {
    if (selectedValue === 'OAuth2 Client Credentials') {
      return null;
    }

    const { cbUrl, key } = this.getOAuthCallbackDetails(selectedValue); // Get the callback details for the selected service
    sidebar.querySelector(`[data-field-name="${key}"] span`).innerHTML = cbUrl; // Update callback URL in the sidebar dynamically based on OAuth version

    const configurations = {
      Google: {
        authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenURL: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        oauth2CallbackURL: cbUrl,
      },
      Twitter: {
        requestTokenURL: 'https://api.twitter.com/oauth/request_token',
        accessTokenURL: 'https://api.twitter.com/oauth/access_token',
        userAuthorizationURL: 'https://api.twitter.com/oauth/authorize',
        oauth1CallbackURL: cbUrl,
      },
      LinkedIn: {
        authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
        scope: 'r_liteprofile r_emailaddress',
        oauth2CallbackURL: cbUrl,
      },
    };
    return configurations[selectedValue]; // Execute the function based on the selected value and get formData if available
  }

  private isOAuth1(selectedService) {
    const oauth1Services = [
      // Define the list of OAuth 1.0 services directly inside the function
      'twitter', // Example OAuth 1.0 service
      // Add more OAuth 1.0 services as needed
    ];
    const serviceLower = selectedService?.toLowerCase();
    return oauth1Services.includes(serviceLower) || serviceLower.includes('oauth1.0'); // Check directly if serviceLower is an OAuth 1.0 service or contains "oauth1.0"
  }

  private getOAuthCallbackDetails(selectedValue) {
    const baseUrl = this.workspace.serverData.frontUrl; // set root url for api
    const isOAuth1 = this.isOAuth1(selectedValue); // Determine if the service uses OAuth1
    const service = this.mapSelectedService(selectedValue); // Map the selected value to a service name
    const cbUrl = `${baseUrl}/oauth/${service}/callback`; // Construct the callback URL
    const key = isOAuth1 ? 'oauth1CallbackURL' : 'oauth2CallbackURL'; // Determine the callbackurl key based on the OAuth version

    return { cbUrl, key, isOAuth1, service };
  }

  protected async run() {
    this.addEventListener('settingsOpened', async (sidebar, component) => {
      if (component != this) return; //check if the sidebar is for this component

      this.eventTriggersActually = false;
      this.handleBodyEditButtons(sidebar);
      await this.addRightSidebarFunction(sidebar);

      // Update the OAuth action button when sidebar opens
      // Note: updateAuthenticationButtonState is already called in addRightSidebarFunction -> setCallbackUrl
      // So we only need to update the action button here
      setTimeout(() => {
        this.updateOAuthActionButton();
      }, 100);
    });
  }

  private async handleBodyEditButtons(sidebar?) {
    if (!sidebar) sidebar = this.getSettingsSidebar();
    await delay(50);
    const bodyElm: any = sidebar.querySelector('#body') as HTMLTextAreaElement;
    const bodyElmParent = bodyElm?.closest('.form-group');
    // code to remove template var buttons as body can be readonly depding on seleted element
    const templateVarButtonContainer: any = bodyElmParent?.lastElementChild;
    if (
      templateVarButtonContainer &&
      templateVarButtonContainer.classList.contains('template-var-buttons')
    ) {
      templateVarButtonContainer.remove();
    }
    const editBtn: HTMLButtonElement = bodyElmParent?.querySelector('#bodyEditBtn');
    const vaultBtn: HTMLButtonElement = bodyElmParent?.querySelector('.vault-action-btn');

    //const _this = event.target as HTMLSelectElement;

    const contentTypeSelect: HTMLSelectElement = sidebar.querySelector(
      '#contentType',
    ) as HTMLSelectElement;
    const value = contentTypeSelect?.value || this.data.contentType;

    /* The 'change' event will trigger when the sidebar open.
                        The following trick will ensure that the value is changed due to user interaction,
                        allowing us to clear the body value*/
    const wrapper = contentTypeSelect?.closest('.select.smt-input-select');

    if (editBtn) {
      if (value === 'multipart/form-data' || value === 'application/x-www-form-urlencoded') {
        editBtn.style.display = 'inline-block';
        bodyElm.setAttribute('readonly', '');
      } else {
        editBtn.style.display = 'none';
        bodyElm.removeAttribute('readonly');
        bodyElm.focus();
      }
    }

    if (vaultBtn) {
      if (value === 'application/json') {
        vaultBtn.style.display = 'inline-block';
      } else {
        vaultBtn.style.display = 'none';
      }
    }

    setTimeout(() => {
      if (value === 'application/json') {
        toggleMode(bodyElm, true);
        const _editor: any = sidebar?.querySelector('#ace-editor-styles');
        if (_editor) {
          _editor.style.minHeight = '80px !important';
        }
        if (value !== this.data.contentType) {
          bodyElm.value = '';
          this.data.body = '';
        }
      } else {
        toggleMode(bodyElm, false);
        destroyCodeEditor(bodyElm);
        bodyElm.classList.remove('hidden');
      }
      if (wrapper && wrapper.classList.contains('focused') && value !== this.data.contentType) {
        bodyElm.value = '';
        bodyElm?._editor?.setValue('');
        this.data.body = '';
      }
      this.data.contentType = value;
    }, 150);
  }

  private async addRightSidebarFunction(sidebar) {
    this.setCallbackUrl(sidebar);
  }

  private async setCallbackUrl(sidebar) {
    const oauthService = sidebar?.querySelector('div[data-name="OAuth"]');
    if (oauthService) {
      const selectedConnectionId = this?.data?.oauth_con_id;
      if (selectedConnectionId && selectedConnectionId !== 'None') {
        // Display callback URL for relevant OAuth types
        const selectedService = this?.data?.oauthService;
        if (selectedService && selectedService !== 'OAuth2 Client Credentials') {
          const { cbUrl, key } = this.getOAuthCallbackDetails(selectedService);
          const callbackURLSpan = sidebar.querySelector(`[data-field-name="${key}"] span`);
          if (callbackURLSpan) {
            callbackURLSpan.innerHTML = cbUrl;
          }
        }

        // Update authentication button state (will check backend)
        // This will be debounced and use cached results
        await this.updateAuthenticationButtonState();
      } else {
        // No OAuth connection selected, show default state (Authenticate)
        const oauth_button: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);
        if (oauth_button) {
          oauth_button.innerHTML = 'Authenticate';
          oauth_button.disabled = false;
        }
      }
    } else {
      // If sidebar element is not found, retry after a short delay
      setTimeout(() => this.setCallbackUrl(sidebar), 20);
    }
  }

  /**
   * Validates OAuth2.0 configuration fields including required scope
   * @returns {Object} Object containing validation result and any missing fields
   */
  private validateOAuth2Fields(fields: Record<string, string>): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = ['authorizationURL', 'tokenURL', 'clientID', 'clientSecret', 'scope'];
    const missingFields = requiredFields.filter((field) => !fields[field]);

    // Additional URL validation
    const urlFields = ['authorizationURL', 'tokenURL'];
    const invalidUrls = urlFields
      .filter((field) => fields[field] && !this.isValidUrl(fields[field]))
      .map((field) => `${field} (invalid URL)`);

    return {
      isValid: missingFields.length === 0 && invalidUrls.length === 0,
      missingFields: [...missingFields, ...invalidUrls],
    };
  }

  /**
   * Validates OAuth1.0 configuration fields
   * @returns {Object} Object containing validation result and any missing fields
   */
  private validateOAuth1Fields(fields: Record<string, string>): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = [
      'requestTokenURL',
      'accessTokenURL',
      'userAuthorizationURL',
      'consumerKey',
      'consumerSecret',
    ];
    const missingFields = requiredFields.filter((field) => !fields[field]);

    // Additional URL validation
    const urlFields = ['requestTokenURL', 'accessTokenURL', 'userAuthorizationURL'];
    const invalidUrls = urlFields
      .filter((field) => fields[field] && !this.isValidUrl(fields[field]))
      .map((field) => `${field} (invalid URL)`);

    return {
      isValid: missingFields.length === 0 && invalidUrls.length === 0,
      missingFields: [...missingFields, ...invalidUrls],
    };
  }

  /**
   * Validates OAuth2 Client Credentials configuration fields
   * @returns {Object} Object containing validation result and any missing fields
   */
  private validateOAuth2ClientCredentialsFields(fields: Record<string, string>): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = ['tokenURL', 'clientID', 'clientSecret'];
    const missingFields = requiredFields.filter((field) => !fields[field]);

    // Additional URL validation
    const urlFields = ['tokenURL'];
    const invalidUrls = urlFields
      .filter((field) => fields[field] && !this.isValidUrl(fields[field]))
      .map((field) => `${field} (invalid URL)`);

    return {
      isValid: missingFields.length === 0 && invalidUrls.length === 0,
      missingFields: [...missingFields, ...invalidUrls],
    };
  }

  /**
   * Validates the current OAuth configuration based on the selected service
   * @returns {Object} Object containing validation result and any missing fields
   */
  private async validateOAuthConfiguration(): Promise<{
    isValid: boolean;
    missingFields: string[];
  }> {
    const selectedService = this.data.oauth_con_id;
    if (selectedService === 'None') {
      return { isValid: true, missingFields: [] };
    }

    const fields = { ...this.data };

    // #region Check if all auth key fields are present in the vault
    const authKeyFields = ['clientID', 'clientSecret', 'consumerKey', 'consumerSecret'];
    let hasMissingKey = false;

    //#region Get vault data
    const { data: vaultData } = await getVaultData({
      scope: undefined,
    });

    const vaultEntries = Object.values(vaultData);
    //#endregion

    for (const keyField of authKeyFields) {
      const value = fields[keyField];
      const checkVaultKeysResult = await this.checkVaultKeys(value, vaultEntries);

      if (checkVaultKeysResult?.missingKeys?.size > 0) {
        hasMissingKey = true;
        break;
      }
    }
    if (hasMissingKey) {
      return { isValid: false, missingFields: [] }; // we handle missing keys separately inside Component.class/index.ts
    }
    // #endregion
    // Special handling for predefined services
    if (['Google', 'LinkedIn'].includes(selectedService)) {
      // For predefined services, ensure scope is required
      if (!fields.scope) {
        return { isValid: false, missingFields: ['scope'] };
      }
    }

    if (selectedService === 'OAuth2 Client Credentials') {
      return this.validateOAuth2ClientCredentialsFields(fields);
    } else if (this.isOAuth1(selectedService)) {
      return this.validateOAuth1Fields(fields);
    } else {
      return this.validateOAuth2Fields(fields);
    }
  }

  public async checkSettings() {
    this.clearComponentMessages();
    this.addComponentMessage('Checking Auth Info...', 'info text-center');
    const authCheck = await this.checkAuthentication();
    await super.checkSettings();

    // Replace temporary status with the final state
    this.clearComponentMessages();

    if (this.data.oauth_con_id && this.data.oauth_con_id !== 'None') {
      if (!authCheck) {
        this.addComponentButton(
          `<div class="fa-solid fa-user-shield"></div><p class="">Authenticate</p>`,
          'warning',
          { class: 'oauthButton' },
          this.collectAndConsoleOAuthValues.bind(this),
        );
      }
    }

    // Note: updateAuthenticationButtonState is not needed here since we already called checkAuthentication
    // which uses the same cached promise that updateAuthenticationButtonState would use
    // The sidebar button will be updated through other paths if needed
  }

  // remove tokens to invalidate authentication
  private async signOutFunction(button) {
    this.activateSpinner(button);
    const sidebar = this.getSettingsSidebar();
    if (!sidebar) return '';
    const oauth_button: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);

    // Accept both id and prefix; backend normalizes
    const authData = {
      oauth_keys_prefix: this.data.oauth_con_id,
      invalidateAuthentication: true,
    };

    try {
      const response = await fetch(`${this.workspace.server}/oauth/signOut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // IMPORTANT: Update local state immediately after successful sign out
      if (data.invalidate) {
        // Update local connection state to reflect sign out
        if (this.oauthConnections && this.data.oauth_con_id) {
          this.clearConnectionAuthenticationState(this.data.oauth_con_id);
        }

        // Clear any legacy authentication state
        this.data.oauthService = 'None';

        // Update button state immediately
        if (oauth_button) {
          oauth_button.innerHTML = 'Authenticate';
          oauth_button.disabled = false;
        }

        // Remove OAuth message if present
        const body = sidebar?.querySelector('div[data-field-name="body"]');
        if (body) {
          const messageId = 'oauthMessageSpan';
          let existingMessageSpan = sidebar?.querySelector(`#${messageId}`);
          if (existingMessageSpan) existingMessageSpan.remove();
        }

        // Show success message
        if (data.message && data.message !== '') {
          successToast(`${data.message}`);
        }

        // Force refresh the sidebar to ensure all states are updated
        this.refreshSettingsSidebar();

        // Note: The authentication button was already updated to "Authenticate" above
        // No need to call updateAuthenticationButtonState again

        // Update component messages
        this.clearComponentMessages();

      } else {
        // Sign out failed
        if (oauth_button) {
          oauth_button.innerHTML = 'Sign Out';
          oauth_button.disabled = false;
        }
        errorToast(`${data.error}`, 'Error', 'alert');
      }
    } catch (error) {
      errorToast(`Error during sign out: ${error.message}`, 'Error', 'alert');
      console.error('Error during sign out:', error);

      // Reset button state on error
      if (oauth_button) {
        oauth_button.innerHTML = 'Sign Out';
        oauth_button.disabled = false;
      }
    }
  }
  private updateSidebarForOAuth() {
    // Note: Removed checkSettings() call here to avoid duplicate auth checks
    // The component messages will be updated through other paths
    const sidebar = this.getSettingsSidebar();
    if (!sidebar) return;
    const body = sidebar?.querySelector('div[data-field-name="body"]');
    const oauth_button: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);
    if (oauth_button) oauth_button.innerHTML = 'Sign Out';
    if (body) {
      const messageId = 'oauthMessageSpan';
      let existingMessageSpan = sidebar?.querySelector(`#${messageId}`);
      if (existingMessageSpan) existingMessageSpan.remove();
      // Create a new message span element
      const messageSpan = document.createElement('small');
      messageSpan.id = messageId; // Assign the unique identifier to the new span
      messageSpan.className = 'p-2 mt-1 mb-0 text-green-500';
      messageSpan.textContent =
        'OAuth Enabled, Authentication headers will be injected at runtime.';
      // Insert the new message span after the body div
      body.parentNode.insertBefore(messageSpan, body.nextSibling);
    }

    // Update component messages separately
    this.clearComponentMessages();
  }
  private async updateAuthenticationButton() {
    // This function is now just a wrapper that calls updateAuthenticationButtonState
    // to leverage the debouncing and caching mechanisms
    await this.updateAuthenticationButtonState();

    // Also update the component button if needed
    const isDataValid = await this.checkAuthentication();
    const cptButton: any = this.domElement?.querySelector('button.oauthButton');
    if (cptButton) {
      cptButton.disabled = false;
      if (!isDataValid) {
        cptButton.innerHTML = `<div class="fa-solid fa-user-shield"></div><p class="">Authenticate</p>`;
      }
    }
  }
  private async handleFocusAfterAuth() {
    if (document.visibilityState === 'visible') {
      // Logic to run when the page regains focus
      this.updateButtonAndRemoveFocusListener();
    }
  }
  private async updateButtonAndRemoveFocusListener() {
    await this.updateAuthenticationButton();
    document.removeEventListener('visibilitychange', this.boundHandleFocusAfterAuth);
  }
  private activateSpinner(button: any) {
    /* Begin spinner activation to indicate loading during authentication process.
     * The spinner is displayed on the button to provide visual feedback that the operation is in progress.
     * Disabling the button prevents multiple submissions.*/
    button.innerHTML = `<span class="oauth-spinner smyth-spinner"></span>&nbsp;&nbsp;In Progress ...`; // Insert spinner HTML with hidden spaces
    button.disabled = true;
  }
  private async handleOAuthConnectionChange(selectedValue: string) {
    const sidebar = this.getSettingsSidebar();
    const previousValue = this.data.oauth_con_id;

    // Clear auth check cache when changing connections
    if (previousValue) {
      this.authCheckPromises.delete(previousValue);
    }

    // First handle the selection change
    if (!selectedValue || selectedValue === 'None') {
      // Clear OAuth-related fields
      this.data.oauth_con_id = 'None';
      const oauth_button: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);
      if (oauth_button) {
        oauth_button.innerHTML = 'Authenticate';
      }
    } else {
      // Set the oauth_con_id in the component's data
      this.data.oauth_con_id = selectedValue;

      // Always synchronize the component's legacy field (oauthService) with the selected connection
      // to avoid stale/broken state across legacy/new structures.
      const selectedConn = this.oauthConnections[selectedValue];
      const selectedOauthInfo = this.getConnectionOauthInfo(selectedConn, selectedValue);
      if (selectedOauthInfo?.service) {
        // Store a user-friendly value for legacy consumers
        this.data.oauthService = mapInternalToServiceName(selectedOauthInfo.service);
      } else {
        this.data.oauthService = 'None';
      }

      // If the selection has changed, check authentication status and update button
      if (selectedValue !== previousValue) {
        // Update button state (this will check backend)
        await this.updateAuthenticationButtonState();
      }
    }

    // Update the action button icon and tooltip
    this.updateOAuthActionButton();
  }

  private async handleOAuthConnectionAction() {
    const currentValue = this.data.oauth_con_id;
    const isNone = !currentValue || currentValue === 'None';
    // console.log('[OAuth Edit] Action started. Current Value:', currentValue, 'Is None:', isNone);
    // Fetch existing OAuth connections ONLY when editing to avoid modal delay on "Add New"
    if (!isNone) {
      try {
        // console.log('[OAuth Edit] Getting OAuth connections from workspace cache for editing...');
        this.oauthConnections = await builderStore.getState().getOAuthConnections();
        // console.log('[OAuth Edit] Retrieved connections for editing:', this.oauthConnections);
      } catch (error) {
        console.error('Error fetching OAuth connections:', error);
        errorToast('Error fetching connections. Please try again.', 'Error', 'alert');
        return;
      }
    } else {
      // Ensure the object exists to avoid any downstream checks
      this.oauthConnections = this.oauthConnections || {};
      // console.log('[OAuth Edit] Creating new connection, using existing connections:', this.oauthConnections);
    }

    // Get current connection if editing and determine structure
    const currentConnectionRaw = !isNone ? this.oauthConnections[currentValue] : null;
    const isNewStructure = currentConnectionRaw && currentConnectionRaw.auth_data && currentConnectionRaw.auth_settings;

    // Extract the settings part based on structure
    const currentSettings = isNewStructure
      ? currentConnectionRaw.auth_settings
      : currentConnectionRaw; // Assume old structure if new one isn't present

    const currentOauthInfo = this.getConnectionOauthInfo(currentSettings, currentValue) || {}; // Support both structures
    const currentName = currentSettings?.name || ''; // Get name from the settings part

    //console.log('[OAuth Edit] Identified Current Connection Settings:', currentSettings);
    //console.log('[OAuth Edit] Identified Current OAuth Info:', currentOauthInfo);

    // Determine service name and platform from the extracted settings
    const currentService = currentSettings
      ? mapInternalToServiceName(currentOauthInfo.service)
      : 'None';
    const currentPlatform = currentOauthInfo.platform || '';

    // Extract values needed for later use in onDOMReady
    const consumerKeyValue = currentOauthInfo.consumerKey || '';
    const consumerSecretValue = currentOauthInfo.consumerSecret || '';

    // Generate form HTML using helper function
    const formHTML = generateOAuthModalHTML(
      currentName,
      currentPlatform,
      currentService,
      currentOauthInfo
    );

    // Show dialog using twEditValuesWithCallback, passing HTML content
    await twEditValuesWithCallback(
      {
        title: isNone ? 'Add OAuth Connection' : 'Edit OAuth Connection',
        content: formHTML,
        onDOMReady: (dialog) => {
          // Get all containers
          const oauth1Container = dialog.querySelector('#oauth1-fields');
          const oauth2Container = dialog.querySelector('#oauth2-fields');
          const callbackDisplayContainer = dialog.querySelector('#callback-url-display');
          const serviceSelect = dialog.querySelector('#oauthService') as HTMLSelectElement;
          const initialServiceValue = serviceSelect?.value || 'None';

          // Force-set OAuth1 fields (our working fix)
          const consumerKeyInput = dialog.querySelector('#consumerKey') as HTMLInputElement;
          const consumerSecretInput = dialog.querySelector('#consumerSecret') as HTMLInputElement;
          if (consumerKeyInput && consumerKeyValue) {
            consumerKeyInput.value = consumerKeyValue;
          }
          if (consumerSecretInput && consumerSecretValue) {
            consumerSecretInput.value = consumerSecretValue;
          }

          // Force-set OAuth2 fields the same way
          const clientIDInput = dialog.querySelector('#clientID') as HTMLInputElement;
          const clientSecretInput = dialog.querySelector('#clientSecret') as HTMLInputElement;
          const tokenURLInput = dialog.querySelector('#tokenURL') as HTMLInputElement;
          const authURLInput = dialog.querySelector('#authorizationURL') as HTMLInputElement;
          const scopeInput = dialog.querySelector('#scope') as HTMLTextAreaElement;

          if (clientIDInput && currentOauthInfo.clientID) {
            clientIDInput.value = currentOauthInfo.clientID;
          }
          if (clientSecretInput && currentOauthInfo.clientSecret) {
            clientSecretInput.value = currentOauthInfo.clientSecret;
          }
          if (tokenURLInput && currentOauthInfo.tokenURL) {
            tokenURLInput.value = currentOauthInfo.tokenURL;
          }
          if (authURLInput && currentOauthInfo.authorizationURL) {
            authURLInput.value = currentOauthInfo.authorizationURL;
          }
          if (scopeInput && currentOauthInfo.scope) {
            scopeInput.value = currentOauthInfo.scope;
          }

          // Comprehensive update field visibility function
          const updateFieldVisibility = (selectedValue: string) => {
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
                const serviceInternal = APICall.prototype.mapServiceNameToInternal.call(
                  this,
                  service,
                );
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
          };

          // Apply initial visibility
          updateFieldVisibility(initialServiceValue);

          // Re-add change handler
          if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => {
              const target = e.target as HTMLSelectElement;
              updateFieldVisibility(target.value);

              // Add this code to prefill values when service changes
              const selectedService = target.value;
              if (['Google', 'Twitter', 'LinkedIn'].includes(selectedService)) {
                // Get default configuration for selected service
                const baseUrl = window.location.origin;
                const service = this.mapServiceNameToInternal(selectedService);
                const callbackUrl = `${baseUrl}/oauth/${service}/callback`;

                // Set default values based on service
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

                // Update callback URL display
                const callbackUrlDiv = callbackDisplayContainer?.querySelector('div.col-span-3');
                if (callbackUrlDiv) {
                  callbackUrlDiv.textContent = callbackUrl;
                }
              }
            });
          }
        },
        actions: [
          {
            label: isNone ? 'Add Connection' : 'Save Changes',
            cssClass:
              'bg-smythos-blue-500 text-white border-transparent hover:bg-smyth-blue ml-auto px-6 py-2 rounded shadow',
            requiresValidation: true,
            callback: async (result, dialogElm) => {
              // Read form data directly from the static form
              const formElement = dialogElm.querySelector(
                '#oauth-connection-form',
              ) as HTMLFormElement;
              if (!formElement) throw new Error('Form element not found');

              const formDataRaw = new FormData(formElement);
              // Ensure all keys exist, even if empty, consistent with how forms work
              const formData: Record<string, string> = {};
              formDataRaw.forEach((value, key) => {
                formData[key] = value as string;
              });

              // --- Basic Validation --- 
              if (!formData.name || formData.name.trim() === '') {
                errorToast('Name field is required.', 'Error', 'alert');
                throw new Error('Validation failed: Name is required.'); // Throw to prevent dialog closing
              }
              if (!formData.platform || formData.platform.trim() === '') {
                errorToast('Platform field is required.', 'Error', 'alert');
                throw new Error('Validation failed: Platform is required.');
              }
              if (!formData.oauthService || formData.oauthService === 'None') {
                errorToast('Auth Service must be selected.', 'Error', 'alert');
                throw new Error('Validation failed: Auth Service is required.');
              }
              // ------------------------

              try {
                const isCreating = isNone;
                const connectionId = isCreating ? `OAUTH_${generateOAuthId()}_TOKENS` : currentValue;
                const service = this.mapServiceNameToInternal(formData.oauthService);
                const type = ['Custom OAuth1.0', 'Twitter'].includes(formData.oauthService)
                  ? 'oauth'
                  : formData.oauthService === 'OAuth2 Client Credentials'
                    ? 'oauth2_client_credentials'
                    : 'oauth2';
                const oauthPrefix = connectionId.replace('_TOKENS', '');

                // 1. Build the new oauth_info object from the form data
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
                  if (type === 'oauth2') { // Only for full OAuth2
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
                // Note: Callback URLs are not explicitly saved, they are derived.

                // 2. Build the auth_settings object to be saved
                const authSettingsToSave = {
                  name: newOauthInfo.name, // Use name from newOauthInfo
                  type: type,
                  tokenURL: (type === 'oauth2' || type === 'oauth2_client_credentials') ? newOauthInfo.tokenURL : undefined,
                  oauth_info: newOauthInfo, // Include the full oauth_info
                };
                // Clean up undefined tokenURL before saving
                if (authSettingsToSave.tokenURL === undefined) delete authSettingsToSave.tokenURL;

                // --- Prepare final connectionData (REMOVED as we only send settings) ---
                // let finalConnectionData: any; ... (Removed old logic)
                // --- End Prepare final connectionData ---

                // 3. Save only the constructed auth_settings
                //console.log('[APICall Save] Saving connection settings:', JSON.stringify(authSettingsToSave, null, 2));
                await saveOAuthConnection(connectionId, authSettingsToSave);
                closeTwDialog(dialogElm); // Manually close dialog on success
                successToast(
                  isNone ? 'Connection created successfully' : 'Connection updated successfully',
                );

                // Clear auth check cache for the edited/created connection
                this.authCheckPromises.delete(connectionId);

                // Invalidate workspace cache and update connection options
                builderStore.getState().invalidateOAuthConnectionsCache();
                await this.updateOAuthConnectionOptions();

                // Update component data and refresh UI elements
                this.data.oauth_con_id = connectionId;
                this.refreshSettingsSidebar();
                this.updateOAuthActionButton(); // Update the edit/add button icon
                // Update authentication button state after sidebar refresh
                await this.updateAuthenticationButtonState();
              } catch (error) {
                console.error('Error saving OAuth connection:', error);
                errorToast(`Error: ${error.message}`, 'Error', 'alert');
                throw error; // Do not close the dialog, throw error to signal failure
              }
            },
          },
        ],
        dialogClasses: 'smyth-modal-beautiful',
      },
      '', // dialogHeight
      '', // minContentHeight
      'auto', // overflowY
      '600px', // minWidth
      '700px', // maxWidth
    );
  }



  // Build OAuth select options from connections with unified name detection and legacy fallback
  private buildOAuthSelectOptions(
    connections: Record<string, any>,
    componentSpecificId: string,
    logPrefix: string,
  ) {
    const options = [];

    // First pass: add ALL connections that have a name property under auth_data (new structure)
    for (const [id, conn] of Object.entries(connections)) {
      if (conn && typeof conn === 'object') {
        // Check for name in the new structure: auth_settings.name
        const connectionName = conn?.auth_settings?.name;

        if (connectionName) {
          // Has a real name
          options.push({
            value: id,
            text: connectionName,
            badge: ''
          });
        } else if (conn?.auth_data && conn?.auth_settings) {
          // New structure but no name - treat as legacy to ensure visibility
          const service = conn?.auth_settings?.service || conn?.auth_settings?.type || 'Unknown';
          const shortId = id.replace('OAUTH_', '').replace('_TOKENS', '');
          options.push({
            value: id,
            text: `${service} [${shortId}]`,
            badge: createBadge('Legacy', 'text-orange-500 border-orange-500 ml-1')
          });
        }
      }
    }

    // Second pass: add legacy connections that still exist AND oauthService is not 'None'
    // This handles the case where legacy connections haven't been converted yet
    if (connections[componentSpecificId] && this.data.oauthService && this.data.oauthService !== 'None') {
      const conn = connections[componentSpecificId];

      // Check if this connection has been converted to new structure
      const hasNewStructure = conn?.auth_data && conn?.auth_settings;

      if (!hasNewStructure) {
        // Only add legacy connection if it hasn't been converted to new structure
        const serviceName = conn?.auth_settings?.oauth_info?.service ||
          conn?.oauth_info?.service ||
          conn?.auth_settings?.type ||
          conn?.type || 'Unknown';
        const shortId = componentSpecificId.replace('OAUTH_', '').replace('_TOKENS', '');

        // Only add if not already in options (avoid duplicates)
        const alreadyExists = options.some(opt => opt.value === componentSpecificId);
        if (!alreadyExists) {
          options.push({
            value: componentSpecificId,
            text: `${serviceName} [${shortId}]`,
            badge: createBadge('Legacy', 'text-orange-500 border-orange-500 ml-1')
          });
        }
      }
    }

    // console.log(`${logPrefix} Built options:`, {
    //   namedConnections: options.filter(opt => !opt.badge).length,
    //   legacyConnections: options.filter(opt => opt.badge).length,
    //   totalOptions: options.length,
    //   hasNewStructure: connections[componentSpecificId]?.auth_data ? 'yes' : 'no',
    //   breakdown: {
    //     withNames: options.filter(opt => !opt.badge).length,
    //     newStructureNoName: options.filter(opt => opt.badge && opt.text.includes('[')).length,
    //     oldLegacy: options.filter(opt => opt.badge && opt.value === componentSpecificId).length
    //   }
    // });

    return options;
  }

  /**
   * Fetches the latest OAuth connections and updates the options in this.settings.
   */
  private async updateOAuthConnectionOptions() {
    try {
      // Force refresh to get latest connections
      this.oauthConnections = await builderStore.getState().getOAuthConnections();

      const componentSpecificId = `OAUTH_${this.uid}_TOKENS`;

      // Use the centralized buildOAuthSelectOptions method
      const options = this.buildOAuthSelectOptions(this.oauthConnections, componentSpecificId, '[APICall.updateOAuthConnectionOptions]');

      // Add 'None' option at the start
      options.unshift({ value: 'None', text: 'None', badge: '' });

      // --- Update the options with badges ---
      if (this.settings?.oauth_con_id) {
        this.settings.oauth_con_id.options = options;
        // console.log('Updated settings.oauth_con_id.options:', this.settings.oauth_con_id.options);
      } else {
        console.warn('Could not find oauth_con_id in settings to update options.');
      }
    } catch (error) {
      console.error('Error updating OAuth connection options:', error);
      if (this.settings?.oauth_con_id) {
        this.settings.oauth_con_id.options = [{ value: 'None', text: 'None' }];
      }
    }
  }

  private updateOAuthActionButton() {
    const sidebar: any = this.getSettingsSidebar();
    if (!sidebar) return;

    // Find or create the action buttons
    const createBtn: any = sidebar.querySelector('#createOAuthConnection');
    const editBtn: any = sidebar.querySelector('#editOAuthConnection');
    const isNone: boolean = !this.data.oauth_con_id || this.data.oauth_con_id === 'None';

    if (createBtn) createBtn.style.display = 'inline-block';
    if (editBtn) editBtn.style.display = isNone ? 'none' : 'inline-block';

    const actionButton: any = sidebar.querySelector('#editOAuthConnection');
    if (!actionButton) return;

    // Update icon and tooltip
    const icon = actionButton.querySelector('i');
    if (icon) {
      icon.className = isNone
        ? 'fa-regular fa-plus' // Create icon
        : 'fa-regular fa-pen-to-square'; // Edit icon
    }

    // Update tooltip/title
    actionButton.setAttribute('title', isNone ? 'Create' : 'Edit');
  }

  private mapServiceNameToInternal(serviceName: string): string {
    const map: Record<string, string> = {
      Google: 'google',
      Twitter: 'twitter',
      LinkedIn: 'linkedin',
      'Custom OAuth2.0': 'oauth2',
      'Custom OAuth1.0': 'oauth1',
      'OAuth2 Client Credentials': 'oauth2_client_credentials',
      None: 'none',
    };
    return map[serviceName] || serviceName.toLowerCase();
  }

  private mapInternalToServiceName(internalName: string): string {
    const map: Record<string, string> = {
      google: 'Google',
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
      oauth2: 'Custom OAuth2.0',
      oauth1: 'Custom OAuth1.0',
      oauth2_client_credentials: 'OAuth2 Client Credentials',
      none: 'None',
    };
    return map[internalName] || internalName;
  }



  /**
   * Clears the authentication state for a specific connection
   * @param connectionId - The ID of the connection to clear
   */
  private clearConnectionAuthenticationState(connectionId: string) {
    if (this.oauthConnections && this.oauthConnections[connectionId]) {
      const connection = this.oauthConnections[connectionId];

      // Mark as not authenticated
      connection.isAuthenticated = false;

      // Clear tokens from both structures
      if (connection.auth_data) {
        // New structure
        delete connection.auth_data.primary;
        delete connection.auth_data.secondary;
        delete connection.auth_data.expires_in;
      }

      // Legacy structure
      delete connection.primary;
      delete connection.secondary;
      delete connection.expires_in;

      // Clear any cached auth check promises for this connection
      this.authCheckPromises.delete(connectionId);

      // console.log(`Cleared authentication state for connection: ${connectionId}`);
    }
  }

  /**
   * Updates the authentication button state based on current connection status
   */
  private async updateAuthenticationButtonState() {
    // Clear any existing debounce timer
    if (this.updateAuthButtonDebounceTimer) {
      clearTimeout(this.updateAuthButtonDebounceTimer);
    }

    // Debounce the actual update to prevent rapid successive calls
    return new Promise<void>((resolve) => {
      this.updateAuthButtonDebounceTimer = setTimeout(async () => {
        await this.performAuthButtonUpdate();
        resolve();
      }, 150); // Increased to 150ms debounce to better group rapid calls
    });
  }

  /**
   * Performs the actual authentication button state update
   */
  private async performAuthButtonUpdate() {
    const sidebar = this.getSettingsSidebar();
    if (!sidebar) return;

    const oauth_button: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);
    if (!oauth_button) return;

    // console.log(`[performAuthButtonUpdate] Updating button for connection: ${this.data.oauth_con_id}`);

    // Show loading state while checking
    this.activateSpinner(oauth_button);

    // Check authentication status with backend for accurate state
    let isAuthenticated = false;
    if (this.data.oauth_con_id && this.data.oauth_con_id !== 'None') {
      // Always verify with backend to ensure accurate state
      isAuthenticated = await this.checkAuthentication();
    }

    oauth_button.innerHTML = isAuthenticated ? 'Sign Out' : 'Authenticate';
    oauth_button.disabled = false;
  }
}
