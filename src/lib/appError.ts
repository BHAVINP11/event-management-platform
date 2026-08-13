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
