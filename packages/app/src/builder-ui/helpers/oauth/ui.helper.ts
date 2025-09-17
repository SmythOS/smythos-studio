import { generateOAuthModalHTML } from '@src/builder-ui/helpers/oauth/oauth-modal.helper';
import { twEditValuesWithCallback } from '@src/builder-ui/ui/tw-dialogs';
import { errorToast, successToast } from '@src/shared/components/toast';
import { getConnectionOauthInfo } from '@src/shared/helpers/oauth/oauth-api.helper';
import { OAuthServicesRegistry } from '@src/shared/helpers/oauth/oauth-services.helper';
import { generateOAuthId, mapInternalToServiceName } from '@src/shared/helpers/oauth/oauth.utils';
import type { OAuthConnection } from './oauth.types';

export class UIHelper {
  constructor(private component: any) {}

  /**
   * Get sidebar element
   */
  getSidebarElement(): HTMLElement | null {
    return this.component.getSettingsSidebar() as HTMLElement | null;
  }

  /**
   * Get authentication button from sidebar
   */
  getAuthButton(): HTMLButtonElement | null {
    const sidebar = this.getSidebarElement();
    if (!sidebar) return null;
    return sidebar.querySelector(
      `[data-field-name='authenticate'] button`,
    ) as HTMLButtonElement | null;
  }

  /**
   * Update sidebar for OAuth success
   */
  updateSidebarForOAuth(): void {
    const sidebar = this.getSidebarElement();
    if (!sidebar) return;

    const authButton = this.getAuthButton();
    if (authButton) authButton.innerHTML = 'Sign Out';

    const body = sidebar.querySelector('div[data-field-name="body"]');
    if (body) {
      this.removeExistingOAuthMessage(sidebar);
      this.addOAuthSuccessMessage(body);
    }

    this.component.clearComponentMessages();
  }

  /**
   * Update authentication button state
   */
  async updateAuthButtonState(isAuthenticated: boolean): Promise<void> {
    const authButton = this.getAuthButton();
    if (!authButton) return;

    authButton.innerHTML = isAuthenticated ? 'Sign Out' : 'Authenticate';
    authButton.disabled = false;
  }

  /**
   * Show spinner on button
   */
  activateSpinner(button: HTMLButtonElement): void {
    button.innerHTML = `<span class="oauth-spinner smyth-spinner"></span>&nbsp;&nbsp;In Progress ...`;
    button.disabled = true;
  }

  /**
   * Update OAuth action buttons visibility
   */
  updateOAuthActionButtons(hasConnection: boolean): void {
    const sidebar = this.getSidebarElement();
    if (!sidebar) return;

    const createBtn = sidebar.querySelector('#createOAuthConnection') as HTMLElement;
    const editBtn = sidebar.querySelector('#editOAuthConnection') as HTMLElement;

    if (createBtn) createBtn.style.display = 'inline-block';
    if (editBtn) editBtn.style.display = hasConnection ? 'inline-block' : 'none';

    // Update edit button icon and tooltip
    const icon = editBtn?.querySelector('i');
    if (icon) {
      icon.className = hasConnection ? 'fa-regular fa-pen-to-square' : 'fa-regular fa-plus';
    }
    editBtn?.setAttribute('title', hasConnection ? 'Edit' : 'Create');
  }

  /**
   * Show OAuth connection modal
   */
  async showConnectionModal(
    currentValue: string,
    connections: Record<string, OAuthConnection>,
    onSave: (formData: Record<string, string>, connectionId: string) => Promise<void>,
  ): Promise<void> {
    const isNone = !currentValue || currentValue === 'None';
    const currentConnection = !isNone ? connections[currentValue] : null;
    const currentSettings = currentConnection?.auth_settings;
    const currentOauthInfo = getConnectionOauthInfo(currentSettings, currentValue) || {};
    const currentName = currentSettings?.name || '';
    const currentService = currentSettings
      ? mapInternalToServiceName(currentOauthInfo.service)
      : 'None';
    const currentPlatform = currentOauthInfo.platform || '';

    const formHTML = generateOAuthModalHTML(
      currentName,
      currentPlatform,
      currentService,
      currentOauthInfo,
    );

    await twEditValuesWithCallback(
      {
        title: isNone ? 'Add OAuth Connection' : 'Edit OAuth Connection',
        content: formHTML,
        onDOMReady: (dialog) => {
          this.setupModalHandlers(dialog, currentOauthInfo);
        },
        actions: [
          {
            label: isNone ? 'Add Connection' : 'Save Changes',
            cssClass:
              'bg-smythos-blue-500 text-white border-transparent hover:bg-smyth-blue ml-auto px-6 py-2 rounded shadow',
            requiresValidation: true,
            callback: async (result, dialogElm) => {
              try {
                const formData = this.extractFormData(dialogElm);

                if (!this.validateFormData(formData)) {
                  console.log('[UIHelper] Validation failed, keeping dialog open');
                  return; // Don't close dialog on validation failure
                }

                const connectionId = isNone ? `OAUTH_${generateOAuthId()}_TOKENS` : currentValue;

                await onSave(formData, connectionId);

                // Show success message
                successToast(
                  isNone ? 'Connection created successfully' : 'Connection updated successfully',
                );
                // Close dialog manually using the same logic as the internal closeDialog function
                const dialogOverlay = dialogElm.querySelector('.__overlay');
                const dialogDialog = dialogElm.querySelector('.__dialog');

                if (dialogOverlay && dialogDialog) {
                  dialogOverlay.classList.remove('opacity-100');
                  dialogOverlay.classList.remove('opacity-0');
                  dialogDialog.classList.remove('scale-100');
                  dialogDialog.classList.add('scale-0');

                  // Remove dialog after animation
                  setTimeout(() => {
                    dialogElm.remove();
                  }, 300);
                }

                return;
              } catch (error) {
                console.error('Error saving OAuth connection:', error);
                errorToast(`Error: ${error?.message || error}`, 'Error', 'alert');
                // Don't close dialog on error - let user retry
              }
            },
          },
        ],
        dialogClasses: 'smyth-modal-beautiful',
      },
      '',
      '',
      'auto',
      '600px',
      '700px',
    );
  }

