// import 'flowbite/dist/flowbite.js';
import { TEAM_ID_HEADER } from '../backend/constants';
import { FRONTEND_USER_SETTINGS } from '../react/shared/enums';
import { authStore } from '../shared/state_stores/auth';
import { builderStore } from '../shared/state_stores/builder/store';
import config from './config';
import PageScriptHandler from './pages/PageScriptHandler';
import { showRefreshAuthPopup } from './ui/dialogs';
import { delay } from './utils';

declare var $;

export function initApp() {
  {
    // TODO: move this to a script that runs on the page immediately better
    builderStore.getState().init();
    authStore.getState().init();
  }

  {
    const APPVER = '__APP_VERSION__';
    let APPENV = '__APP_ENV__';
    console.log(
      `%c Smyth|OS %c FE v${APPVER} ${APPENV == 'DEV' ? '(dev)' : ''}`,
      'background: #000; color: #bada55;font-weight:700;font-size:25px;line-height:30px',
      'background: transparent; color: #fff;font-size:12px;',
    );
  }

  $(function () {
    PageScriptHandler.runPageScripts(window.location);
  });

  const uiServer = config.env.UI_SERVER;
  //const workspace = Workspace.getInstance({ container: document.getElementById('workspace-container'), server: uiServer });

  const originalFetch = window.fetch;
  let teamId;
  let isLoadingTeamId = false;
  async function getInitialTeamId() {
    isLoadingTeamId = true;
    const response = await originalFetch(`${uiServer}/api/app/user-settings/userTeam`);
    const json = await response.json();
    localStorage.setItem(FRONTEND_USER_SETTINGS.CURRENT_SPACE_ID, json?.userSelectedTeam);
    teamId = json?.userSelectedTeam || '';
    isLoadingTeamId = false;
  }

  getInitialTeamId();

  window.fetch = async function (url: string, options: any = {}) {
    if (isLoadingTeamId) {
      await delay(1000);
      return window.fetch(url, options);
    }
    let localStorageTeamId = localStorage.getItem(FRONTEND_USER_SETTINGS.CURRENT_SPACE_ID);
    if (teamId && teamId !== localStorageTeamId) {
      await getInitialTeamId();
    }

    if (url.startsWith(`${uiServer}/api`) || url.startsWith(`${uiServer}/app`)) {
      if (teamId) {
        if (options?.headers) {
          if (Object.keys(options.headers).indexOf(TEAM_ID_HEADER) === -1) {
            options.headers[TEAM_ID_HEADER] = teamId;
          }
        } else {
          options.headers = { [TEAM_ID_HEADER]: teamId };
        }
      }
    }
    // Check if the URL starts with /api
    if (url.startsWith(`${uiServer}/api`)) {
      try {
        let response = await originalFetch(url, options);

        // If the response status is 401, show an authentication popup
        if (response.status === 401) {
          const result = await showRefreshAuthPopup();
          if (result) response = await originalFetch(url, options);
        }
        if (response.status === 503) {
          window.location.href = '/maintenance';
          // window.open('/maintenance', '_self');
        }
        // else if (response.status >= 400) {
        //     window.location.href = `/error/${response.status}?origine=${window.location.pathname}`;
        //     //return;
        // }

        if (!response.ok) {
          const error = await response.json();
          console.error('Fetch error:', error);
          // throw and add the status code to the error
          throw { ...error, status: response.status };
        }

        return response;
      } catch (error) {
        // Handle any other errors here
        console.error('Fetch error:', error);
        throw error;
      }
    } else {
      try {
        // If the URL doesn't start with /api, use the original fetch
        const response = await originalFetch(url, options);

        if (!response.ok) {
          const error = await response.json();
          // throw and add the status code to the error
          throw { ...error, status: response.status };
        }

        return response;
      } catch (error) {
        console.error('Fetch error:', url, error);
        throw error;
      }
    }
  };

  $.ready(async function () {
    await delay(100);
    $('#preload-overlay').fadeOut(200);

    await delay(200);
    //$('#page').show();
    $('#preload-overlay .activity').remove();
  });

  $(document).on('click', '#main-menu a', async function (event) {
    const destinationURL = $(this).attr('href');
    const currentURL = window.location.pathname;

    // Check if the destination URL is the same as the current URL or a child of the current URL
    if (destinationURL === currentURL || destinationURL.startsWith(currentURL + '/')) {
      return; // Allow default behavior
    }

    // Prevent the default action (navigation) from occurring immediately
    event.preventDefault();

    // Show the overlay
    $('body').fadeOut(50);
    await delay(50);
    window.location.href = destinationURL;
  });
}
