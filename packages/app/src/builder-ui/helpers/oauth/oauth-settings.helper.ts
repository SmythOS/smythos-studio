import { errorToast, successToast } from '@src/shared/components/toast';
import { OAuthService } from './oauth.service';
import type { SelectOption } from './oauth.types';
import { UIHelper } from './ui.helper';

/**
 * OAuth Settings Helper Class
 *
 * This class encapsulates all OAuth-related logic and provides a clean interface
 * for components to integrate OAuth functionality without cluttering the component code.
 */
export class oAuthSettings {
  private component: any;
  private oauthService: OAuthService | undefined;
  private uiHelper: UIHelper | undefined;
  private oauthConnectionNames: SelectOption[] = [];
  private updateAuthButtonDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private boundHandleFocusAfterAuth: () => Promise<void>;
  private boundHandleAuthMessage: (event: MessageEvent) => void;

  constructor(component: any) {
    this.component = component;
    this.boundHandleFocusAfterAuth = this.handleFocusAfterAuth.bind(this);
    this.boundHandleAuthMessage = this.handleAuthMessage.bind(this);
  }

  /**
   * Public: Add component-level Authenticate button if not authenticated.
   * Minimal integration so other components can just call oauth.checkSettings().
   */
  public async checkSettings(): Promise<void> {
    const connectionId: string | undefined = this.component?.data?.oauth_con_id;
    const existingBtn = this.component?.domElement?.querySelector('button.oauthButton') as HTMLButtonElement || null;

    // If no connection chosen, remove component-level button (if any) and exit
    if (!connectionId || connectionId === 'None') {
      if (existingBtn) this.component.clearComponentMessages();
      return;
    }

    // Show temporary checking status while verifying auth
    this.component.clearComponentMessages();
    this.component.addComponentMessage('Checking Auth Info...', 'info text-center');

    // If authenticated, ensure no redundant component-level button remains
    const authed = await this.checkAuthentication();

    // Clear the temporary message
    this.component.clearComponentMessages();

    if (authed) {
      return;
    }

    // Show component-level Authenticate button only if not already present
    if (existingBtn) return;

    this.component.addComponentButton(
      '<div class="fa-solid fa-user-shield"></div><p class="">Authenticate</p>',
      'warning',
      { class: 'oauthButton' },
      this.collectAndConsoleOAuthValues.bind(this),
    );
  }

  /**
   * Initialize OAuth services and load connections
   */
  async initialize(): Promise<void> {
    try {
      // Initialize services when workspace is fully available
      if (!this.oauthService) {
        this.oauthService = new OAuthService(this.component.workspace);
        this.uiHelper = new UIHelper(this.component);
      }

      await this.oauthService.loadConnections();
      this.oauthConnectionNames = this.oauthService.buildSelectOptions();
    } catch (error) {
      console.error('Error initializing OAuth settings:', error);
      this.oauthConnectionNames = [{ value: 'None', text: 'None', badge: '' }];
    }
  }

  /**
   * Configure OAuth settings for component
   */
  configure(): Record<string, any> {
    return {
      oauth_con_id: {
        type: 'select',
        label: 'OAuth Connection',
        section: 'OAuth',
        options: this.oauthConnectionNames,
        value: this.component.data.oauth_con_id || 'None',
        events: {
          change: (event: Event) =>
            this.handleOAuthConnectionChange((event.target as HTMLSelectElement).value),
        },
        actions: [
          {
            label: 'Add New',
            icon: 'fa-regular fa-lg fa-plus',
            id: 'createOAuthConnection',
            cls: 'mr-2 !mt-[-36px] !pt-[10px]',
            visible: () => true,
            events: {
              click: () => {
                this.component.data.oauth_con_id = 'None';
                this.handleOAuthConnectionAction();
              },
            },
          },
          {
            label: 'Edit',
            icon: 'fa-regular fa-pen-to-square',
            id: 'editOAuthConnection',
            cls: 'mt-[7px] !mr-[24px] !pt-[10px]',
            visible: () =>
              this.component.data.oauth_con_id && this.component.data.oauth_con_id !== 'None',
            events: {
              click: () => this.handleOAuthConnectionAction(),
            },
          },
        ],
      },
      authenticate: {
        type: 'button',
        label: 'Authenticate',
        section: 'OAuth',
        attributes: {},
        events: {
          click: (event: Event) => {
            const target = event.target as HTMLButtonElement;
            return target.innerText === 'Sign Out'
              ? this.signOutFunction(target)
              : this.collectAndConsoleOAuthValues(event);
          },
        },
      },
    };
  }

