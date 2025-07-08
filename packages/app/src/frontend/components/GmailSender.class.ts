import { clear } from 'console';
import { Component } from './Component.class';
declare var Metro;

export class GmailSender extends Component {
  private authUrl: string = '';
  private _state: string = '';
  private _conCheckInterval: any = null;
  private _conCheckFunction: any;

  protected async prepare(): Promise<boolean> {
    //Here we call the backend in order to generate Google OAuth2 authUrl

    const state = this._uid + '::' + Date.now();
    const authUrlReq = this.workspace.server + '/oauth2/gmail/authUrl?state=' + state;
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
  }

  protected async init() {
    this.settings = {
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

            this._conCheckFunction = () => this.gmailConnectClick(sender, this._state);

            setTimeout(() => {
              window.addEventListener('focus', this._conCheckFunction);
            }, 200);
          },
        },
      },
    };

    this.dataFields = ['account', 'token'];
    for (let item of this.dataFields) {
      if (typeof this.data[item] === 'undefined') this.data[item] = this.settings[item].value;
    }

    this.properties.defaultOutputs = ['Success', 'Error'];
    this.properties.defaultInputs = ['To', 'Subject', 'Body'];

    this.drawSettings.iconCSSClass = 'svg-icon ' + this.constructor.name;
    this.drawSettings.addOutputButton = null;
    this.drawSettings.showSettings = true;

    this._ready = true;
  }

  protected async run() {
    this.addEventListener('settingsClosed', () => {
      this.cancelGmailConnect();
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

  private async cancelGmailConnect() {
    clearInterval(this._conCheckInterval);
  }

  /**
   * This function is called when the user clicks on the "Connect" button
   * It checks the auth state every 5 seconds until the backend returns the refresh_token
   * The function is canceled if the user clicks on the "Cancel" button
   * @param sender the "Connect" button
   * @param state a unique state string used to identify the auth request
   */
  private async gmailConnectClick(sender, state) {
    const parentForm = sender.closest('form');
    console.log('start checking gmail auth state');
    window.removeEventListener('focus', this._conCheckFunction);

    const scope =
      'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';
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
      }

      retries--;
      if (retries == 0) clearInterval(this._conCheckInterval);
    };

    this._conCheckInterval = setInterval(checkAuth, 5000);
    checkAuth();
  }
}
