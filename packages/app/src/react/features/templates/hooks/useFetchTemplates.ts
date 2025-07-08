/* 
=============   Hook usage   ===============
const { data, error, isLoading, refetch, invalidate, setData } = useFetchTemplates({
    options: { refetchOnWindowFocus: false } // Your query options
});
*/

import { useQuery, useQueryClient } from '@tanstack/react-query';

const fetchTemplates = async () => {
  const res = await fetch('/api/page/templates/agent-templates');

  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  const { data } = await res.json();

  // Converting agentTemplates object of objects into an array of [key, value] pairs for processing
  const templatesArray = Object.entries(data)?.map(([key, value]: any) => ({
    ...value,
    file: key,
  }));

  return templatesArray;
};

export const useFetchTemplates = ({ options = {} } = {}) => {
  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: ['fetch_templates'],
    queryFn: () => fetchTemplates(),
    ...options, // Additional options for useQuery
  });

  // Refetch the query manually
  const refetch = queryResult.refetch;

  // Invalidate the query to force a refetch
  const invalidate = () => queryClient.invalidateQueries(['fetch_templates']);

  // Set new data for the query
  const setData = (newData) => queryClient.setQueryData(['fetch_templates'], newData);

  return {
    ...queryResult, // Include all returned data and methods from useQuery
    refetch,
    invalidate,
    setData,
  };
};
