import { toast } from 'react-toastify';
import { ERR_MSG_VAULT_KEY_NAME } from '../../../../shared/constants/general';
import * as validate from './validate-form.helper';

// * N:B We have bare minimum validation process. We can enhance it by adding more validation rules and rule specific error messages.

export const scopeOptions = [
  { value: 'All', label: 'All' },
  { value: 'APICall', label: 'API Call' },
  { value: 'HuggingFace', label: 'Hugging Face' },
  { value: 'ZapierAction', label: 'Zapier Action' },
];

const validationRules = {
  key: { required: true, maxLength: 10000 },
  keyName: { required: true, maxLength: 300, vaultKeyName: true },
  scope: { oneOf: scopeOptions.map((option) => option.value) },
};

const errorMsg = {
  key: 'Key is required and must be less than 10000 characters.',
  keyName: { general: ERR_MSG_VAULT_KEY_NAME, unique: 'Key Name must be unique.' },
  scope: 'Invalid Scope.',
};

type IsValidParams = {
  field: string;
  value: string | string[];
  keyId?: string;
  functions: any;
};

export const isValid = async ({ field, value, keyId, functions }: IsValidParams) => {
  let isValid = true;

  if (field === 'scope') {
    isValid = validate.selectField(value, validationRules[field]);

    if (!isValid) {
      functions[field]?.error(errorMsg[field]);
    }
  } else if (field === 'keyName') {
    isValid = validate.textField(value, validationRules[field]);

    if (!isValid) {
      functions[field]?.error(errorMsg[field]?.general);
    } else {
      functions?.setCheckingUniqueKey(true);

      try {
        const isUniqueKey = await validate.isUniqueVaultKeyName(value as string, keyId);

        if (!isUniqueKey) {
          if (typeof functions[field]?.error === 'function') {
            functions[field].error(errorMsg[field].unique);
          }
          isValid = false;
        }
      } catch (error) {
        // TODO: Show toast message
        toast.error('Something went wrong. Please try again later.');
        console.error(error);
      }

      functions?.setCheckingUniqueKey(false);
    }
  } else {
    isValid = validate.textField(value, validationRules[field]);

    if (!isValid) {
      functions[field]?.error(errorMsg[field]);
    }
  }

  return isValid;
};
