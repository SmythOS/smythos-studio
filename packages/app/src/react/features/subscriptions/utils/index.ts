export const generatePricingUrl = (url: string, priceIds: { priceId: string; for: string }[]) => {
  const queryParams = priceIds
    .map(({ priceId, for: forWhat }) => `${forWhat}=${priceId}`)
    .join('&');
  return `${url}?${queryParams}`;
};