  /**
   * Handles authentication messages from popup or redirected authentication flow
   */
  private handleAuthMessage(event: MessageEvent): void {
    if (event?.origin !== window?.location?.origin) {
      errorToast('Message origin does not match the current origin.');
      return;
    }

    switch (event.data?.type) {
      case 'oauth2':
      case 'oauth':
        this.handleAuthSuccess(event.data.type);
        break;
      case 'error':
        if (event.data?.data?.message) {
          errorToast(
            `Authentication failed. Recheck your configuration. ${event.data.data.message}`,
            'Error',
            'alert',
          );
        }
        break;
      default:
        console.warn('Unhandled message type:', event.data?.type);
        break;
    }
  }

  /**
   * Handles successful authentication
   */
  private async handleAuthSuccess(type: string): Promise<void> {
    successToast(`${type} authentication was successful`);
    this.uiHelper?.updateSidebarForOAuth();
    await this.updateOAuthConnectionOptions();
    this.component.refreshSettingsSidebar();
    this.uiHelper?.updateOAuthActionButtons(this.hasValidConnection());
    await this.updateAuthenticationButtonState();
    this.component.checkSettings();
    window.removeEventListener('message', this.boundHandleAuthMessage);
  }

  private async handleFocusAfterAuth(): Promise<void> {
    if (document.visibilityState === 'visible') {
      await this.updateButtonAndRemoveFocusListener();
    }
  }

  /**
   * Updates OAuth connection options in settings
   */
  private async updateOAuthConnectionOptions(): Promise<void> {
    if (!this.oauthService) return;

    try {
      await this.oauthService.loadConnections();
      const options = this.oauthService.buildSelectOptions();

      if (this.component.settings?.oauth_con_id) {
        this.component.settings.oauth_con_id.options = options;
      }
    } catch (error) {
      console.error('Error updating OAuth connection options:', error);
      if (this.component.settings?.oauth_con_id) {
        this.component.settings.oauth_con_id.options = [{ value: 'None', text: 'None' }];
      }
    }
  }

  /**
   * Initiates OAuth authentication flow
   */
  private async collectAndConsoleOAuthValues(event: Event): Promise<void> {
    if (!this.oauthService || !this.uiHelper) {
      errorToast('OAuth service not initialized', 'Error', 'alert');
      return;
    }

    const selectedConnectionId = this.component.data.oauth_con_id;
    if (selectedConnectionId === 'None' || !selectedConnectionId) {
      errorToast('Please select a valid OAuth Connection first', 'Error', 'alert');
      return;
    }

    const button = event.target as HTMLButtonElement;
    this.uiHelper.activateSpinner(button);
    document.addEventListener('visibilitychange', this.boundHandleFocusAfterAuth);

    try {
      const success = await this.oauthService.authenticate(selectedConnectionId);

      if (success) {
        // If it's a popup flow, add message listener
        window.addEventListener('message', this.boundHandleAuthMessage, false);
      } else {
        await this.updateButtonAndRemoveFocusListener();
      }
    } catch (error) {
      console.error('Error during OAuth initiation:', error);
      await this.updateButtonAndRemoveFocusListener();
    }
  }

  private async updateAuthenticationButton(): Promise<void> {
    await this.updateAuthenticationButtonState();

    const isDataValid = await this.checkAuthentication();
    const cptButton = this.component.domElement?.querySelector(
      'button.oauthButton',
    ) as HTMLButtonElement;
    if (cptButton) {
      cptButton.disabled = false;
      if (!isDataValid) {
        cptButton.innerHTML =
          '<div class="fa-solid fa-user-shield"></div><p class="">Authenticate</p>';
      }
    }
  }

