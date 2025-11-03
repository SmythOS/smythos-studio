import { COMP_NAMES } from '@src/builder-ui/config';
import { handleKvFieldEditBtn } from '@src/builder-ui/utils';
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
export class JobSchedulerTrigger extends Trigger {
  public schema: any = {};
  private oauth: oAuthSettings | undefined;

  protected async init(): Promise<void> {
    await super.init();

    // Set up component settings with OAuth configuration
    this.settings = {
      ...this.settings,
      interval: {
        type: 'input',
        label: 'Interval',
        min: 1,
        max: 720,
        value: 5,
        step: 1,
        validate: 'required min=1 max=720',
        validateMessage: 'Allowed range 1 to 720',
        desc: 'Interval in minutes',
      },
      payload: {
        type: 'textarea',
        label: 'Job Parameters',
        readonly: true,
        help: 'Use this to configure your job with custom parameters to pass to your workflow',
        tooltipClasses: 'w-64',
        arrowClasses: '-ml-13',
        validate: `custom=isValidJson`,
        validateMessage: 'Provide a Valid JSON with non-empty keys',
        actions: [
          {
            label: '',
            icon: 'fa-regular fa-pen-to-square',
            id: 'editPayload',
            events: {
              click: handleKvFieldEditBtn.bind(this, 'payload', {
                showVault: true,
                vaultScope: COMP_NAMES.apiCall,
              }),
            },
          },
        ],
      },
    };

    this.drawSettings.icon = `/img/triggers/job-scheduler.svg`;

    this.drawSettings.color = '#00ff00';
    this.drawSettings.componentDescription = 'Poll Job Scheduler for new incoming jobs';
    this.drawSettings.displayName = '<i class="fa-solid fa-bolt"></i> JobScheduler';
  }

  public async checkSettings(): Promise<void> {
    await this.oauth?.checkSettings();
  }

  /**
   * Clean up event listeners and resources
   */
  destroy(): void {
    super.destroy?.();
  }

  protected async run(): Promise<any> {
    super.run();
    //get the jobScheduler schema from the payload field
    const payload = this.data.payload || '{}';
    this.schema = JSON.parse(payload);

    this.addEventListener('settingsSaved', async (settingsValues) => {
      //first update the jobScheduler schema
      // Job scheduler schema is dynamic, and is used to provide Trigger variables to the trigger outputs
      //we need to read it from the payload field
      const payload = settingsValues.payload || '{}';
      this.schema = JSON.parse(payload);

      /*
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
      console.log('JobSchedulerTrigger result', json);
      */
    });
  }
}
