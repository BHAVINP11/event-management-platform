/**
 * Application-level errors.
 *
 * Infrastructure failures (Firestore/Firebase) are converted into these at the
 * feature-service boundary so that UI code never sees provider error codes,
 * stack traces, or internal identifiers.
 */
export class AppError extends Error {
  readonly friendlyMessage: string;

  constructor(friendlyMessage: string, message = friendlyMessage) {
    super(message);
    this.name = 'AppError';
    this.friendlyMessage = friendlyMessage;
  }
}

export class DashboardLoadError extends AppError {
  constructor(friendlyMessage = "We couldn't load your dashboard right now.") {
    super(friendlyMessage);
    this.name = 'DashboardLoadError';
  }
}

export class EventLoadError extends AppError {
  constructor(friendlyMessage = "We couldn't load this event right now.") {
    super(friendlyMessage);
    this.name = 'EventLoadError';
  }
}

/**
 * Raised when event creation fails, whether from invalid input, denied
 * organization access, or an infrastructure failure. `code` carries the
 * Cloud Function's error code so the UI can special-case a handful of
 * expected outcomes without parsing the message text.
 */
export class EventCreationError extends AppError {
  readonly code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'EventCreationError';
    this.code = code;
  }
}

/**
 * Raised when creating or accepting an invitation fails, whether from
 * invalid input, denied event access, an expired/mismatched invitation, or
 * an infrastructure failure. `code` carries the Cloud Function's error code.
 */
export class InvitationError extends AppError {
  readonly code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'InvitationError';
    this.code = code;
  }
}

/**
 * Raised when loading or writing a guest fails, whether from invalid input,
 * denied event access/role, a missing guest, or an infrastructure failure.
 * `code` carries the Cloud Function's error code where one applies.
 */
export class GuestError extends AppError {
  readonly code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'GuestError';
    this.code = code;
  }
}

/**
 * Raised when loading or writing a function/ceremony fails, whether from
 * invalid input, denied event access/role, a missing function, or an
 * infrastructure failure. `code` carries the Cloud Function's error code
 * where one applies.
 */
export class FunctionError extends AppError {
  readonly code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'FunctionError';
    this.code = code;
  }
}

/**
 * Raised when loading or writing an expense, or reading/setting an event's
 * budget, fails — whether from invalid input, denied event access/role, a
 * missing expense, or an infrastructure failure. `code` carries the Cloud
 * Function's error code where one applies.
 */
export class ExpenseError extends AppError {
  readonly code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'ExpenseError';
    this.code = code;
  }
}

/**
 * Raised when loading or writing a vendor fails, whether from invalid
 * input, denied event access/role, a missing vendor, or an infrastructure
 * failure. `code` carries the Cloud Function's error code where one
 * applies.
 */
export class VendorError extends AppError {
  readonly code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'VendorError';
    this.code = code;
  }
}

/**
 * Raised when loading or writing a task fails, whether from invalid
 * input, denied event access/role, a missing task, an invalid assignee,
 * or an infrastructure failure. `code` carries the Cloud Function's error
 * code where one applies.
 */
export class TaskError extends AppError {
  readonly code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'TaskError';
    this.code = code;
  }
}
