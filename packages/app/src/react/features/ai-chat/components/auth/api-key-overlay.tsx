import { useChatStores } from '@react/features/ai-chat/hooks';
import { Button } from '@react/shared/components/ui/button';
import { Input } from '@react/shared/components/ui/input';
import { Spinner } from '@react/shared/components/ui/spinner';
import { ChangeEvent, KeyboardEvent, useCallback, useState } from 'react';

/**
 * API Key authentication overlay component
 * Allows users to enter their bearer token for authentication
 */
export const ApiKeyOverlay = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { auth, agent } = useChatStores();
  const { onAuthSuccess } = auth;
  const agentId = agent?.data?.data?.id;

  const handleValidateToken = useCallback(async () => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setError('Please enter your authentication token');
      return;
    }

    if (!agentId) {
      setError('Agent not found');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/page/chat/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AGENT-ID': agentId,
        },
        body: JSON.stringify({ token: trimmedToken }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        // Store auth token in localStorage for subsequent requests
        // localStorage.setItem('authToken', trimmedToken);
        await onAuthSuccess();
      } else {
        setError(data.message || 'Invalid token. Please check and try again.');
      }
    } catch {
      setError('Failed to verify token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token, agentId, onAuthSuccess]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isLoading) {
        handleValidateToken();
      }
    },
    [handleValidateToken, isLoading],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setToken(e.target.value);
      if (error) setError('');
    },
    [error],
  );

  return (
    <div className="space-y-4">
      <Input
        type="password"
        value={token}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter your API key or token"
        error={!!error}
        errorMessage={error}
        disabled={isLoading}
        fullWidth
      />

      <Button
        onClick={handleValidateToken}
        disabled={isLoading || !token.trim()}
        variant="blue-primary"
        size="lg"
        className="w-full"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" /> Verifying...
          </span>
        ) : (
          'Continue'
        )}
      </Button>
    </div>
  );
};