  // Private helper methods
  private removeExistingOAuthMessage(sidebar: HTMLElement): void {
    const existingMessage = sidebar.querySelector('#oauthMessageSpan');
    if (existingMessage) existingMessage.remove();
  }

  private addOAuthSuccessMessage(body: Element): void {
    const messageSpan = document.createElement('small');
    messageSpan.id = 'oauthMessageSpan';
    messageSpan.className = 'p-2 mt-1 mb-0 text-green-500';
    messageSpan.textContent = 'OAuth Enabled, Authentication headers will be injected at runtime.';
    body.parentNode?.insertBefore(messageSpan, body.nextSibling);
  }

  private setupModalHandlers(dialog: HTMLElement, currentOauthInfo: any): void {
    const serviceSelect = dialog.querySelector('#oauthService') as HTMLSelectElement;
    const oauth1Container = dialog.querySelector('#oauth1-fields');
    const oauth2Container = dialog.querySelector('#oauth2-fields');
    const callbackDisplayContainer = dialog.querySelector('#callback-url-display');

    // Set initial values
    this.setInitialFormValues(dialog, currentOauthInfo);

    // Setup field visibility handler
    const updateFieldVisibility = (selectedValue: string) => {
      const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(selectedValue);
      const isOAuth1 = OAuthServicesRegistry.isOAuth1Service(selectedValue);
      const isClientCreds = OAuthServicesRegistry.isClientCredentialsService(selectedValue);

      oauth1Container?.classList.toggle('hidden', !isOAuth1);
      oauth2Container?.classList.toggle('hidden', !(isOAuth2 || isClientCreds));

      const scopeGroup = dialog.querySelector('[data-oauth-field="scope"]');
      const authURLGroup = dialog.querySelector('#authorizationURL')?.closest('.form-group');

      scopeGroup?.classList.toggle('hidden', isClientCreds || !isOAuth2);
      authURLGroup?.classList.toggle('hidden', isClientCreds || !isOAuth2);

      this.updateCallbackDisplay(
        callbackDisplayContainer,
        selectedValue,
        isClientCreds,
        isOAuth2,
        isOAuth1,
      );
    };

    // Apply initial visibility and setup change handler
    updateFieldVisibility(serviceSelect?.value || 'None');
    serviceSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      updateFieldVisibility(target.value);
      this.prefillServiceDefaults(dialog, target.value, callbackDisplayContainer);
    });
  }

  private setInitialFormValues(dialog: HTMLElement, currentOauthInfo: any): void {
    const fields = [
      { id: '#consumerKey', value: currentOauthInfo.consumerKey },
      { id: '#consumerSecret', value: currentOauthInfo.consumerSecret },
      { id: '#clientID', value: currentOauthInfo.clientID },
      { id: '#clientSecret', value: currentOauthInfo.clientSecret },
      { id: '#tokenURL', value: currentOauthInfo.tokenURL },
      { id: '#authorizationURL', value: currentOauthInfo.authorizationURL },
      { id: '#scope', value: currentOauthInfo.scope },
    ];

    fields.forEach(({ id, value }) => {
      const input = dialog.querySelector(id) as HTMLInputElement | HTMLTextAreaElement;
      if (input && value) input.value = value;
    });
  }

  private updateCallbackDisplay(
    container: Element | null,
    selectedValue: string,
    isClientCreds: boolean,
    isOAuth2: boolean,
    isOAuth1: boolean,
  ): void {
    if (!container) return;

    container.classList.toggle('hidden', isClientCreds || (!isOAuth2 && !isOAuth1));

    if (!container.classList.contains('hidden')) {
      const callbackUrlDiv = container.querySelector('div.col-span-3');
      if (callbackUrlDiv && selectedValue !== 'None') {
        const serviceInternal = this.mapServiceNameToInternal(selectedValue);
        const callbackURL =
          serviceInternal !== 'none'
            ? `${window.location.origin}/oauth/${serviceInternal}/callback`
            : '';
        callbackUrlDiv.textContent = callbackURL;
      }
    }
  }

  private prefillServiceDefaults(
    dialog: HTMLElement,
    selectedService: string,
    callbackContainer: Element | null,
  ): void {
    const serviceDefaults = OAuthServicesRegistry.getServiceDefaults(selectedService);
    if (!serviceDefaults || Object.keys(serviceDefaults).length === 0) return;

    Object.entries(serviceDefaults).forEach(([field, value]) => {
      const input = dialog.querySelector(`#${field}`) as HTMLInputElement | HTMLTextAreaElement;
      if (input) input.value = value;
    });

    // Update callback URL
    const callbackUrlDiv = callbackContainer?.querySelector('div.col-span-3');
    if (callbackUrlDiv) {
      const service = this.mapServiceNameToInternal(selectedService);
      callbackUrlDiv.textContent = `${window.location.origin}/oauth/${service}/callback`;
    }
  }

  private extractFormData(dialogElm: HTMLElement): Record<string, string> {
    const formElement = dialogElm.querySelector('#oauth-connection-form') as HTMLFormElement;
    if (!formElement) throw new Error('Form element not found');

    const formDataRaw = new FormData(formElement);
    const formData: Record<string, string> = {};
    formDataRaw.forEach((value, key) => {
      formData[key] = value as string;
    });
    return formData;
  }

  private validateFormData(formData: Record<string, string>): boolean {
    // Basic required fields
    const basicFields = [
      { field: 'name', message: 'Name field is required.' },
      { field: 'platform', message: 'Platform field is required.' },
      { field: 'oauthService', message: 'Auth Service must be selected.', invalidValue: 'None' },
    ];

    for (const { field, message, invalidValue } of basicFields) {
      const value = formData[field]?.trim();
      if (!value || value === invalidValue) {
        errorToast(message, 'Error', 'alert');
        return false; // Don't throw, just return false
      }
    }

    // OAuth service-specific validation
    const oauthService = formData.oauthService;
    if (oauthService && oauthService !== 'None') {
      const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(oauthService);
      const isOAuth1 = OAuthServicesRegistry.isOAuth1Service(oauthService);
      const isClientCreds = OAuthServicesRegistry.isClientCredentialsService(oauthService);

      if (isOAuth2) {
        // OAuth2 validation
        if (!formData.clientID?.trim()) {
          errorToast('Client ID is required for OAuth2 services.', 'Error', 'alert');
          return false;
        }
        if (!formData.clientSecret?.trim()) {
          errorToast('Client Secret is required for OAuth2 services.', 'Error', 'alert');
          return false;
        }
        if (!formData.tokenURL?.trim()) {
          errorToast('Token URL is required for OAuth2 services.', 'Error', 'alert');
          return false;
        }

        // Additional validation for non-client-credentials flows
        if (!isClientCreds) {
          if (!formData.authorizationURL?.trim()) {
            errorToast(
              'Authorization URL is required for OAuth2 authorization flows.',
              'Error',
              'alert',
            );
            return false;
          }
          if (!formData.scope?.trim()) {
            errorToast('Scope is required for OAuth2 authorization flows.', 'Error', 'alert');
            return false;
          }
        }
      } else if (isOAuth1) {
        // OAuth1 validation
        if (!formData.consumerKey?.trim()) {
          errorToast('Consumer Key is required for OAuth1 services.', 'Error', 'alert');
          return false;
        }
        if (!formData.consumerSecret?.trim()) {
          errorToast('Consumer Secret is required for OAuth1 services.', 'Error', 'alert');
          return false;
        }
        if (!formData.requestTokenURL?.trim()) {
          errorToast('Request Token URL is required for OAuth1 services.', 'Error', 'alert');
          return false;
        }
        if (!formData.accessTokenURL?.trim()) {
          errorToast('Access Token URL is required for OAuth1 services.', 'Error', 'alert');
          return false;
        }
        if (!formData.userAuthorizationURL?.trim()) {
          errorToast('User Authorization URL is required for OAuth1 services.', 'Error', 'alert');
          return false;
        }
      }
    }

    return true;
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
}
