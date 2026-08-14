import { Timestamp } from 'firebase/firestore';
import { RepositoryDataError } from '@/repositories/errors';

const isTimestamp = (value: unknown): value is Timestamp => value instanceof Timestamp;

export const getRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }

  throw new RepositoryDataError(`Missing or invalid '${fieldName}'.`);
};

export const getOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

export const getNullableString = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

export const getValidatedEnum = <T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T => {
  if (typeof value !== 'string') {
    throw new RepositoryDataError(`Missing or invalid '${fieldName}'.`);
  }

  if (!allowedValues.includes(value as T)) {
    throw new RepositoryDataError(`Unexpected value for '${fieldName}': ${value}`);
  }

  return value as T;
};

/** Like getValidatedEnum, but null/undefined map to undefined instead of throwing. */
export const getOptionalValidatedEnum = <T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  return getValidatedEnum(value, fieldName, allowedValues);
};

export const getStringOrNull = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

export const getOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

export const getRequiredNumber = (value: unknown, fieldName: string): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  throw new RepositoryDataError(`Missing or invalid '${fieldName}'.`);
};
