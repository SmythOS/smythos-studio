import {
  getAgentAuthData,
  saveAgentAuthData,
} from '@react/features/agent-settings/clients/agent-auth';
import { isValidURL } from '@react/features/agent-settings/utils';
import { authStore } from '@src/shared/state_stores/auth/store';
import { Workspace } from '../../workspace/Workspace.class';

declare var Metro, $;

let workspace: Workspace;

export async function setupAgentAuthScripts(_workspace: Workspace) {
  console.log('setupAgentAuthScripts');
  workspace = _workspace;

  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // Additional check to ensure elements are present
  const requiredElements = ['#agent-auth-settings-feature-wrapper', '#auth-method'];

  // Wait for a short period and check if elements exist
  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    const allElementsPresent = requiredElements.every(
      (selector) => document.querySelector(selector) !== null,
    );

    if (allElementsPresent) {
      await initEvents();
      return;
    }

    // console.log(`Waiting for DOM elements (attempt ${retries + 1}/${maxRetries})...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    retries++;
  }

  // console.error('Failed to find required DOM elements after multiple attempts');
}

async function initEvents() {
  const authIDInput = document.querySelector<HTMLInputElement>('#auth-id');
  const authSecretInput = document.querySelector<HTMLInputElement>('#auth-secret');
  const authOIDCConfig = document.querySelector<HTMLInputElement>('#auth-oidc-config-url');
  const authOIDCConfigError = document.querySelector<HTMLElement>('#auth-oidc-config-url-error');
  const authOIDCOpenAIVerificationToken = document.querySelector<HTMLInputElement>(
    '#auth-oidc-openai-verification',
  );
  const authOIDCAllowedEmails = document.querySelector<HTMLInputElement>(
    '#auth-oidc-allowed-emails',
  );
  const authBearerOpenAIVerificationToken = document.querySelector<HTMLInputElement>(
    '#auth-bearer-openai-verification',
  );
  const authMethodElement = document.querySelector<HTMLSelectElement>('#auth-method');
  const authBearerToken = document.querySelector<HTMLInputElement>('#auth-bearer-token');
  const featureHolder = document.querySelector<HTMLElement>('#agent-auth-settings-feature-wrapper');

  if (!featureHolder || !authMethodElement) {
    console.error('Required DOM elements not found');
    return;
  }

  try {
    const state = authStore.getState();
    const teamSubs = state.userInfo?.subs;

    const isAgentAuthAllowed = teamSubs?.plan.properties?.flags?.agentAuthSidebarEnabled;

    if (!isAgentAuthAllowed) {
      featureHolder.innerHTML = `<div class="mt-56 p-4 text-center">Agent Auth is not available for your plan. Please <a href="/plans" target="_blank" rel="noopener noreferrer" class="underline text-blue-500 font-semibold">upgrade</a> to use this feature.</div>`;
      return;
    }
  } catch (error) {
    featureHolder.innerHTML = `<div class="mt-56 p-4 text-center">An error has occured. Please try again later.</div>`;
    return;
  } finally {
    featureHolder?.classList?.remove('hidden');
  }

  featureHolder?.classList?.remove('hidden');

  const saveBtn = document.querySelector<HTMLButtonElement>('#auth-save-btn');
  if (!saveBtn) {
    console.error('Save button not found');
    return;
  }

  saveBtn.addEventListener('click', () => {
    saveAuthSettings();
    refreshAuthInfo();
  });

  if (authOIDCConfig && authOIDCConfigError) {
    authOIDCConfig.addEventListener('input', () => {
      authOIDCConfigError.classList.remove('block');
      authOIDCConfigError.classList.add('hidden');
    });
  }

  let agentAuthData: { method: string; provider: any } = { method: 'none', provider: {} };
  try {
    agentAuthData = await getAgentAuthData(workspace.agent.id);
  } catch (error) {
    console.error('Error getting agent auth data');
  }

  // const method = workspace.agent.data.auth?.method || 'none';
  const method = agentAuthData.method;
  if (method && authMethodElement) {
    const option = [...authMethodElement.options].find((o) => o.value === method);
    if (option) {
      option.selected = true;
      authMethodElement.dispatchEvent(new Event('change'));
    }
  }

  // const provider = workspace.agent.data.auth?.provider;
  const provider = agentAuthData.provider;
  if (provider) {
    if (provider['oauth-oidc']) {
      if (authIDInput) authIDInput.value = provider['oauth-oidc']?.clientID ?? '';
      if (authSecretInput) authSecretInput.value = provider['oauth-oidc']?.clientSecret ?? '';
      if (authOIDCConfig) authOIDCConfig.value = provider['oauth-oidc']?.OIDCConfigURL ?? '';
      if (authOIDCOpenAIVerificationToken) {
        authOIDCOpenAIVerificationToken.value =
          provider['oauth-oidc']?.OIDCOpenAIVerificationToken ?? '';
      }
      if (authOIDCAllowedEmails) {
        authOIDCAllowedEmails.value = (provider['oauth-oidc']?.allowedEmails || []).join(', ');
      }
    }
    if (provider['api-key-bearer']) {
      if (authBearerToken) authBearerToken.value = provider['api-key-bearer']?.token ?? '';
      if (authBearerOpenAIVerificationToken) {
        authBearerOpenAIVerificationToken.value =
          provider['api-key-bearer']?.BearerOpenAIVerificationToken ?? '';
      }
    }
  }
  refreshAuthInfo();
}

