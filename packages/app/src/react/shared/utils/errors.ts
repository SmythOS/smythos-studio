// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractError = (error: any): string | null => {
  if (error instanceof Error) return error.message;
  return error?.error?.message || error?.message || error?.error || error?.statusText;
};
