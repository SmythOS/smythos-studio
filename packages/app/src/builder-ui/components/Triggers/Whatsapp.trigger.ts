import config from '@src/backend/config';
import axios from 'axios';
import { Trigger } from './Trigger.class';

declare var Metro;

/**
 * Gmail Trigger Component - Clean and Modular
 *
 * This component handles Gmail-based triggers with OAuth authentication.
 * All OAuth logic has been extracted to the oAuthSettings() helper class
 * for better separation of concerns and reusability.
 */
export class WhatsappTrigger extends Trigger {
  public schema: any = {};

  protected async init(): Promise<void> {
    await super.init();

    // Set up component settings with OAuth configuration
    this.settings = {
      ...this.settings,
      verifyToken: {
        type: 'input',
        label: 'Verify Token',
        hint: 'Verify Token',
        validate: `required maxlength=256`,
        validateMessage: `Provide a valid verify token that only contains 'a-z', 'A-Z', '0-9', '-', '_' , without leading or trailing spaces. Length should be less than 50 characters.`,
      },
      clientId: {
        type: 'input',
        label: 'Client ID',
        hint: 'Client ID',
        validate: `required maxlength=512`,
        validateMessage: `Provide a valid client id that only contains 'a-z', 'A-Z', '0-9', '-', '_' , without leading or trailing spaces. Length should be less than 50 characters.`,
      },
      clientSecret: {
        type: 'input',
        label: 'Client Secret',
        hint: 'Client Secret',
        validate: `required maxlength=512`,
        validateMessage: `Provide a valid client secret that only contains 'a-z', 'A-Z', '0-9', '-', '_' , without leading or trailing spaces. Length should be less than 50 characters.`,
      },
    };

    this.drawSettings.icon = `/img/triggers/whatsapp.svg`;

    this.drawSettings.color = '#00ff00';
    this.drawSettings.componentDescription = 'Poll Whatsapp for new incoming messages';
    this.drawSettings.displayName = '<i class="fa-solid fa-bolt"></i> WhatsappTrigger';
  }

  // public async checkSettings(): Promise<void> {

  // }

  /**
   * Clean up event listeners and resources
   */
  destroy(): void {
    //
  }

  protected async run(): Promise<any> {
    this.addEventListener('settingsSaved', async (settingsValues) => {
      const id = this.uid;
      const url = `${config.env.API_SERVER}/trigger/${id}/register`;
      const result: any = await axios.post(url, { data: '123' });
      console.log(result);
    });
  }
}
