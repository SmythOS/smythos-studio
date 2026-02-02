import { useChatStores } from '@react/features/ai-chat/hooks';
import { Button } from '@react/shared/components/ui/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * OAuth sign-in overlay component
 * Opens authorization URL in popup and listens for success message
 */
export const OAuthOverlay = () => {
  const { auth } = useChatStores();
  const { onAuthSuccess, redirectInternalEndpoint, domain } = auth;

  const oAuthUrl = useMemo(() => {
    return `https://${domain}${redirectInternalEndpoint}`;
  }, [domain, redirectInternalEndpoint]);

  const [isLoading, setIsLoading] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // Listen for OAuth success message from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event?.data?.type === 'oauth-success') {
        setIsLoading(true);
        onAuthSuccess().finally(() => setIsLoading(false));
      } else if (event?.data?.type === 'oauth-error') {
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthSuccess]);

  // Check if popup was closed without completing auth
  useEffect(() => {
    if (!popupRef.current) return;

    const checkClosed = setInterval(() => {
      if (popupRef.current?.closed) {
        setIsLoading(false);
        clearInterval(checkClosed);
      }
    }, 1000);

    return () => clearInterval(checkClosed);
  }, [isLoading]);

  const handleSignIn = useCallback(() => {
    if (!oAuthUrl) return;

    setPopupBlocked(false);
    const popup = window.open(oAuthUrl, '_blank', 'width=500,height=600');

    if (!popup || popup.closed) {
      setPopupBlocked(true);
      return;
    }

    popupRef.current = popup;
    setIsLoading(true);
  }, [oAuthUrl]);

  return (
    <div className="space-y-4">
      <Button
        onClick={handleSignIn}
        disabled={isLoading}
        variant="blue-primary"
        size="lg"
        className="w-full"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" /> Signing in...
          </span>
        ) : (
          'Sign In with SSO'
        )}
      </Button>

      {popupBlocked && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Popup was blocked. Please allow popups for this site or{' '}
            <a
              href={oAuthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              click here to sign in
            </a>
          </p>
        </div>
      )}
    </div>
  );
};
