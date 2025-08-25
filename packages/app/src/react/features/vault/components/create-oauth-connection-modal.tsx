// src/webappv2/pages/vault/create-oauth-connection-modal.tsx
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/react/shared/components/ui/dialog';
import { Input } from '@src/react/shared/components/ui/input';
import { Label } from '@src/react/shared/components/ui/label';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button'; // Your custom button
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/react/shared/components/ui/select';
import { Textarea } from '@src/react/shared/components/ui/textarea';
import {
  OAUTH_SERVICES,
  deriveCallbackUrl,
  mapInternalToServiceName,
  mapServiceNameToInternal,
} from '@src/shared/utils/oauth.utils';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  CreateOAuthConnectionModalProps,
  OAuthConnectionFormData,
} from '../types/oauth-connection';

export function CreateOAuthConnectionModal({
  isOpen,
  onClose,
  onSubmit,
  editConnection,
  isProcessing,
}: CreateOAuthConnectionModalProps) {
  const [formData, setFormData] = useState<Partial<OAuthConnectionFormData>>({});
  const [selectedService, setSelectedService] = useState<string>('None');

  // Determine if it's an edit operation
  const isEditMode = !!editConnection;

  // Initialize form data when opening in edit mode or when editConnection changes
  useEffect(() => {
    if (isOpen && isEditMode && editConnection?.oauth_info) {
      // Map OAuthConnection back to form data structure
      const serviceName = mapInternalToServiceName(editConnection.oauth_info.service);
      setFormData({
        name: editConnection.name,
        platform: editConnection.oauth_info.platform,
        oauthService: serviceName,
        scope: editConnection.oauth_info.scope,
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
    } else if (isOpen && !isEditMode) {
      // Reset form for creating new connection
      setFormData({ name: '', platform: '', oauthService: 'None' });
      setSelectedService('None');
    }
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
    () => ['Google', 'LinkedIn', 'Custom OAuth2.0'].includes(selectedService),
    [selectedService],
  );
  const showOAuth1Fields = useMemo(
    () => ['Twitter', 'Custom OAuth1.0'].includes(selectedService),
    [selectedService],
  ); // Assuming Twitter uses 1.0a for simplicity here, might need adjustment
  const showClientCredentialsFields = useMemo(
    () => selectedService === 'OAuth2 Client Credentials',
    [selectedService],
  );
  const showScopeField = useMemo(
    () =>
      !['Custom OAuth1.0', 'OAuth2 Client Credentials'].includes(selectedService) &&
      selectedService !== 'None',
    [selectedService],
  ); // Scope not typically used in 1.0a or Client Credentials

  // Pre-fill URLs for known providers (similar logic to APICall.class)
  useEffect(() => {
    if (!isEditMode) {
      // Only prefill when creating, not editing
      let defaults: Partial<OAuthConnectionFormData> = {};
      const baseCallbackUri = window.location.origin; // Simplistic assumption

      switch (selectedService) {
        case 'Google':
          defaults = {
            authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenURL: 'https://oauth2.googleapis.com/token',
            scope: 'https://www.googleapis.com/auth/gmail.readonly', // Example scope
          };
          break;
        case 'LinkedIn':
          defaults = {
            authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
            tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
            scope: 'r_liteprofile r_emailaddress', // Example scope (using OIDC)
          };
          break;
        case 'Twitter': // Assuming OAuth 1.0a for now based on APICall
          defaults = {
            requestTokenURL: 'https://api.twitter.com/oauth/request_token',
            accessTokenURL: 'https://api.twitter.com/oauth/access_token',
            userAuthorizationURL: 'https://api.twitter.com/oauth/authorize',
          };
          break;
        // Add cases for other predefined services if any
      }
      setFormData((prev) => ({ ...prev, ...defaults }));
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
          <div className="grid gap-4 py-4">
            {/* Name Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="e.g., My Google Connection"
                  required
                  disabled={isProcessing}
                  fullWidth
                />
              </div>
            </div>

            {/* Platform Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="platform">
                Platform <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3">
                <Input
                  id="platform"
                  name="platform"
                  value={formData.platform || ''}
                  onChange={handleChange}
                  placeholder="e.g., Google Mail, HubSpot CRM"
                  required
                  disabled={isProcessing}
                  fullWidth
                />
              </div>
            </div>

            {/* OAuth Service Selector */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="oauthService">
                Auth Service <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3">
                <Select
                  name="oauthService"
                  value={selectedService}
                  onValueChange={handleSelectChange}
                  required
                  disabled={isProcessing}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {OAUTH_SERVICES.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional Fields based on selectedService */}
            {selectedService !== 'None' && (
              <>
                {/* OAuth 2.0 Fields */}
                {(showOAuth2Fields || showClientCredentialsFields) && (
                  <>
                    {showOAuth2Fields && ( // Auth URL only for standard OAuth2
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="authorizationURL">Auth URL</Label>
                        <div className="col-span-3">
                          <Input
                            id="authorizationURL"
                            name="authorizationURL"
                            value={formData.authorizationURL || ''}
                            onChange={handleChange}
                            placeholder="Authorization Endpoint URL"
                            disabled={isProcessing}
                            fullWidth
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="tokenURL">Token URL</Label>
                      <div className="col-span-3">
                        <Input
                          id="tokenURL"
                          name="tokenURL"
                          value={formData.tokenURL || ''}
                          onChange={handleChange}
                          placeholder="Token Endpoint URL"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="clientID">Client ID</Label>
                      <div className="col-span-3">
                        <Input
                          id="clientID"
                          name="clientID"
                          value={formData.clientID || ''}
                          onChange={handleChange}
                          placeholder="OAuth Client ID"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="clientSecret">Client Secret</Label>
                      <div className="col-span-3">
                        <Input
                          id="clientSecret"
                          name="clientSecret"
                          type="password"
                          value={formData.clientSecret || ''}
                          onChange={handleChange}
                          placeholder="OAuth Client Secret"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    {showOAuth2Fields &&
                      oauth2CallbackURL && ( // Callback URL Display (OAuth2)
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label>Callback URL</Label>
                          <div className="col-span-3 text-sm text-gray-500 break-all">
                            {oauth2CallbackURL}
                          </div>
                        </div>
                      )}
                  </>
                )}

                {/* OAuth 1.0a Fields */}
                {showOAuth1Fields && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="requestTokenURL">Request Token URL</Label>
                      <div className="col-span-3">
                        <Input
                          id="requestTokenURL"
                          name="requestTokenURL"
                          value={formData.requestTokenURL || ''}
                          onChange={handleChange}
                          placeholder="Request Token URL"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="accessTokenURL">Access Token URL</Label>
                      <div className="col-span-3">
                        <Input
                          id="accessTokenURL"
                          name="accessTokenURL"
                          value={formData.accessTokenURL || ''}
                          onChange={handleChange}
                          placeholder="Access Token URL"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="userAuthorizationURL">User Auth URL</Label>
                      <div className="col-span-3">
                        <Input
                          id="userAuthorizationURL"
                          name="userAuthorizationURL"
                          value={formData.userAuthorizationURL || ''}
                          onChange={handleChange}
                          placeholder="User Authorization URL"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="consumerKey">Consumer Key</Label>
                      <div className="col-span-3">
                        <Input
                          id="consumerKey"
                          name="consumerKey"
                          value={formData.consumerKey || ''}
                          onChange={handleChange}
                          placeholder="OAuth Consumer Key"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="consumerSecret">Consumer Secret</Label>
                      <div className="col-span-3">
                        <Input
                          id="consumerSecret"
                          name="consumerSecret"
                          type="password"
                          value={formData.consumerSecret || ''}
                          onChange={handleChange}
                          placeholder="OAuth Consumer Secret"
                          disabled={isProcessing}
                          fullWidth
                        />
                      </div>
                    </div>
                    {oauth1CallbackURL && ( // Callback URL Display (OAuth1)
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label>Callback URL</Label>
                        <div className="col-span-3 text-sm text-gray-500 break-all">
                          {oauth1CallbackURL}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Scope Field (Common for most OAuth2 flows) */}
                {showScopeField && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="scope">Scopes</Label>
                    <div className="col-span-3">
                      <Textarea
                        id="scope"
                        name="scope"
                        value={formData.scope || ''}
                        onChange={handleChange}
                        className="min-h-[70px] h-[70px] resize-none"
                        placeholder="Enter scopes separated by space"
                        disabled={isProcessing}
                        fullWidth={true}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
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
              loading={isProcessing}
              disabled={
                isProcessing || selectedService === 'None' || !formData.name || !formData.platform
              }
              label={isEditMode ? 'Save Changes' : 'Add Connection'}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
