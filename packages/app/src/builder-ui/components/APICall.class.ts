import { errorToast, successToast } from '@src/shared/components/toast';
import { API_CALL_DATA_ENTRIES, SMYTHOS_DOCS_URL } from '@src/shared/constants/general'; // Adjust the path as necessary
import { COMP_NAMES } from '../config';
import { destroyCodeEditor, toggleMode } from '../ui/dom';
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
        help: `Headers pass essential metadata like Content-Type and authentication details. <br />Edit them in the API component settings to match your API’s requirements. <br /><a style="color: #3b82f6;text-decoration: underline;" href="${SMYTHOS_DOCS_URL}/agent-studio/components/advanced/api-call" target="_blank">See headers guide →</a>`,
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
      oauthService: {
        type: 'select',
        label: 'Authentication Service',
        section: 'OAuth',
        sectionHelp:
          'SmythOS supports OAuth 2.0 with OpenID Connect (OIDC) for secure user authentication and authorization.',
        sectionTooltipClasses: 'w-64 ml-12',
        sectionArrowClasses: '-ml-11',
        options: [
          'None',
          'Google',
          'Twitter',
          'LinkedIn',
          'Custom OAuth2.0',
          'Custom OAuth1.0',
          'OAuth2 Client Credentials',
        ],
        value: 'None',
        events: {
          change: (event) => this.handleServiceChange(event.target.value),
        },
      },
      scope: {
        type: 'textarea',
        label: 'Scopes *',
        section: 'OAuth',
        value: '', // Default empty, can be pre-filled based on service selection
      },
      authorizationURL: {
        type: 'input',
        label: 'Authorization URL (OAuth2.0) *',
        section: 'OAuth',
        value: '', // Default empty, can be pre-filled based on service selection
      },
      tokenURL: {
        type: 'input',
        label: 'Token URL (OAuth2.0) *',
        section: 'OAuth',
        value: '',
      },
      clientID: {
        type: 'input',
        label: 'Client ID *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `${COMP_NAMES.apiCall},All` },
      },
      clientSecret: {
        type: 'input',
        label: 'Client Secret *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `${COMP_NAMES.apiCall},All` },
      },
      oauth2CallbackURL: {
        type: 'div',
        html: `Callback URL (OAuth2.0)<br /><br /><span></span>`,
        label: 'Callback URL (OAuth2.0)',
        section: 'OAuth',
        // Setting default value to empty string ('') triggers 'setting changed' popup initially because when we check for setting changes, the value of the element is undefined since it's a div.
      },

      // OAuth1.0 Inputs
      requestTokenURL: {
        type: 'input',
        label: 'Request Token URL (OAuth1.0) *',
        section: 'OAuth',
        value: '',
      },
      accessTokenURL: {
        type: 'input',
        label: 'Access Token URL (OAuth1.0) *',
        section: 'OAuth',
        value: '',
      },
      userAuthorizationURL: {
        type: 'input',
        label: 'User Authorization URL (OAuth1.0) *',
        section: 'OAuth',
        value: '',
      },
      consumerKey: {
        type: 'input',
        label: 'Consumer Key (OAuth1.0) *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `APICall, All` },
      },
      consumerSecret: {
        type: 'input',
        label: 'Consumer Secret (OAuth1.0) *',
        section: 'OAuth',
        value: '',
        attributes: { 'data-vault': `APICall, All` },
      },
      oauth1CallbackURL: {
        // Renamed to avoid conflict with OAuth2.0 callback URL
        type: 'div',
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
    const serviceMap = {
      'OAuth2 Client Credentials': 'oauth2_client_credentials',
      'Custom OAuth1.0': 'oauth1',
      'Custom OAuth2.0': 'oauth2',
      Google: 'google',
      LinkedIn: 'linkedin',
      Twitter: 'twitter',
    };
    return serviceMap[service] || service.toLowerCase();
  }

  /**
   * Collects current OAuth values from the right sidebar, constructs a request payload, and sends it to
   * the server for checking or initializing OAuth authentication. Opens the authentication URL if provided.
   * @param {Event} event - The event object, not used in this function.
   */
  private async collectAndConsoleOAuthValues(event) {
    const selectedService = this.data.oauthService;
    if (selectedService === 'None') {
      errorToast('You did not select any Authentication Service');
      return console.log('No OAuth service selected.');
    }

    // Validate configuration before proceeding
    const { isValid, missingFields } = await this.validateOAuthConfiguration();
    if (!isValid) {
      // Convert camelCase field names to readable format with spaces before capital letters
      // Example: "clientId" becomes "client id", but "URL" stays as "url"
      const camelCasePattern = /([a-z])([A-Z])/g; // Only matches capital letters preceded by lowercase

      const formattedFields = missingFields
        .map((field) => field.replace(camelCasePattern, '$1 $2').toLowerCase())
        .join(', ');

      errorToast(`Please configure the following fields: ${formattedFields}`);
      return;
    }

    const { cbUrl, service, key, isOAuth1 } = this.getOAuthCallbackDetails(selectedService);
    let fieldsToCollect = [
      ...(isOAuth1
        ? [
            'requestTokenURL',
            'accessTokenURL',
            'userAuthorizationURL',
            'consumerKey',
            'consumerSecret',
            'oauth1CallbackURL',
          ]
        : []),
      ...(!isOAuth1
        ? ['authorizationURL', 'tokenURL', 'clientID', 'clientSecret', 'oauth2CallbackURL']
        : []),
      'scope',
    ];
    if (selectedService === 'OAuth2 Client Credentials') {
      // Remove 'authorizationURL', 'oauth2CallbackURL', and 'scope' from fieldsToUse
      fieldsToCollect = fieldsToCollect.filter(
        (field) => !['authorizationURL', 'oauth2CallbackURL', 'scope'].includes(field),
      );
    }
    let emptyFields = [];
    let invalidUrls = [];
    let values: any = fieldsToCollect?.reduce((acc, field) => {
      // Collect current OAuth values from saved data.
      const value = this.data[field];
      if (!value) emptyFields?.push(field); // Check for empty fields and collect names of empty fields
      if (
        ['requestTokenURL', 'accessTokenURL', 'userAuthorizationURL', 'authorizationURL'].includes(
          field,
        ) &&
        value &&
        !this.isValidUrl(value)
      ) {
        invalidUrls.push(field);
      }
      return { ...acc, [field]: value };
    }, {});

    if (emptyFields.length > 0) {
      // for empty fields, except scpoe (for oauth1) and callbackurl (oauth1 and oauth1), show error message and return
      const isSingleOAuth1Scope =
        isOAuth1 && emptyFields.length === 1 && emptyFields[0] === 'scope';
      const isSingleCallbackField =
        emptyFields.length === 1 &&
        (emptyFields.includes('oauth2CallbackURL') || emptyFields.includes('oauth1CallbackURL'));
      if (!isSingleOAuth1Scope && !isSingleCallbackField) {
        const exclusions = [
          'oauth2CallbackURL',
          'oauth1CallbackURL',
          ...(isOAuth1 ? ['scope'] : []),
        ];
        const formattedFieldNames = emptyFields
          .filter((field) => !exclusions.includes(field))
          .join(', ');
        if (formattedFieldNames) {
          // Proceed only if there's something to show
          errorToast(`Please fill in the following fields: ${formattedFieldNames}`);
          return console.log(`Error: The following fields are empty: ${formattedFieldNames}`);
        }
      }
    }

    if (invalidUrls.length > 0) {
      // Handle invalid URLs
      const formattedInvalidUrls = invalidUrls.join(', ');
      errorToast(`The following fields do not contain valid URLs: ${formattedInvalidUrls}`);
      return console.log(`Error: The following fields have invalid URLs: ${formattedInvalidUrls}`);
    }

    if (selectedService !== 'OAuth2 Client Credentials') {
      values[key] = cbUrl;
    }
    const url = `${this.workspace.server}/oauth/${
      selectedService === 'OAuth2 Client Credentials' ? 'client_credentials' : 'init'
    }`;
    const authData = { oauth_keys_prefix: `OAUTH_${this.uid}`, service, ...values };

    this.activateSpinner(event.target);
    /* The 'visibilitychange' event listener is set up to handle focus once the authentication tab/window is closed. */
    document.addEventListener('visibilitychange', this.boundHandleFocusAfterAuth);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      const data = await response.json();
      if (data.authUrl) {
        window.open(data.authUrl, '_blank');
        window.addEventListener('message', this.boundHandleAuthMessage, false);
      } else if ('success' in data) {
        if (data.success) {
          successToast(data.message);
        } else {
          errorToast(data.message);
        }
        if (data.success) this.updateSidebarForOAuth();
        await this.updateButtonAndRemoveFocusListener();
      } else {
        console.error('Authentication URL was not returned from the server.');
        errorToast('Authentication URL was not returned from the server.');
        await this.updateButtonAndRemoveFocusListener();
      }
    } catch (error) {
      errorToast(`Authentication Failed: ${error?.message || error}`);
      console.error('Error:', error);
      await this.updateButtonAndRemoveFocusListener();
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
        console.log('Authentication was successful');
        successToast(`${event.data.type} authentication was successful`);
        this.updateSidebarForOAuth();
        window.removeEventListener('message', this.boundHandleAuthMessage);
        break;

      case 'error':
        // Only handle errors that come with a data.message property (from OAuth router)
        if (event.data?.data?.message) {
          errorToast(
            `Authentication failed. Recheck your configuration. ${event?.data?.data?.message}`,
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
   * Checks the current authentication setup by collecting form oauth values, sending them to the server, comparing the saved and current,
   * and evaluating the success response. Also includes error handling for the request and response parsing.
   */
  private async checkAuthentication() {
    const currentAuthProvider = this.data.oauthService; // Fetch the current value of the auth provider from data.
    if (currentAuthProvider === 'None') {
      // Case 1: If the auth provider is 'None', directly return true.
      return true;
    }
    const { cbUrl, key, service, isOAuth1 } = this.getOAuthCallbackDetails(currentAuthProvider);
    let fieldsToCollect = [
      ...(isOAuth1
        ? [
            'requestTokenURL',
            'accessTokenURL',
            'userAuthorizationURL',
            'consumerKey',
            'consumerSecret',
            'oauth1CallbackURL',
          ]
        : []),
      ...(!isOAuth1
        ? ['authorizationURL', 'tokenURL', 'clientID', 'clientSecret', 'oauth2CallbackURL']
        : []),
      'scope',
    ];
    if (currentAuthProvider === 'OAuth2 Client Credentials') {
      // Remove 'authorizationURL', 'oauth2CallbackURL', and 'scope' from fieldsToUse
      fieldsToCollect = fieldsToCollect.filter(
        (field) => !['authorizationURL', 'oauth2CallbackURL', 'scope'].includes(field),
      );
    }
    let values = fieldsToCollect.reduce((acc, field) => {
      // Collect current OAuth values from the saved data. Reduce the fields to an object with their current values inside data.
      const value = this.data[field];
      return { ...acc, [field]: value };
    }, {});

    currentAuthProvider === 'OAuth2 Client Credentials'
      ? (values[`service`] = 'oauth2_client_credentials')
      : (values[key] = cbUrl);
    const authData = { oauth_keys_prefix: `OAUTH_${this.uid}`, ...values };
    try {
      const response = await fetch(`${this.workspace.server}/oauth/checkAuth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      try {
        const data = await response.json();
        return data.success; // 'data.success' is a boolean indicating the authentication check result.
      } catch (e) {
        console.error('Failed to parse JSON response:', e); // If there is an error parsing JSON
        return false;
      }
    } catch (error) {
      console.error('Error during fetching or network issue:', error);
      return false; // Return false if there's a network issue or the fetch fails.
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
      const selectedService = this?.data?.oauthService;
      if (selectedService && this.data.oauthService !== 'None') {
        if (this.data.oauthService !== 'OAuth2 Client Credentials') {
          const { cbUrl, key } = this.getOAuthCallbackDetails(selectedService);
          const callbackURLSpan = sidebar.querySelector(`[data-field-name="${key}"] span`); // Combine the querySelector and innerHTML setting to minimize DOM queries
          if (callbackURLSpan) {
            callbackURLSpan.innerHTML = cbUrl;
          }
        }
        const isDataValid = await this.checkAuthentication();
        if (isDataValid) {
          const oauth_button: any = sidebar?.querySelector(
            `[data-field-name="authenticate"] button`,
          );
          if (oauth_button) oauth_button.innerHTML = 'Sign Out';
        }
      }
    } else {
      setTimeout(this.setCallbackUrl, 20);
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
    const selectedService = this.data.oauthService;
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

    // Only show the builder button if both authentication check fails AND all fields are properly configured
    const { isValid } = await this.validateOAuthConfiguration();
    const existingButton = this.domElement?.querySelector('button.oauthButton');

    // We only show the authenticate button if:
    // 1. Not authenticated (authCheck is false)
    // 2. All required fields are configured (isValid is true)
    // 3. A service is selected (this.data.oauthService !== 'None')
    if (!authCheck && isValid && this.data.oauthService !== 'None' && !existingButton) {
      this.addComponentButton(
        `<div class="fa-solid fa-user-shield"></div><p class="">Authenticate</p>`,
        'warning',
        {
          class: 'oauthButton',
        },
        this.collectAndConsoleOAuthValues.bind(this),
      );
    }
  }

  // remove tokens to invalidate authentication
  private async signOutFunction(button) {
    this.activateSpinner(button);
    const sidebar = this.getSettingsSidebar();
    if (!sidebar) return '';
    const oauth_button: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);
    const authData = {
      oauth_keys_prefix: `OAUTH_${this.uid}_TOKENS`,
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
      if (oauth_button) {
        button.disabled = false;
        if (data.invalidate) {
          // Check if the sign out was successful. 'data.invalidate' indicates successful sign-out
          oauth_button.innerHTML = 'Authenticate'; // Update the button's text to 'Authenticate' after signing out
          const body = sidebar?.querySelector('div[data-field-name="body"]');
          if (body) {
            const messageId = 'oauthMessageSpan';
            let existingMessageSpan = sidebar?.querySelector(`#${messageId}`);
            if (existingMessageSpan) existingMessageSpan.remove();
          }
          if (data.message && data.message !== '') successToast(`${data.message}`);
        } else {
          oauth_button.innerHTML = 'Sign Out'; // Update the button's text to 'Authenticate' after signing out
          errorToast(`${data.error}`);
        }
      }
    } catch (error) {
      errorToast(`Error during fetching or network issue`);
      console.error('Error during fetching or network issue:', error);
      oauth_button.innerHTML = 'Sign Out';
      button.disabled = false;
    }
  }
  private updateSidebarForOAuth() {
    this.checkSettings();
    const sidebar = this.getSettingsSidebar();
    if (!sidebar) return '';
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
  }
  private async updateAuthenticationButton() {
    const sidebar = this.getSettingsSidebar();
    const isDataValid = await this.checkAuthentication();
    if (sidebar) {
      const oauthButton: any = sidebar?.querySelector(`[data-field-name="authenticate"] button`);
      if (oauthButton) {
        oauthButton.disabled = false;
        if (isDataValid) {
          oauthButton.innerHTML = 'Sign Out';
        } else {
          oauthButton.innerHTML = 'Authenticate';
        }
      }
    }
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
}
