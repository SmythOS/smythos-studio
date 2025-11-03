import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import React, { useCallback, useEffect, useState } from 'react';

import { saveAgentAuthData } from '@react/features/agent-settings/clients/agent-auth';
import { isValidURL } from '@react/features/agent-settings/utils';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { SkeletonLoader } from '@src/react/shared/components/ui/skeleton-loader';
import { errorToast, successToast } from '@src/shared/components/toast';
import { useQuery } from '@tanstack/react-query';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

type Props = {
  isWriteAccess?: boolean;
};

/**
 * Enum for authentication methods
 */
type AuthMethod = 'none' | 'api-key-bearer' | 'oauth-oidc';

/**
 * Type for OAuth OIDC configuration
 */
type OAuthConfig = {
  OIDCConfigURL: string;
  clientID: string;
  clientSecret: string;
  allowedEmails: string;
  OIDCOpenAIVerificationToken: string;
};

/**
 * Type for Bearer token configuration
 */
type BearerConfig = {
  token: string;
  BearerOpenAIVerificationToken: string;
};

/**
 * Type for validation errors
 */
type ValidationErrors = {
  oidcEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
  bearerToken?: string;
};

const AuthWidget = ({ isWriteAccess }: Props) => {
  const { workspace, agentId, serverStatusData, agentAuthData } = useAgentSettingsCtx();
  const [selectedAuth, setSelectedAuth] = useState<AuthMethod | null>(null);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({
    OIDCConfigURL: '',
    clientID: '',
    clientSecret: '',
    allowedEmails: '',
    OIDCOpenAIVerificationToken: '',
  });
  const [bearerConfig, setBearerConfig] = useState<BearerConfig>({
    token: '',
    BearerOpenAIVerificationToken: '',
  });
  const [isBusySavingVariables, setIsBusySavingVariables] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [testAuthorizeEndpoint, setTestAuthorizeEndpoint] = useState<string>('');
  const [testTokenEndpoint, setTestTokenEndpoint] = useState<string>('');
  const [prodAuthorizeEndpoint, setProdAuthorizeEndpoint] = useState<string>('');
  const [prodTokenEndpoint, setProdTokenEndpoint] = useState<string>('');
  const [showBearerToken, setShowBearerToken] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  const serverData = serverStatusData;

  const setAuthData = useCallback(() => {
    let d = null;

    // when saving auth settings, we don't want to update the UI until the save is complete
    if (isBusySavingVariables) return;

    // Get auth data from workspace or agentQuery
    // if (workspace?.agent?.data?.auth) {
    if (agentAuthData) {
      // d = workspace.agent.data.auth;
      d = agentAuthData;
    }

    // Set auth method if it exists
    if (d?.method && !selectedAuth) {
      setSelectedAuth(d.method);

      // Set provider config based on method
      if (d.provider) {
        if (d.provider['oauth-oidc']) {
          setOauthConfig(d.provider['oauth-oidc']);
        }
        if (d.provider['api-key-bearer']) {
          setBearerConfig(d.provider['api-key-bearer']);
        }
      }
    }
  }, [selectedAuth, setOauthConfig, setBearerConfig, agentAuthData, isBusySavingVariables]);

  useEffect(() => {
    setAuthData();
  }, [agentAuthData, setAuthData]);

  const handleWorkSpaceChange = useCallback(() => {
    setAuthData();
  }, [setAuthData]);

  useEffect(() => {
    if (workspace) {
      workspace.on('AgentSaved', handleWorkSpaceChange);

      // Cleanup subscription on unmount
      return () => {
        workspace.off('AgentSaved', handleWorkSpaceChange);
      };
    }
  }, [workspace, handleWorkSpaceChange]);

  // Query for domains list
  const { data: domainData } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const response = await fetch('/api/page/builder/domains', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to load domains');
      }

      return response.json();
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const userDomain = React.useMemo(() => {
    return domainData
      ?.filter((d) => d?.aiAgent?.id && agentId && d?.aiAgent?.id === agentId)
      ?.map((item) => item.name);
  }, [domainData, agentId]);

  useEffect(() => {
    const testDomain = `${agentId}.${serverData?.agent_domain}`;
    const prodDomain = userDomain?.[0]
      ? `${userDomain?.[0]}`
      : serverData?.prod_agent_domain
        ? `${agentId}.${serverData?.prod_agent_domain}`
        : '';

    setTestAuthorizeEndpoint(`https://${testDomain}/oauth/authorize`);
    setTestTokenEndpoint(`https://${testDomain}/oauth/token`);

    const prodEndpoints = prodDomain ? `https://${prodDomain}` : '...';
    setProdAuthorizeEndpoint(`${prodEndpoints}/oauth/authorize`);
    setProdTokenEndpoint(`${prodEndpoints}/oauth/token`);
  }, [serverData, agentId, userDomain, selectedAuth]);

  const saveWorkSpaceAuth = useCallback(
    async (authData) => {
      // Here we need to implement the API call similar to workspace.saveAgent()
      // Original code used: await workspace.saveAgent(undefined, undefined, workspace.agent.data)
      try {
        // Save the auth method only to decide whether we should get auth data from agent settings in SRE

        await saveAgentAuthData(agentId, authData);
        if (workspace?.agent?.data) {
          workspace.agent.data.auth = {
            method: authData.method,
          };
          await workspace.saveAgent(undefined, undefined, workspace.agent.data);
        }

        successToast('Auth settings saved successfully');
      } catch (error) {
        console.error('Save auth settings error:', error);
        errorToast('Failed to save auth settings');
      }
    },
    [agentId, workspace],
  );

  // async function saveAuthDirectly(authData) {
  //   let lockId = null;
  //   try {
  //     const lockResponse = await agentSettingsUtils.accquireLock(agentId);
  //     lockId = lockResponse.lockId;
  //     const currData = agentQuery.data;
  //     currData.data['auth'] = authData;

  //     await saveAgentAuthData(agentId, authData);
  //     await fetch('/api/agent', {
  //       method: 'POST',
  //       body: JSON.stringify({
  //         ...currData,
  //         id: agentId,
  //         lockId,
  //       }),
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });
  //   } catch (e) {
  //     errorToast('Failed to update agent auth settings. Please try again.');
  //   } finally {
  //     await agentSettingsUtils.releaseLock(agentId, lockId).catch((e) => console.error(e));
  //   }
  // }

  // async function saveAuthAPI(authData) {
  //   let lockId = null;

  //   try {
  //     const lockResponse = await agentSettingsUtils.accquireLock(agentId);
  //     lockId = lockResponse.lockId;

  //     const newData = agentQuery.data;
  //     newData.data['auth'] = authData;

  //     await fetch('/api/agent', {
  //       method: 'POST',
  //       body: JSON.stringify({
  //         ...newData,
  //         id: agentId,
  //         lockId,
  //       }),
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });
  //   } catch (e) {
  //     errorToast('Failed to update agent auth settings. Please try again.');
  //   } finally {
  //     await agentSettingsUtils.releaseLock(agentId, lockId).catch((e) => console.error(e));
  //   }
  // }
  /**
   * Handles saving auth settings
   * Validates required fields and saves configuration
   */
  const saveAuthSettings = useCallback(async () => {
    // Reset validation errors
    setValidationErrors({});
    let hasErrors = false;
    // Validate required fields for OAuth OIDC
    if (selectedAuth === 'oauth-oidc') {
      if (!oauthConfig.OIDCConfigURL) {
        setValidationErrors((prev) => ({ ...prev, oidcEndpoint: 'OIDC Endpoint is required' }));
        hasErrors = true;
      } else if (!isValidURL(oauthConfig.OIDCConfigURL)) {
        setValidationErrors((prev) => ({ ...prev, oidcEndpoint: 'Invalid OIDC Endpoint URL' }));
        hasErrors = true;
      }
      if (!oauthConfig.clientID) {
        setValidationErrors((prev) => ({ ...prev, clientId: 'Client ID is required' }));
        hasErrors = true;
      }

      if (!oauthConfig.clientSecret) {
        setValidationErrors((prev) => ({ ...prev, clientSecret: 'Client Secret is required' }));
        hasErrors = true;
      }
    }

    // Validate required fields for Bearer token
    if (selectedAuth === 'api-key-bearer' && !bearerConfig.token) {
      setValidationErrors((prev) => ({ ...prev, bearerToken: 'Bearer token is required' }));
      hasErrors = true;
    }

    if (hasErrors) return;
    // Prepare auth data structure matching the original format
    const authData = {
      method: selectedAuth,
      provider: {
        'oauth-oidc': {
          clientID: oauthConfig.clientID,
          clientSecret: oauthConfig.clientSecret,
          OIDCConfigURL: oauthConfig.OIDCConfigURL,
          OIDCOpenAIVerificationToken: oauthConfig.OIDCOpenAIVerificationToken,
          allowedEmails: Array.isArray(oauthConfig.allowedEmails)
            ? oauthConfig.allowedEmails
            : oauthConfig.allowedEmails.length
              ? oauthConfig.allowedEmails
                  .split(',')
                  .map((e) => e.trim())
                  .filter((e) => e)
              : [],
        },
        'api-key-bearer': {
          token: bearerConfig.token,
          BearerOpenAIVerificationToken: bearerConfig.BearerOpenAIVerificationToken,
        },
      },
    };

    setIsBusySavingVariables(true);
    try {
      await saveWorkSpaceAuth(authData);
    } catch (error) {
      errorToast('Failed to save auth settings');
      console.error('Save auth settings error:', error);
    } finally {
      setIsBusySavingVariables(false);
    }
  }, [selectedAuth, oauthConfig, bearerConfig, saveWorkSpaceAuth]);

  if (!agentAuthData) return <SkeletonLoader title="Auth" />;

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess}>
      <div
        className="flex flex-col rounded-lg border border-gray-600 p-4 bg-gray-50"
        data-qa="security-tab-container"
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <h3 className="text-sm font-semibold text-gray-700">Configure Custom Auth</h3>
              {/* <Tooltip content="Change Log">
                <span className="ml-1 inline-block">
                  <div className="border border-solid border-gray-500 p-0.5 flex items-center rounded-full">
                    <FaInfo className="text-gray-500 w-2 h-2" />
                  </div>
                </span>
              </Tooltip> */}
            </div>
          </div>
        </div>
        <div className="mt-1">
          <label htmlFor="auth-method" className="block text-sm text-gray-700 mb-2">
            Select an Auth Method
          </label>
          <select
            id="auth-method"
            value={selectedAuth || 'none'}
            onChange={(e) => setSelectedAuth(e.target.value as AuthMethod)}
            className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-v2-blue focus:border-v2-blue"
            disabled={!isWriteAccess}
          >
            <option value="none">None</option>
            <option value="api-key-bearer">Bearer API Key</option>
            <option value="oauth-oidc">OAuth OIDC</option>
          </select>
        </div>

        {selectedAuth === 'api-key-bearer' && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="bearer-token"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Token <span className="text-red-500">*</span>
              </label>
              <div className="relative">
              <input
                id="bearer-token"
                type={showBearerToken ? 'text' : 'password'}
                placeholder="Enter your bearer token"
                value={bearerConfig.token}
                  onChange={(e) => setBearerConfig((prev) => ({ ...prev, token: e.target.value }))}
                  className={`w-full p-2 text-sm border rounded-md bg-white ${
                    validationErrors.bearerToken
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-v2-blue focus:border-v2-blue'
                  }`}
                  disabled={!isWriteAccess}
                />
                <button
                  type="button"
                  onClick={() => setShowBearerToken(!showBearerToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-v2-blue"
                  disabled={!isWriteAccess}
                >
                  {showBearerToken ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
              {validationErrors.bearerToken && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.bearerToken}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="bearer-verification"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                OpenAI Verification
              </label>
              <input
                id="bearer-verification"
                type="text"
                placeholder="Enter verification token"
                value={bearerConfig.BearerOpenAIVerificationToken}
                onChange={(e) =>
                  setBearerConfig((prev) => ({
                    ...prev,
                    BearerOpenAIVerificationToken: e.target.value,
                  }))
                }
                className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-v2-blue focus:border-v2-blue"
                disabled={!isWriteAccess}
              />
            </div>
          </div>
        )}

        {selectedAuth === 'oauth-oidc' && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="oidc-endpoint"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                OIDC Configuration Endpoint <span className="text-red-500">*</span>
              </label>
              <input
                id="oidc-endpoint"
                type="text"
                placeholder="Enter OIDC configuration URL"
                value={oauthConfig.OIDCConfigURL}
                onChange={(e) =>
                  setOauthConfig((prev) => ({ ...prev, OIDCConfigURL: e.target.value }))
                }
                className={`w-full p-2 text-sm border rounded-md bg-white ${
                  validationErrors.oidcEndpoint
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-v2-blue focus:border-v2-blue'
                }`}
                disabled={!isWriteAccess}
              />
              {validationErrors.oidcEndpoint && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.oidcEndpoint}</p>
              )}
            </div>

            <div>
              <label htmlFor="client-id" className="block text-sm font-medium text-gray-600 mb-2">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                id="client-id"
                type="text"
                placeholder="Enter your client ID"
                value={oauthConfig.clientID}
                onChange={(e) => setOauthConfig((prev) => ({ ...prev, clientID: e.target.value }))}
                className={`w-full p-2 text-sm border rounded-md bg-white ${
                  validationErrors.clientId
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-v2-blue focus:border-v2-blue'
                }`}
                disabled={!isWriteAccess}
              />
              {validationErrors.clientId && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.clientId}</p>
              )}
            </div>

            <div className="relative">
              <label
                htmlFor="client-secret"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Client Secret <span className="text-red-500">*</span>
              </label>
              <input
                id="client-secret"
                type={showClientSecret ? 'text' : 'password'}
                placeholder="Enter your client secret"
                value={oauthConfig.clientSecret}
                onChange={(e) =>
                  setOauthConfig((prev) => ({ ...prev, clientSecret: e.target.value }))
                }
                className={`w-full p-2 text-sm border rounded-md bg-white ${
                  validationErrors.clientSecret
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-v2-blue focus:border-v2-blue'
                }`}
                disabled={!isWriteAccess}
              />
              <button
                type="button"
                onClick={() => setShowClientSecret(!showClientSecret)}
                className="absolute right-2 bottom-[14px] text-gray-500 hover:text-v2-blue"
                disabled={!isWriteAccess}
              >
                {showClientSecret ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
              {validationErrors.clientSecret && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.clientSecret}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="allowed-emails"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Allowed Emails
              </label>
              <input
                id="allowed-emails"
                type="text"
                placeholder="Enter comma separated emails or domains"
                value={oauthConfig.allowedEmails}
                onChange={(e) =>
                  setOauthConfig((prev) => ({ ...prev, allowedEmails: e.target.value }))
                }
                className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-v2-blue focus:border-v2-blue"
                disabled={!isWriteAccess}
              />
            </div>

            <div>
              <label
                htmlFor="verification-token"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                OpenAI Verification
              </label>
              <input
                id="verification-token"
                type="text"
                placeholder="Enter verification token"
                value={oauthConfig.OIDCOpenAIVerificationToken}
                onChange={(e) =>
                  setOauthConfig((prev) => ({
                    ...prev,
                    OIDCOpenAIVerificationToken: e.target.value,
                  }))
                }
                className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-v2-blue focus:border-v2-blue"
                disabled={!isWriteAccess}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Test Authorize Endpoint
              </label>
              <div className="p-2 pl-0 bg-gray-50 border border-gray-300 rounded-md text-gray-600 text-sm break-words">
                {testAuthorizeEndpoint}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Test Token Endpoint
              </label>
              <div className="p-2 pl-0 bg-gray-50 border border-gray-300 rounded-md text-gray-600 text-sm break-words">
                {testTokenEndpoint}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Prod Authorize Endpoint
              </label>
              <div className="p-2 pl-0 bg-gray-50 border border-gray-300 rounded-md text-gray-600 text-sm break-words">
                {prodAuthorizeEndpoint}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Prod Token Endpoint
              </label>
              <div className="p-2 pl-0 bg-gray-50 border border-gray-300 rounded-md text-gray-600 text-sm break-words">
                {prodTokenEndpoint}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <CustomButton
            className="mt-4"
            label="Save Auth Settings"
            handleClick={saveAuthSettings}
            loading={isBusySavingVariables}
            disabled={!isWriteAccess || isBusySavingVariables}
          />
        </div>
      </div>
    </WidgetCard>
  );
};

export default AuthWidget;
