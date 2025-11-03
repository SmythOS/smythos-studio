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
  public schema: any = {
    email: {
      id: 'string',
      threadId: 'string',
      labelIds: 'array',
      snippet: 'string',
      sizeEstimate: 'number',
      internalDate: 'string',
      headers: {
        from: 'string',
        to: 'string',
        cc: 'string',
        bcc: 'string',
        subject: 'string',
        date: 'string',
        messageId: 'string',
      },
      body: {
        text: 'string',
        html: 'string',
      },
      attachments: 'array',
      isUnread: 'boolean',
    },
  };
  private oauth: oAuthSettings | undefined;

  protected async prepare(): Promise<boolean> {
    try {
      // Initialize OAuth settings helper
      this.oauth = new oAuthSettings(this, 'oauth_cred_id');
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
      ...this.settings,
      interval: {
        type: 'range',
        label: 'Interval',
        min: 1,
        max: 720,
        value: 5,
        step: 1,
        validate: 'min=1 max=720',
        validateMessage: 'Allowed range 1 to 720',
        desc: 'Interval in minutes',
      },
      ...this.oauth?.configure(),
    };

    // this.properties.defaultOutputs = [
    //   'Payload',
    //   'id',
    //   'headers.subject',
    //   'body.text',
    //   'attachments',
    //   'isUnread',
    // ];
    // for (let output of this.properties.defaultOutputs) {
    //   this.properties.outputProps.push({
    //     name: output,
    //     type: 'string',
    //     color: '#95f562',
    //     expression: output == 'Payload' ? 'Payload' : `Payload.email.${output}`,
    //   });
    // }

    this.drawSettings.icon = `/img/triggers/gmail.svg`;

    this.drawSettings.color = '#00ff00';
    this.drawSettings.componentDescription = 'Poll Gmail for new incoming emails';
    this.drawSettings.displayName = '<i class="fa-solid fa-bolt"></i> Gmail';
  }

  public async checkSettings(): Promise<void> {
    await this.oauth?.checkSettings();
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
