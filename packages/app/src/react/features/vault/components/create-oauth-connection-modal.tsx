// src/webappv2/pages/vault/create-oauth-connection-modal.tsx
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button'; // Your custom button
import { OAuthServicesRegistry } from '@src/shared/helpers/oauth/oauth-services.helper';
import {
    deriveCallbackUrl,
    mapInternalToServiceName,
    mapServiceNameToInternal,
} from '@src/shared/helpers/oauth/oauth.utils';
import React, { useEffect, useMemo, useState } from 'react';
import type {
    CreateOAuthConnectionModalProps,
    OAuthConnectionFormData,
} from '../types/oauth-connection';
import { hasVaultKeys, resolveVaultKeys } from '../utils/vault-key-resolver';
import { OAuthFormFields } from './oauth-form-fields';
import { OAuthFormSkeleton } from './oauth-form-skeleton';

export function CreateOAuthConnectionModal({
  isOpen,
  onClose,
  onSubmit,
  editConnection,
  isProcessing,
}: CreateOAuthConnectionModalProps) {
  const [formData, setFormData] = useState<Partial<OAuthConnectionFormData>>({});
  const [selectedService, setSelectedService] = useState<string>('None');
  const [isResolvingVaultKeys, setIsResolvingVaultKeys] = useState<boolean>(false);

  // Determine if it's an edit operation
  const isEditMode = !!editConnection;

  // Initialize form data when opening in edit mode or when editConnection changes
  useEffect(() => {
    /**
     * Loads and resolves the connection data for editing
     * If vault keys are present, resolves them before populating the form
     */
    const loadConnectionData = async () => {
      if (isOpen && isEditMode && editConnection?.oauth_info) {
        setIsResolvingVaultKeys(true);
        
        try {
          const oauthInfo = editConnection.oauth_info;
          
          // Check if the connection has any vault keys that need to be resolved
          let resolvedOAuthInfo = oauthInfo;
          if (hasVaultKeys(oauthInfo)) {
            // Resolve vault keys to get actual values
            resolvedOAuthInfo = await resolveVaultKeys(oauthInfo);
          }
          
          // Map OAuthConnection back to form data structure with resolved values
          const serviceName = mapInternalToServiceName(resolvedOAuthInfo.service);
          setFormData({
            name: editConnection.name,
            platform: resolvedOAuthInfo.platform,
            oauthService: serviceName,
            scope: resolvedOAuthInfo.scope,
            audience: resolvedOAuthInfo.audience,
            authorizationURL: resolvedOAuthInfo.authorizationURL,
            tokenURL: resolvedOAuthInfo.tokenURL,
            clientID: resolvedOAuthInfo.clientID,
            clientSecret: resolvedOAuthInfo.clientSecret,
            requestTokenURL: resolvedOAuthInfo.requestTokenURL,
            accessTokenURL: resolvedOAuthInfo.accessTokenURL,
            userAuthorizationURL: resolvedOAuthInfo.userAuthorizationURL,
            consumerKey: resolvedOAuthInfo.consumerKey,
            consumerSecret: resolvedOAuthInfo.consumerSecret,
          });
          setSelectedService(serviceName);
        } catch (error) {
          console.error('Error loading connection data:', error);
          // Fall back to showing the placeholders if resolution fails
          const serviceName = mapInternalToServiceName(editConnection.oauth_info.service);
          setFormData({
            name: editConnection.name,
            platform: editConnection.oauth_info.platform,
            oauthService: serviceName,
            scope: editConnection.oauth_info.scope,
            audience: editConnection.oauth_info.audience,
            authorizationURL: editConnection.oauth_info.authorizationURL,
            tokenURL: editConnection.oauth_info.tokenURL,
            clientID: editConnection.oauth_info.clientID,
            clientSecret: editConnection.oauth_info.clientSecret,
            requestTokenURL: editConnection.oauth_info.requestTokenURL,
            accessTokenURL: editConnection.oauth_info.accessTokenURL,
            userAuthorizationURL: editConnection.oauth_info.userAuthorizationURL,
            consumerKey: editConnection.oauth_info.consumerKey,
            consumerSecret: editConnection.oauth_info.consumerSecret,
          });
          setSelectedService(serviceName);
        } finally {
          setIsResolvingVaultKeys(false);
        }
      } else if (isOpen && !isEditMode) {
        // Reset form for creating new connection
        setFormData({ name: '', platform: '', oauthService: 'None' });
        setSelectedService('None');
        setIsResolvingVaultKeys(false);
      }
    };

    loadConnectionData();
  }, [isOpen, isEditMode, editConnection]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle select changes (specifically for oauthService)
  const handleSelectChange = (value: string) => {
    // Only reset OAuth fields if it's a new connection or if the service type actually changes
    const prevService = formData.oauthService;
    const isServiceTypeChange = prevService !== value;

    if (!isEditMode || isServiceTypeChange) {
      // In create mode or when service type changes, reset OAuth-specific fields
      setFormData((prev) => ({
        ...prev,
        oauthService: value,
        // Reset fields that depend on the service type when service changes
        authorizationURL: isServiceTypeChange ? '' : prev.authorizationURL,
        tokenURL: isServiceTypeChange ? '' : prev.tokenURL,
        clientID: isServiceTypeChange ? '' : prev.clientID,
        clientSecret: isServiceTypeChange ? '' : prev.clientSecret,
        scope: isServiceTypeChange ? '' : prev.scope,
        requestTokenURL: isServiceTypeChange ? '' : prev.requestTokenURL,
        accessTokenURL: isServiceTypeChange ? '' : prev.accessTokenURL,
        userAuthorizationURL: isServiceTypeChange ? '' : prev.userAuthorizationURL,
        consumerKey: isServiceTypeChange ? '' : prev.consumerKey,
        consumerSecret: isServiceTypeChange ? '' : prev.consumerSecret,
        // Keep name and platform
        name: prev.name,
        platform: prev.platform,
      }));
    } else {
      // In edit mode without service type change, just update the service
      setFormData((prev) => ({
        ...prev,
        oauthService: value,
      }));
    }
    setSelectedService(value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProcessing) {
      // Basic validation: Ensure name, platform and service are selected
      if (!formData.name) {
        alert('Please enter a name for the connection.');
        return;
      }
      if (!formData.platform) {
        alert('Please enter the platform name (e.g., Google Mail, HubSpot).');
        return;
      }
      if (!formData.oauthService || formData.oauthService === 'None') {
        alert('Please select an Authentication Service.');
        return;
      }
      // Add more specific field validation based on selectedService if needed here
      onSubmit(formData as OAuthConnectionFormData); // Cast as formData should be complete by now
    }
  };

  // Determine which fields to show based on selected service
  const showOAuth2Fields = useMemo(
    () => OAuthServicesRegistry.isOAuth2Service(selectedService),
    [selectedService],
  );
  const showOAuth1Fields = useMemo(
    () => OAuthServicesRegistry.isOAuth1Service(selectedService),
    [selectedService],
  );
  const showClientCredentialsFields = useMemo(
    () => OAuthServicesRegistry.isClientCredentialsService(selectedService),
    [selectedService],
  );
  const showScopeField = useMemo(
    () =>
      !OAuthServicesRegistry.isOAuth1Service(selectedService) &&
      selectedService !== 'None',
    [selectedService],
  ); // Scope is supported for OAuth2 and Client Credentials, but not for OAuth1.0a

  // Pre-fill URLs for known providers using centralized configuration
  useEffect(() => {
    if (!isEditMode) {
      // Only prefill when creating, not editing
      const serviceDefaults = OAuthServicesRegistry.getServiceDefaults(selectedService);

      if (serviceDefaults && Object.keys(serviceDefaults).length > 0) {
        setFormData((prev) => ({ ...prev, ...serviceDefaults }));
      }
    }
  }, [selectedService, isEditMode]);

  // Derived Callback URLs (display only)
  const oauth2CallbackURL = useMemo(() => {
    const internalService = mapServiceNameToInternal(selectedService);
    return deriveCallbackUrl(internalService, 'oauth2');
  }, [selectedService]);

  const oauth1CallbackURL = useMemo(() => {
    const internalService = mapServiceNameToInternal(selectedService);
    return deriveCallbackUrl(internalService, 'oauth');
  }, [selectedService]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit OAuth Connection' : 'Add OAuth Connection'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* Show skeleton loader while resolving vault keys */}
          {isResolvingVaultKeys ? (
            <OAuthFormSkeleton serviceType={editConnection?.type} />
          ) : (
            <div className="grid gap-4 py-4">
              <OAuthFormFields
                formData={formData}
                selectedService={selectedService}
                isProcessing={isProcessing}
                isResolvingVaultKeys={isResolvingVaultKeys}
                showOAuth2Fields={showOAuth2Fields}
                showOAuth1Fields={showOAuth1Fields}
                showClientCredentialsFields={showClientCredentialsFields}
                showScopeField={showScopeField}
                oauth2CallbackURL={oauth2CallbackURL}
                oauth1CallbackURL={oauth1CallbackURL}
                handleChange={handleChange}
                handleSelectChange={handleSelectChange}
              />
            </div>
          )}
          <DialogFooter>
            {/* <DialogClose asChild>
              <CustomButton
                variant="primary"
                type="button"
                handleClick={onClose}
                disabled={isProcessing}
                label="Cancel"
              />
            </DialogClose> */}
            <CustomButton
              variant="primary"
              type="submit"
              loading={isProcessing || isResolvingVaultKeys}
              disabled={
                isProcessing ||
                isResolvingVaultKeys ||
                selectedService === 'None' ||
                !formData.name ||
                !formData.platform
              }
              label={isEditMode ? 'Save Changes' : 'Add Connection'}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
