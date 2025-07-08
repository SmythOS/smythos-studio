import { clear } from 'console';
import config from '../config';
import { Component } from './Component.class';
declare var Metro;

export class GoogleSheet extends Component {
  private authUrl: string = '';
  private _state: string = '';
  private _conCheckInterval: any = null;
  private _conCheckFunction: any;
  private _options: any[] = [];

  protected async prepare(): Promise<boolean> {
    //Here we call the backend in order to generate Google OAuth2 authUrl
    if (!this.data.token) {
      const state = this._uid + '::' + Date.now();
      const scope =
        'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send';
      const encodedScope = encodeURIComponent(scope);
      const authUrlReq = `${this.workspace.server}/oauth2/gmail/authUrl?state=${state}&scope=${encodedScope}`;
      console.log('fetching authUrlReq = ' + authUrlReq);
      const data = await fetch(authUrlReq, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Something went wrong');
          }
        })
        .catch((error) => {
          console.log(error);
        });

      this.authUrl = data.authUrl;
      this._state = state;

      return true;
    } else {
      if (this.data.url) {
        const reqUrl = `${config.env.UI_SERVER}/api/component/GoogleSheet/getSheetNames`;
        const result = await fetch(reqUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: this.data.url, refresh_token: this.data.token }),
        }).then((res) => res.json());
        if (!result.error) {
          const names = result?.map?.((sheet) => sheet?.name);
          this._options = names || [];
          return true;
        }
      }
    }
  }

  protected async init() {
    this.settings = {
      model: {
        type: 'select',
        label: 'Model',
        hint: 'Model name',
        value: 'gpt-4-0613',
        options: ['gpt-3.5-turbo-0613', 'gpt-4-0613'],
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt',
        value: 'Summarize the input text\nInput : {{Input}}',
      },
      url: {
        type: 'input',
        label: 'Spreadsheet Url',
        value: '',
        attributes: { required: true },
        events: {
          paste: async (event) => {
            const formValues = this.extractFormNamesAndValues();
            const token = formValues['token'];
            const account = formValues['account'];
            if (token) {
              await this.handlePasteEvent(event, token, account);
            }
          },
          cut: (event) => {
            setTimeout(() => {
              this.handleCutEvent(event);
            }, 200);
          },
          keyup: (event) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
              this.debouncedHandleCutEvent(event);
            }
          },
        },
      },
      tab_name: {
        type: 'select',
        label: 'Sheet Tab',
        hint: 'Sheet name',
        value: '',
        options: this._options || [],
      },
      headerRange: {
        type: 'input',
        label: 'Header',
        value: '',
      },
      account: {
        type: 'input',
        label: 'Account',
        value: '',
        attributes: { readonly: true },
      },
      token: {
        type: 'password',
        label: 'Token  ',
        value: '',
        attributes: { readonly: true },
      },
      connect: {
        type: 'button',
        label: 'Connect',
        attributes: {},
        events: {
          click: (event) => {
            window.open(this.authUrl, '_blank');
            const sender = event.currentTarget;

            this._conCheckFunction = () => this.googleSheetConnectClick(sender, this._state);
            setTimeout(() => {
              window.addEventListener('focus', this._conCheckFunction);
            }, 200);
          },
        },
      },
    };

    this.dataFields = ['model', 'prompt', 'account', 'token', 'url', 'tab_name', 'headerRange'];
    for (let item of this.dataFields) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultOutputs = ['Error', 'Response'];
    this.properties.defaultInputs = ['Query'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = ' + out ';
    this.drawSettings.addInputButton = ' + Input';
    this.drawSettings.showSettings = true;

    this._ready = true;
  }

  public async editSettings() {
    super.editSettings();

    setTimeout(() => {
      if (!this.settings.tab_name.value && this._options.length == 0)
        (document.querySelector('[name="tab_name"]') as HTMLSelectElement).setAttribute(
          'disabled',
          'true',
        );
    }, 200);
  }

  protected async run() {
    this.addEventListener('settingsClosed', () => {
      this.cancelgoogleSheetConnect();
      if (!this.data.account || !this.data.token) {
        this.domElement.classList.add('missing-config');
      }
    });

    this.addEventListener('settingsSaved', () => {
      if (this.data.account && this.data.token) this.domElement.classList.remove('missing-config');
    });

    if (!this.data.account || !this.data.token) {
      this.domElement.classList.add('missing-config');
    } else {
      this.domElement.classList.remove('missing-config');
    }
    return true;
  }

  private async cancelgoogleSheetConnect() {
    clearInterval(this._conCheckInterval);
  }

  /**
   * This function is called when the user clicks on the "Connect" button
   * It checks the auth state every 5 seconds until the backend returns the refresh_token
   * The function is canceled if the user clicks on the "Cancel" button
   * @param sender the "Connect" button
   * @param state a unique state string used to identify the auth request
   */
  private async googleSheetConnectClick(sender, state) {
    const parentForm = sender.closest('form');
    console.log('start checking googleSheet auth state');
    window.removeEventListener('focus', this._conCheckFunction);

    const scope =
      'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';
    const authStateReq = `${this.workspace.server}/oauth2/gmail/authState?state=${state}&scope=${scope}`;
    let retries = 5;
    const checkAuth = async () => {
      console.log('checking gmail auth state');
      const state = await fetch(authStateReq, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Something went wrong');
          }
        })
        .catch((error) => {
          console.log(error);
        });
      if (state && state.refresh_token && state.account) {
        clearInterval(this._conCheckInterval);
        parentForm.querySelector('[name="account"]').value = state.account;
        parentForm.querySelector('[name="token"]').value = state.refresh_token;
        if (parentForm?.querySelector?.('[name="url"]')?.value) {
          this.data.account = state.account;
          this.data.token = state.refresh_token;
          this.data.url = parentForm?.querySelector?.('[name="url"]')?.value;
          this.data.prompt = parentForm?.querySelector?.('[name="prompt"]')?.value;
          this.data.model = parentForm?.querySelector?.('[name="model"]')?.value;
          this.data.model = parentForm?.querySelector?.('[name="headerRange"]')?.value;
          const reqUrl = `${config.env.UI_SERVER}/api/component/GoogleSheet/getSheetNames`;
          const result = await fetch(reqUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: parentForm?.querySelector?.('[name="url"]')?.value,
              refresh_token: state.refresh_token,
            }),
          }).then((res) => res.json());
          const selectElement = document.querySelector('[name="tab_name"]') as HTMLSelectElement;
          if (selectElement && !result.error) {
            const names = result?.map?.((sheet) => sheet?.name);
            this.settings.tab_name.options = [...names];
            this.data.tab_name = names[0];
            this.settings.tab_name.value = names[0];
            this.editSettings();
          }
          console.log('Getting all sheet names api result =>', result);
        }
      }

      retries--;
      if (retries == 0) clearInterval(this._conCheckInterval);
    };

    this._conCheckInterval = setInterval(checkAuth, 5000);
    checkAuth();
  }

  private async handlePasteEvent(event: ClipboardEvent, refresh_token: any, account: any) {
    const pastedData = event.clipboardData?.getData('text');

    // Check if the pastedData is a URL and state has a refresh_token
    if (pastedData && this.isValidGoogleSheetUrl(pastedData) && refresh_token) {
      return await this._handlePasteAndGetSheetNames(pastedData, refresh_token, account);
    }
    return null;
  }

  private async _handlePasteAndGetSheetNames(url, refresh_token, account) {
    const reqUrl = `${config.env.UI_SERVER}/api/component/GoogleSheet/getSheetNames`;
    const result = await fetch(reqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, refresh_token }),
    }).then((res) => res.json());

    const selectElement = document.querySelector('[name="tab_name"]') as HTMLSelectElement;
    if (selectElement && !result.error) {
      const names = result?.map?.((sheet) => sheet?.name);
      const formValues = this.extractFormNamesAndValues();
      this.data.prompt = formValues['prompt'];
      this.data.headerRange = formValues['headerRange'];
      this.data.model = formValues['model'];
      this.data.url = url;
      this.data.token = refresh_token;
      this.data.account = account;
      this.settings.url.value = url;
      this.settings.tab_name.options = [...names];
      this.data.tab_name = names[0];
      this.settings.tab_name.value = names[0];
      this._options = [];
      this.editSettings();
    }

    console.log('Getting all sheet names api result =>', result);
  }

  private isValidGoogleSheetUrl(url) {
    const regex = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([^\/]+)\/edit($|[\?#].*)/;
    return regex.test(url);
  }

  private handleCutEvent(event) {
    const inputValue = event.target.value.trim();
    const selectElement = document.querySelector('[name="tab_name"]') as HTMLSelectElement;

    if (selectElement) {
      if (inputValue === '' || !this.isValidGoogleSheetUrl(inputValue)) {
        const formValues = this.extractFormNamesAndValues();
        this.data.account = formValues['account'];
        this.data.headerRange = formValues['headerRange'];
        this.data.token = formValues['token'];
        this.data.prompt = formValues['prompt'];
        this.data.model = formValues['model'];
        this.settings.url.value = formValues['url'];
        this.data.url = formValues['url'];
        this.settings.tab_name.options = [];
        this.data.tab_name = '';
        this.settings.tab_name.value = '';
        this._options = [];
        this.editSettings();
      }
    }
  }
  private extractFormNamesAndValues(): { [key: string]: string } {
    const groupElements = document.querySelectorAll<HTMLElement>(
      '#right-sidebar .dlg-form  .form-group',
    );
    const results: { [key: string]: string } = {};

    groupElements.forEach((group: HTMLElement) => {
      const inputElement = group.querySelector<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >('input, textarea, select');
      if (inputElement && inputElement.name) {
        results[inputElement.name] = inputElement.value;
      }
    });

    return results;
  }

  private debounce(func: (...args: any[]) => void, wait: number) {
    let timer: any;
    return (...args: any[]) => {
      const later = () => {
        clearTimeout(timer);
        func(...args);
      };
      clearTimeout(timer);
      timer = setTimeout(later, wait);
    };
  }

  private debouncedHandleCutEvent = this.debounce((event: any) => {
    this.handleCutEvent(event);
  }, 300);
}
