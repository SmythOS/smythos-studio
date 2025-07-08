import { jsonrepair } from 'jsonrepair';

export const isNumber = (str: string): boolean => {
  const numRegex = /^-?\d+(\.\d+)?$/;
  return numRegex.test(str.trim());
};

export const isValidNumber = (str: string): boolean => {
  const num = parseFloat(str);
  return (
    !isNaN(num) &&
    num <= Number.MAX_SAFE_INTEGER &&
    num >= Number.MIN_SAFE_INTEGER &&
    num.toString() === str.trim()
  );
};

export function parseJson(str: string): string | Record<string, unknown> | null {
  if (!str) return null;

  if (
    (isNumber(str) && !isValidNumber(str)) ||
    (!str.trim().startsWith('{') && !str.trim().startsWith('['))
  )
    return str;

  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return JSON.parse(jsonrepair(str));
    } catch (e: any) {
      console.error('Error on parseJson: ', e.toString());
      console.error('   Tried to parse: ', str);
      return null;
    }
  }
}
