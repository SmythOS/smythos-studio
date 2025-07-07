import httpStatus from 'http-status';
import ApiError from './apiError';

export const extractVersionComponents = (version: string) => {
  // example version: '1.1', '1.2'
  const matchRegex = /^\d+\.\d+$/;
  if (!matchRegex.test(version)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid version: ${version}`);
  }
  const versionComponents = version.split('.');
  const major = Number(versionComponents[0]);
  const minor = Number(versionComponents[1]);
  return { major, minor };
};

export const buildUnformattedVersion = ({ major, minor }: { major: number; minor: number }) => {
  return `${major}.${minor}`;
};
