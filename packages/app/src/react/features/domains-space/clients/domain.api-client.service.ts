import { apiPayloadTypes } from '@react/shared/types';

export const postDomain = (data: apiPayloadTypes.PostDomainRequest) =>
  fetch('/api/page/domains/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const verifyDomain = (domain: string) =>
  fetch(`/api/page/domains/${domain}/verify`, { headers: { 'Content-Type': 'application/json' } });

export const getHost = async (domain: string): Promise<{ host: string }> => {
  const result = await fetch(`/api/page/domains/${domain}/get-cname-target`);
  return result.json();
};

export const getDomains = () => fetch('/api/page/domains/domainsList').then((res) => res.json());
