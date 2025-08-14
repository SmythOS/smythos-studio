import { toast as toastify } from 'react-toastify';

type ToastInput =
  | string
  | {
    title?: string;
    description?: string;
    variant?: 'destructive' | string;
  };

export function useToast() {
  return {
    toast(input: ToastInput) {
      if (typeof input === 'string') {
        toastify(input);
        return;
      }

      const { title, description, variant } = input || {};
      const message = [title, description].filter(Boolean).join(': ');
      const options = variant === 'destructive' ? { type: 'error' as const } : undefined;
      toastify(message || '', options);
    },
  };
}


