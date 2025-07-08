import Joi from 'joi';
import { Request } from 'express';
import { vault } from '../../services/SmythVault.class';
import { type VaultKeyObj } from '../../../shared/types';
import { VAULT_SCOPE_AGENT_LLM } from '../../../shared/constants/general';

// TODO: Move all functions to vault.helpers.ts

/* When using the 'All' scope, the 'All' key must be saved within that scope to retrieve keys associated with it.
With 'ALL_NON_GLOBAL_KEYS', we return all keys except those with the 'global' scope. */
const scope = [
  'global',
  'All',
  'APICall',
  'HuggingFace',
  'ZapierAction',
  '_hidden',
  'ALL_NON_GLOBAL_KEYS',
  'CUSTOM_LLM',
  VAULT_SCOPE_AGENT_LLM,
];
const fields = ['name', 'scope', 'key', 'owner', 'team', 'isInvalid'];

const scopeSchema = Joi.array()
  .items(Joi.valid(...scope))
  .unique();

const schemaToGet = Joi.object({
  scope: scopeSchema,
  excludeScope: scopeSchema,
  fields: Joi.array()
    .items(Joi.valid(...fields))
    .unique(),
  keyName: Joi.string()
    .max(300)
    .regex(/^[a-zA-Z0-9\s_()-@.]+$/),
  team: Joi.string().max(100),
});

export async function getVaultKeys(req: Request) {
  const scope = (<string>req.query?.scope)?.trim();
  const excludeScope = (<string>req.query?.excludeScope)?.trim();
  const keyName = (<string>req.query?.keyName)?.trim().replace(/\s+/g, ' ');
  const fields = (<string>req.query?.fields)?.trim();
  const team = req?._team?.id;
  const accessToken = req?.user?.accessToken;
  const idToken = req?.session?.idToken;
  const metadataFilter = req?.query?.metadataFilter;

  const args: {
    team: string;
    scope?: string[];
    excludeScope?: string[];
    keyName?: string;
    fields?: string[];
    metadataFilter?: string;
  } = {
    team,
  };

  if (scope) {
    args.scope = scope.split(',');
  }

  if (excludeScope) {
    args.excludeScope = excludeScope.split(',');
  }

  if (fields) {
    args.fields = fields.split(',');
  }

  if (keyName) {
    args.keyName = keyName;
  }

  if (metadataFilter) {
    args.metadataFilter = metadataFilter as string;
  }

  const { error } = schemaToGet.validate({ ...args });

  if (error) {
    console.log('Error validating request: ', error);
    return {};
  }
  const allKeys = await vault.get(args, req);

  return allKeys;
}

const schemaToSet = Joi.object({
  scope: scopeSchema,
  keyName: Joi.string()
    .required()
    .max(300)
    .regex(/^[a-zA-Z0-9\s_()-@.]+$/),
  key: Joi.string().required().max(10000),
});

export const setVaultKey = async (req, keyId = '') => {
  let { key, keyName, scope = [] } = req.body;
  const email = req?._user?.email;
  const team = req?._team?.id;

  // remove empty items
  scope = scope?.filter((item) => item);

  const { error } = schemaToSet.validate({ key, keyName, scope });

  if (error) {
    console.log('Error validating request: ', error);
    return { success: false, error: 'Invalid request.' };
  }

  key = key?.trim();
  keyName = keyName?.trim().replace(/\s+/g, ' ');
  scope = scope?.map((item) => item.trim());
  const name = keyName?.trim();

  const data: VaultKeyObj = {
    key,
    name,
    scope,
    team,
    owner: email,
  };

  const isKeyExists = await vault.exists({ team, keyName, excludeId: keyId }, req);
  const isUnique = !isKeyExists;

  if (!isUnique) {
    return { success: false, error: 'Key Name must be unique.' };
  }

  const setKey = await vault.set({
    keyId,
    data,
    req,
  });

  if (!setKey?.success) {
    return { success: false, error: setKey?.error };
  }

  return { success: true, data: { keyId: setKey?.data } };
};

export const countVaultKeys = (
  teamId: string,
  req: Request,
): Promise<number> => vault.count(teamId, req);

export type VaultSecret = {
  key: string;
  name: string;
  secretId: string;
  metadata: object;
};
