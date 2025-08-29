import { getTeamSettingsObj } from '../../../services/team-data.service';

export const isKeyTemplateVariable = (str: string): boolean => {
  if (!str) return false;

  const pattern = /{{KEY\((.*?)\)}}/;

  const match = str.match(pattern);

  if (!match) return false;

  return true;
};

export const getKeyIdsFromTemplateVars = (str: string): string[] => {
  if (!str) return [];

  const pattern = /{{KEY\((.*?)\)}}/g;
  const keyIds = [];
  let match = [];

  while ((match = pattern.exec(str)) !== null) {
    if (match?.length < 2) continue;
    keyIds.push(match[1]);
  }

  return keyIds;
};

export const replaceTemplateVariablesOptimized = async (req) => {
  // Define template keys to check
  const keysToCheck = ['clientID', 'clientSecret', 'consumerKey', 'consumerSecret'];

  // Extract request body
  const reqBody = req.body;

  // Fetch all team settings
  const allKeys = await getTeamSettingsObj(req, 'vault');

  // Fetch template variables and their corresponding values
  const templateValues = fetchTemplateValues(reqBody, allKeys, keysToCheck, req._team?.id);

  // Map template variables to their fetched values
  const valuesObj = mapTemplateValues(templateValues, reqBody);

  // Store template keys in session
  req.session.templateKeys = Object.keys(valuesObj) || [];

  return reqBody;
};

// Function to fetch template values asynchronously
export const fetchTemplateValues = (reqBody, allKeys, keysToCheck, teamId) => {
  const templateValues = [];

  for (const key of keysToCheck) {
    if (isKeyTemplateVariable(reqBody[key])) {
      const keyNames = getKeyIdsFromTemplateVars(reqBody[key]);
      const filteredKeys = filter(allKeys, { team: teamId, keyName: keyNames[0] });
      const value = Object.values(filteredKeys).length ? Object.values(filteredKeys)[0] : null;
      templateValues.push({ key, value });
    }
  }

  return templateValues;
};

// Function to map template variables to their fetched values
export const mapTemplateValues = (templateValues, reqBody) => {
  const valuesObj = {};

  templateValues.forEach(({ key, value }) => {
    if (value) {
      valuesObj[key] = value;
      reqBody[key] = value['key']; // Assuming 'key' is the property to be assigned
    }
  });

  return valuesObj;
};

export const filter = (allKeys, { team, keyName }) => {
  const filteredKeys = {};

  for (const key in allKeys) {
    const keyObj = allKeys[key];

    if (keyObj.team === team && (!keyName || keyObj.name === keyName)) {
      filteredKeys[key] = keyObj;
    }
  }

  return filteredKeys;
};
