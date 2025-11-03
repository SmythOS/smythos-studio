import { Trigger } from './Trigger.class';

/**
 * Gmail Trigger Component - Clean and Modular
 *
 * This component handles Gmail-based triggers with OAuth authentication.
 * All OAuth logic has been extracted to the oAuthSettings() helper class
 * for better separation of concerns and reusability.
 */
export class WhatsAppTrigger extends Trigger {
  public schema: any = {
    message: {
      id: 'string',
      from: 'string',
      profileName: 'string',
      text: 'string',
      type: 'string',
      timestamp: 'string',
      phoneNumberId: 'string',
    },
  };

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
    this.drawSettings.displayName = '<i class="fa-solid fa-bolt"></i> WhatsApp';
  }

  // public async checkSettings(): Promise<void> {

  // }

  /**
   * Clean up event listeners and resources
   */
  destroy(): void {
    //
    super.destroy?.();
  }

  protected async run(): Promise<any> {
    this.addEventListener('settingsSaved', async (settingsValues) => {
      await this.workspace.waitServerData();
      await this.workspace.saveAgent();
      const base = this.workspace.serverData.frontUrl;
      const id = this.uid;
      const url = `${base}/api/page/builder/trigger/${id}/register`;
      //const result: any = await axios.post(url, { data: '123' });
      const headers = {
        'X-AGENT-ID': this.workspace.agent.id,
      };
      const result: any = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ data: '123' }),
        headers,
      });
      const json = await result.json();
      console.log('WhatsappTrigger result', json);
    });
  }
}
