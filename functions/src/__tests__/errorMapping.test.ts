import { mapErrorToCallableResponse } from '../errorMapping';
import { ValidationError } from '../validation';

describe('mapErrorToCallableResponse', () => {
  test.each([
    ['invalid_name', 'invalid-argument'],
    ['invalid_type', 'invalid-argument'],
    ['invalid_start_date', 'invalid-argument'],
    ['invalid_end_date', 'invalid-argument'],
    ['invalid_timezone', 'invalid-argument'],
    ['invalid_venue_name', 'invalid-argument'],
    ['invalid_venue_address', 'invalid-argument'],
    ['invalid_organization_id', 'invalid-argument'],
    ['invalid_input', 'invalid-argument'],
    ['unauthenticated', 'unauthenticated'],
    ['organization_not_found', 'not-found'],
    ['organization_access_denied', 'permission-denied'],
    ['organization_role_not_allowed', 'permission-denied'],
    ['organization_slug_taken', 'already-exists'],
    ['conflict', 'already-exists']
  ])('maps ValidationError(%s) to firebaseCode %s', (appCode, firebaseCode) => {
    const result = mapErrorToCallableResponse(new ValidationError(appCode, 'some message'));

    expect(result.firebaseCode).toBe(firebaseCode);
    expect(result.appCode).toBe(appCode);
    expect(result.message).toBe('some message');
  });

  test('preserves the original message alongside the mapped code', () => {
    const result = mapErrorToCallableResponse(
      new ValidationError('organization_role_not_allowed', 'Your role does not allow this.')
    );

    expect(result).toEqual({
      firebaseCode: 'permission-denied',
      message: 'Your role does not allow this.',
      appCode: 'organization_role_not_allowed'
    });
  });

  test('maps an unrecognized ValidationError code to internal, not invalid-argument', () => {
    const result = mapErrorToCallableResponse(new ValidationError('something_new', 'message'));

    expect(result.firebaseCode).toBe('internal');
    expect(result.appCode).toBe('something_new');
  });

  test('maps a Firestore "already exists" error without leaking its message', () => {
    const result = mapErrorToCallableResponse(new Error('6 ALREADY_EXISTS: document already exists'));

    expect(result).toEqual({
      firebaseCode: 'already-exists',
      message: 'This resource already exists.',
      appCode: 'conflict'
    });
  });

  test('maps a Firestore permission error without leaking its message', () => {
    const result = mapErrorToCallableResponse(new Error('7 PERMISSION_DENIED: Missing permissions'));

    expect(result).toEqual({
      firebaseCode: 'permission-denied',
      message: 'You do not have permission to perform this action.',
      appCode: 'permission_denied'
    });
  });

  test('maps an unrecognized Error to a generic internal error, never its raw message', () => {
    const result = mapErrorToCallableResponse(new Error('Firestore: 5 NOT_FOUND at internal/path/xyz'));

    expect(result).toEqual({
      firebaseCode: 'internal',
      message: 'An unexpected error occurred. Please try again.',
      appCode: 'internal_error'
    });
  });

  test('maps a non-Error throw to a generic internal error', () => {
    const result = mapErrorToCallableResponse('a raw string throw');

    expect(result).toEqual({
      firebaseCode: 'internal',
      message: 'An unexpected error occurred. Please try again.',
      appCode: 'internal_error'
    });
  });
});