  private async updateButtonAndRemoveFocusListener(): Promise<void> {
    await this.updateAuthenticationButton();
    document.removeEventListener('visibilitychange', this.boundHandleFocusAfterAuth);
  }

  /**
   * Signs out from OAuth connection
   */
  private async signOutFunction(button: HTMLButtonElement): Promise<void> {
    if (!this.oauthService || !this.uiHelper) {
      errorToast('OAuth service not initialized', 'Error', 'alert');
      return;
    }

    this.uiHelper.activateSpinner(button);

    const success = await this.oauthService.signOut(this.component.data.oauth_con_id);

    if (success) {
      await this.uiHelper.updateAuthButtonState(false);
      this.component.refreshSettingsSidebar();
      this.component.clearComponentMessages();
    } else {
      await this.uiHelper.updateAuthButtonState(true);
    }
  }

  /**
   * Handles OAuth connection creation/editing
   */
  private async handleOAuthConnectionAction(): Promise<void> {
    if (!this.oauthService || !this.uiHelper) {
      errorToast('OAuth service not initialized', 'Error', 'alert');
      return;
    }

    const currentValue = this.component.data.oauth_con_id;

    try {
      const connections = await this.oauthService.loadConnections();

      await this.uiHelper.showConnectionModal(
        currentValue,
        connections,
        async (formData, connectionId) => {
          if (!this.oauthService || !this.uiHelper) return;

          await this.oauthService.saveConnection(connectionId, formData);

          // Update component state
          this.component.data.oauth_con_id = connectionId;
          await this.updateOAuthConnectionOptions();
          this.component.refreshSettingsSidebar();
          this.uiHelper.updateOAuthActionButtons(this.hasValidConnection());

          // Skip authentication button update in callback to prevent hanging
          // The auth button will be updated when the user interacts with it
        },
      );
    } catch (error) {
      console.error('Error handling OAuth connection action:', error);
      errorToast('Error managing connection. Please try again.', 'Error', 'alert');
    }
  }

  /**
   * Handles OAuth connection selection change
   */
  private async handleOAuthConnectionChange(selectedValue: string): Promise<void> {
    this.component.data.oauth_con_id = selectedValue;

    if (!selectedValue || selectedValue === 'None') {
      await this.uiHelper?.updateAuthButtonState(false);
    } else {
      await this.updateAuthenticationButtonState();
    }

    this.uiHelper?.updateOAuthActionButtons(this.hasValidConnection());
  }

  /**
   * Updates authentication button state with debouncing
   */
  async updateAuthenticationButtonState(): Promise<void> {
    if (this.updateAuthButtonDebounceTimer) {
      clearTimeout(this.updateAuthButtonDebounceTimer);
    }

    return new Promise<void>((resolve) => {
      this.updateAuthButtonDebounceTimer = setTimeout(async () => {
        await this.performAuthButtonUpdate();
        resolve();
      }, 150);
    });
  }

  /**
   * Performs the actual authentication button update
   */
  private async performAuthButtonUpdate(): Promise<void> {
    if (!this.uiHelper) return;

    const authButton = this.uiHelper.getAuthButton();
    if (!authButton) return;

    this.uiHelper.activateSpinner(authButton);

    const isAuthenticated =
      this.component.data.oauth_con_id && this.component.data.oauth_con_id !== 'None'
        ? await this.checkAuthentication()
        : false;

    await this.uiHelper.updateAuthButtonState(isAuthenticated);
  }

  /**
   * Checks authentication status for current connection
   */
  private async checkAuthentication(): Promise<boolean> {
    if (!this.oauthService) return false;
    return this.oauthService.checkAuthentication(this.component.data.oauth_con_id);
  }

  /**
   * Helper to check if current connection is valid
   */
  private hasValidConnection(): boolean {
    return !!(this.component.data.oauth_con_id && this.component.data.oauth_con_id !== 'None');
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy(): void {
    if (this.updateAuthButtonDebounceTimer) {
      clearTimeout(this.updateAuthButtonDebounceTimer);
    }
    window.removeEventListener('message', this.boundHandleAuthMessage);
    document.removeEventListener('visibilitychange', this.boundHandleFocusAfterAuth);
  }
}
