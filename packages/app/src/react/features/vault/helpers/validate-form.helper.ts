import { PATTERN_VAULT_KEY_NAME } from '../../../../shared/constants/general';

export const textField = (value, rules) => {
  if (rules?.required && !value) {
    return false;
  }

  if (rules?.minLength && value?.length < rules?.minLength) {
    return false;
  }

  if (rules?.maxLength && value?.length > rules?.maxLength) {
    return false;
  }

  if (rules?.vaultKeyName && !PATTERN_VAULT_KEY_NAME.test(value)) {
    return false;
  }

  return true;
};

export const selectField = (value, rules) => {
  if (rules?.required && !value) {
    return false;
  }

  if (rules?.minLength && value?.length < rules?.minLength) {
    return false;
  }

  if (rules?.maxLength && value?.length > rules?.maxLength) {
    return false;
  }

  // if the value is not an array, check if it is in the oneOf array
  if (value && !Array.isArray(value) && rules?.oneOf && !rules?.oneOf.includes(value)) {
    return false;
  }

  // if the value is an array, check if all values are in the oneOf array
  if (
    value &&
    Array.isArray(value) &&
    rules?.oneOf &&
    !value?.every((item) => rules?.oneOf.includes(item))
  ) {
    return false;
  }

  return true;
};

// TODO: need to use window['isUniqueVaultKeyName'] to avoid duplicate code
export async function isUniqueVaultKeyName(value: string, keyId: string): Promise<boolean> {
  try {
    const isKeyExistsResponse = await fetch(
      `/api/page/vault/keys/name/${value}/exists?excludeId=${keyId}`,
    ).then((res) => res.json());
    if (!isKeyExistsResponse?.success) {
      throw new Error('Something went wrong. Please try again or contact support.');
    }

    const isKeyExists = isKeyExistsResponse?.data;

    // const isUnique =
    //   Object.keys(keyObj).length === 0 ||
    //   (keyId && keyObj[keyId]?.name.toLowerCase() === value.trim().toLowerCase());

    return !isKeyExists;
  } catch {
    throw new Error('Something went wrong. Please try again or contact support.');
  }
}
