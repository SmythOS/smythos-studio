import { queryClient } from '@src/react/shared/query-client';
import { useMutation } from '@tanstack/react-query';

const useMutateOnboardingData = () => {
  const saveUserSettings = async ({ key, data, operation }) => {
    const response = await fetch('/api/page/onboard/update-onboarding-task-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data, operation }),
    });

    if (!response.ok) {
      throw new Error('Failed to save user settings');
    }

    return response.json();
  };

  return useMutation(saveUserSettings, {
    onSuccess: async () => await queryClient.invalidateQueries(['get_user_onboarding_settings']),
  });
};

interface BookAnIntroCallData {
  isBooked: boolean;
  email: string;
  planName: string;
}

export const useMutateBookAnIntroCall = (options = {}) => {
  const saveBookAnIntroCall = async (data: BookAnIntroCallData) => {
    const response = await fetch('/api/page/onboard/store-book-an-intro-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to save user settings');
    }

    return response.json();
  };

  return useMutation(saveBookAnIntroCall, {
    onSuccess: async () => await queryClient.invalidateQueries(['get_book_an_intro_call']),
    ...options,
  });
};

export default useMutateOnboardingData;
