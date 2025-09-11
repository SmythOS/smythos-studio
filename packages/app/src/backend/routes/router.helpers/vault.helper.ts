import { Request } from 'express';
import Joi from 'joi';
import { type VaultKeyObj } from '../../../shared/types';
import { vault } from '../../services/SmythVault.class';

// * Refined implementation of vault.utils.ts

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
];

const scopeSchema = Joi.array()
  .items(Joi.valid(...scope))
  .unique();

const keyObjectSchema = Joi.object({
  id: Joi.string().max(100),
  scope: scopeSchema,
  name: Joi.string()
    .required()
    .max(300)
    .regex(/^[a-zA-Z0-9\s_()-@.]+$/),
  key: Joi.string().required().max(10000),
  metadata: Joi.object(),
});

const schemaToSet = Joi.array().items(keyObjectSchema);

export const setVaultKeys = async ({
  req,
  teamId,
  userEmail,
  keyEntries,
}: {
  req: Request;
  teamId: string;
  userEmail: string;
  keyEntries: VaultKeyObj[];
}) => {
  const { error } = schemaToSet.validate(keyEntries);

  if (error) {
    console.log('Error validating request: ', error?.message);
    return { success: false, error: 'Invalid request.' };
  }

  const _keyEntries = [];

  for (const keyEntry of [...keyEntries]) {
    keyEntry.key = keyEntry.key?.trim();
    keyEntry.name = keyEntry.name.replace(/\s+/g, ' ')?.trim();
    keyEntry.scope = keyEntry.scope?.map((item) => item.trim());

    _keyEntries.push({ ...keyEntry });
  }

  const keyNamesWithoutId = _keyEntries
    .filter((keyEntry) => !keyEntry?.id)
    .map((keyEntry) => keyEntry.name);

  const savedKeys = await vault.get({ team: teamId }, req);
  const savedKeyNames = Object.values(savedKeys).map((keyEntry) => keyEntry.name);

  // Check for duplicates
  const duplicateNames = [...keyNamesWithoutId].filter((name) => savedKeyNames.includes(name));

  if (duplicateNames.length > 0) {
    return { success: false, error: 'All Key Names must be unique.' };
  }

  try {
    const setKey = await vault.setMultiple({
      req,
      teamId: teamId,
      userEmail: userEmail,
      keyEntries: _keyEntries,
    });

    if (!setKey?.success) {
      return { success: false, error: setKey?.error };
    }

    return { success: true, data: setKey?.data };
  } catch {
    throw new Error('Something went wrong while saving multiple keys.');
  }
};

export const getKeyIdFromTemplateVar = (str: string): string => {
  if (!str) return '';

  const pattern = /{{KEY\((.*?)\)}}/g;
  const keyIds = [];
  let match = [];

  while ((match = pattern.exec(str)) !== null) {
    if (match?.length < 2) continue;
    keyIds.push(match[1]);
  }
  return keyIds[0] || '';
};
