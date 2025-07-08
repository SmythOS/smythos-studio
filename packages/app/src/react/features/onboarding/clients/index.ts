export const getUserOnboardingInfo = async () => {
  const res = await fetch(`/api/page/onboard/get-data`);
  const json = await res.json();
  return json;
};
