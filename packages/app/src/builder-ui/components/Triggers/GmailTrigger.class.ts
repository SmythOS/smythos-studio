import { oAuthSettings } from '../../helpers/oauth/oauth-settings.helper';
import { Trigger } from './Trigger.class';

declare var Metro;

/**
 * Gmail Trigger Component - Clean and Modular
 *
 * This component handles Gmail-based triggers with OAuth authentication.
 * All OAuth logic has been extracted to the oAuthSettings() helper class
 * for better separation of concerns and reusability.
 */
export class GmailTrigger extends Trigger {
  private oauth: oAuthSettings | undefined;

  protected async prepare(): Promise<boolean> {
    try {
      // Initialize OAuth settings helper
      this.oauth = new oAuthSettings(this);
      await this.oauth.initialize();
      return true;
    } catch (error) {
      console.error('Error preparing Gmail trigger:', error);
      return false;
    }
  }

  protected async init(): Promise<void> {
    await super.init();

    // Set up component settings with OAuth configuration
    this.settings = {
      interval: {
        type: 'range',
        label: 'Interval',
        min: 1,
        max: 720,
        value: 1,
        step: 1,
        validate: 'min=1 max=720',
        validateMessage: 'Allowed range 1 to 720',
      },
      ...this.oauth?.configure(),
    };

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.color = '#ff00f2';
  }

  /**
   * Clean up event listeners and resources
   */
  destroy(): void {
    // Clean up OAuth helper
    if (this.oauth) {
      this.oauth.destroy();
    }

    super.destroy?.();
  }
}
