import { Component, ComponentList } from './Component.class';
import { alert } from '../ui/dialogs';
import { delay } from '../utils';
import config from '../config';
import { handleTableEditBtn, createJobBoxes } from '../utils';

declare var Metro;
export class SchedulerEndpoint extends Component {
  private domains: any = ['[NONE]'];
  private errorLoading = '';
  protected async prepare(): Promise<boolean> {
    //this.updateDomainsList();
    //TODO : exclude used domains
    return true;
  }

  protected async init() {
    this.settings = {
      span: {
        type: 'span',
        html: `<span class="">Schedule Job</span>`,
        label: 'Config jobs',
        value: '',
        actions: [
          {
            cls: 'float-right',
            label: 'add',
            id: 'addJobs',
            events: {
              click: handleTableEditBtn.bind(this, 'jobs'),
            },
          },
        ],
      },
      jobs: {
        type: 'hidden',
        value: '',
      },
    };
    const dataEntries = ['jobs', 'span'];
    for (let item of dataEntries) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.inputSettings = {
      ...this.inputSettings,
      description: { type: 'string', default: '', editConfig: { type: 'textarea' } },
    };

    this.properties.defaultOutputs = ['headers', 'body', 'query'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = 'Request Parts';
    this.drawSettings.addInputButton = 'Parameters';
    this.drawSettings.showSettings = true;
    this.drawSettings.inputMaxConnections = 0;
    this.drawSettings.shortDescription = 'Scheduler Endpoint - Run your agent on a schedule';
    this.drawSettings.color = '#b700f1';

    this._ready = true;
  }

  //TODO : set the schedule on agent save
  protected async run() {
    const isInput = (elm) => elm.classList.contains('input-endpoint');

    this.addEventListener('settingsOpened', async (sidebar, component) => {
      if (component != this) return; //check if the sidebar is for this component

      console.log('sidebar', sidebar);
      await this.drawSchedulerJobsUI(sidebar);
    });
    this.addEventListener('endpointRemoved', async (name, elm) => {
      if (this.data.jobs !== '' && this.data.jobs !== '{}' && this.data.jobs !== '[]') {
        const _sidebar = document.querySelector('#right-sidebar .form-section');
        const jobBoxesContainer = await createJobBoxes(this, 'job-details');
        _sidebar?.appendChild(jobBoxesContainer);
      }
    });
    this.addEventListener('endpointChanged', async (name, elm, oldValue, newValue) => {
      const jsonArray = JSON?.parse(this.data.jobs) || [];
      if (name === 'name' && isInput(elm)) {
        let newArray =
          jsonArray.length &&
          jsonArray?.map((obj) => {
            if (obj[`${oldValue}`] !== undefined) {
              obj[`${newValue}`] = obj[`${oldValue}`]; // Add new property with the value of the old property
              delete obj[`${oldValue}`]; // Delete the old property
            }
            return obj;
          });
        const dataString = JSON?.stringify(newArray);
        this.data.jobs = dataString;
        this.settings.jobs.value = dataString;
        this.editSettings();
        if (this.data.jobs !== '' && this.data.jobs !== '{}' && this.data.jobs !== '[]') {
          const _sidebar = document.querySelector('#right-sidebar .form-section');
          const jobBoxesContainer = await createJobBoxes(this, 'job-details');
          _sidebar?.appendChild(jobBoxesContainer);
        }
      }
    });
  }

  private async drawSchedulerJobsUI(sidebar) {
    if (this.data.jobs !== '' && this.data.jobs !== '{}' && this.data.jobs !== '[]') {
      let _sidebar: any = sidebar?.querySelector('.form-section');
      const jobBoxesContainer = await createJobBoxes(this, 'job-details');
      _sidebar?.appendChild(jobBoxesContainer);
    }
  }
}
