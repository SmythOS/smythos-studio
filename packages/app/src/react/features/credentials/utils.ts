const availableVars = {
  BASE_URL: window.location.origin,
};
export function parseCredsShemaPlaceholders(path: string) {
  if (!path) return '';

  return path.replace(/{{\s*(.*?)\s*}}/g, (match, key) => {
    const varName = key.trim();
    const value = availableVars[varName as keyof typeof availableVars];

    return value !== undefined ? String(value) : match;
  });
}
