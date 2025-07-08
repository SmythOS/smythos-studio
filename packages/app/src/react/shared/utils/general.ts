import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const copyTextToClipboard = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

export const navigateTo = (url: string, isParent = true, target = '_self') => {
  const anchor = document.createElement('a');
  anchor.href = url;
  if (isParent) {
    anchor.target = '_parent';
  } else {
    anchor.target = target;
  }
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};