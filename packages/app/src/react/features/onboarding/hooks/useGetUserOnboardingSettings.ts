import { queryClient } from '@src/react/shared/query-client';
import { useQuery } from '@tanstack/react-query';

export const getUserOnboardingSettings = async () => {
  const res = await fetch('/api/page/onboard/get-data');

  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  const response = await res.json();

  return response;
};

export const useGetOnboardingData = ({ options = {} } = {}) => {
  const queryResult = useQuery({
    queryKey: ['get_user_onboarding_settings'],
    queryFn: () => getUserOnboardingSettings(),
    ...options, // Additional options for useQuery
  });

  // Refetch the query manually
  const refetch = queryResult.refetch;

  // Invalidate the query to force a refetch
  const invalidate = () => queryClient.invalidateQueries(['get_user_onboarding_settings']);

  // Set new data for the query
  const setData = (newData) => queryClient.setQueryData(['get_user_onboarding_settings'], newData);

  return {
    ...queryResult, // Include all returned data and methods from useQuery
    refetch,
    invalidate,
    setData,
  };
};

export const getBookAnIntroCall = async () => {
  const res = await fetch('/api/page/onboard/get-book-an-intro-call');

  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  const response = await res.json();

  return response;
};
export const useGetBookAnIntroCall = ({ options = {} } = {}) => {
  const queryResult = useQuery({
    queryKey: ['get_book_an_intro_call'],
    queryFn: () => getBookAnIntroCall(),
    ...options, // Additional options for useQuery
  });

  // Refetch the query manually
  const refetch = queryResult.refetch;

  // Invalidate the query to force a refetch
  const invalidate = () => queryClient.invalidateQueries(['get_user_onboarding_settings']);

  // Set new data for the query
  const setData = (newData) => queryClient.setQueryData(['get_user_onboarding_settings'], newData);

  return {
    ...queryResult, // Include all returned data and methods from useQuery
    refetch,
    invalidate,
    setData,
  };
};
