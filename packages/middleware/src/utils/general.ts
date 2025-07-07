import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config/config';
import axios from 'axios';
import fs from 'fs/promises';

export function includePagination(pagination?: { page?: string | number; limit?: string | number }): {
  skip?: number;
  take?: number;
} {
  if (!pagination || !pagination?.page || !pagination?.limit) {
    return {};
  }
  let { page, limit } = pagination;

  page = parseInt(page as string, 10);
  limit = parseInt(limit as string, 10);

  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
}

export const stringifyErr = (err: any) => {
  try {
    return JSON.stringify(err);
  } catch (error) {
    return err;
  }
};

export const getFilename = () => {
  return fileURLToPath(import.meta.url);
};

export const getDirname = () => {
  return path.dirname(getFilename());
};

export function convertToOriginalType(value: any) {
  // If the value is already a number, boolean, or object, return it as is
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'object') {
    return value;
  }

  // If the value is not a string, return it as is
  if (typeof value !== 'string') {
    return value;
  }

  // Check for boolean values in string
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  // Check for number values in string
  if (/^-?\d+\.?\d*$/.test(value)) return Number(value);

  // Check for JSON objects/arrays in string
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch (e) {
    // Not a JSON string
  }

  // Return the original string
  return value;
}

export const getTimestampIn000Utc = (date?: Date) => {
  const dateNow = date || new Date();

  // Convert to UTC and set hours, minutes, seconds, and milliseconds to 0
  dateNow.setUTCHours(0, 0, 0, 0);
  return dateNow.getTime();
};

export const getUtcStartOfDayStr = (date?: Date) => {
  const dateNow = date || new Date();
  dateNow.setUTCHours(0, 0, 0, 0);
  return dateNow.toISOString();
};

export const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT: 'P2002',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  NON_EXISTENT_RECORD: 'P2025',
};

export const dirExists = async (path: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return false; // directory does not exist
    }
    throw err; // rethrow other errors
  }
};