async function refreshAuthInfo() {
  const testAuthorizeEndpoint = document.querySelector<HTMLInputElement>('#test-oidc-authorize-ep');
  const testTokenEndpoint = document.querySelector<HTMLInputElement>('#test-oidc-token-ep');
  const prodAuthorizeEndpoint = document.querySelector<HTMLInputElement>('#prod-oidc-authorize-ep');
  const prodTokenEndpoint = document.querySelector<HTMLInputElement>('#prod-oidc-token-ep');

  if (
    !testAuthorizeEndpoint ||
    !testTokenEndpoint ||
    !prodAuthorizeEndpoint ||
    !prodTokenEndpoint
  ) {
    console.error('Required endpoint elements not found');
    return;
  }

  const testDomain = `${workspace.agent.id}.${workspace.serverData.agent_domain}`;
  const prodDomain = workspace.agent.domain;

  if (testDomain) {
    testAuthorizeEndpoint.value = `https://${testDomain}/oauth/authorize`;
    testTokenEndpoint.value = `https://${testDomain}/oauth/token`;
  }
  if (prodDomain) {
    prodAuthorizeEndpoint.value = `https://${prodDomain}/oauth/authorize`;
    prodTokenEndpoint.value = `https://${prodDomain}/oauth/token`;
  }
}

async function saveAuthSettings() {
  console.log('saveAuthSettings');
  const authIDInput: HTMLInputElement = document.querySelector('#auth-id');
  const authSecretInput: HTMLInputElement = document.querySelector('#auth-secret');
  const authOIDCConfig: HTMLInputElement = document.querySelector('#auth-oidc-config-url');
  const authOIDCConfigError: HTMLInputElement = document.querySelector(
    '#auth-oidc-config-url-error',
  );

  const authOIDCOpenAIVerificationToken: HTMLInputElement = document.querySelector(
    '#auth-oidc-openai-verification',
  );
  const authOIDCAllowedEmails: HTMLInputElement = document.querySelector(
    '#auth-oidc-allowed-emails',
  );
  const authBearerOpenAIVerificationToken: HTMLInputElement = document.querySelector(
    '#auth-oidc-bearer-verification',
  );
  const authMethodElement: HTMLSelectElement = document.querySelector('#auth-method');
  const authBearerToken: HTMLInputElement = document.querySelector('#auth-bearer-token');

  const authID = authIDInput.value;
  const authSecret = authSecretInput.value;
  const authOIDCConfigURL = authOIDCConfig.value;
  const authMethod = authMethodElement.value;

  if (authMethod === 'oauth-oidc') {
    if (authOIDCConfig.value.length === 0) {
      authOIDCConfig.focus();
      return;
    }

    if (!isValidURL(authOIDCConfig.value)) {
      authOIDCConfigError.classList.remove('hidden');
      authOIDCConfigError.classList.add('block');

      authOIDCConfig.focus();
      return;
    }

    if (authIDInput.value.length === 0) {
      authIDInput.focus();
      return;
    }

    if (authSecretInput.value.length === 0) {
      authSecretInput.focus();
      return;
    }
  }

  if (authMethod === 'api-key-bearer' && authBearerToken.value.length === 0) {
    authBearerToken.focus();
    return;
  }

  // workspace.agent.data.auth = {
  //   method: authMethod,
  //   provider: {
  //     'oauth-oidc': {
  //       clientID: authID,
  //       clientSecret: authSecret,
  //       OIDCConfigURL: authOIDCConfigURL,
  //       OIDCOpenAIVerificationToken: authOIDCOpenAIVerificationToken?.value,
  //       allowedEmails: (authOIDCAllowedEmails?.value || '')
  //         .trim()
  //         .split(',')
  //         .map((e) => e.trim())
  //         .filter((e: string) => e.trim()),
  //     },
  //     'api-key-bearer': {
  //       token: authBearerToken.value,
  //       BearerOpenAIVerificationToken: authBearerOpenAIVerificationToken?.value,
  //     },
  //   },
  // };
  // await workspace.saveAgent(undefined, undefined, workspace.agent.data);

  // Save the auth method only to decide whether we should get auth data from agent settings in SRE
  workspace.agent.data.auth = {
    method: authMethod,
  };
  await workspace.saveAgent(undefined, undefined, workspace.agent.data);

  const agentAuthData = {
    method: authMethod,
    provider: {
      'oauth-oidc': {
        clientID: authID,
        clientSecret: authSecret,
        OIDCConfigURL: authOIDCConfigURL,
        OIDCOpenAIVerificationToken: authOIDCOpenAIVerificationToken?.value,
        allowedEmails: (authOIDCAllowedEmails?.value || '')
          .trim()
          .split(',')
          .map((e) => e.trim())
          .filter((e: string) => e.trim()),
      },
      'api-key-bearer': {
        token: authBearerToken.value,
        BearerOpenAIVerificationToken: authBearerOpenAIVerificationToken?.value,
      },
    },
  };

  try {
    await saveAgentAuthData(workspace.agent.id, agentAuthData);
  } catch (error) {
    console.error('Error saving agent auth data');
  }
}
