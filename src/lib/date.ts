/**
 * Display helpers for the ISO-8601 date strings stored on domain records.
 *
 * These never throw: an unparseable value is reported as absent so a single bad
 * record cannot break a list.
 */

const displayFormat: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
};

export const parseIsoDate = (value: string | undefined | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Formats an ISO date string as `12 Feb 2027`, or returns null when unusable. */
export const formatEventDate = (value: string | undefined | null): string | null => {
  const parsed = parseIsoDate(value);
  return parsed ? parsed.toLocaleDateString('en-GB', displayFormat) : null;
};

/** Formats a start/end pair as a single range label. */
export const formatDateRange = (
  startDate: string | undefined | null,
  endDate: string | undefined | null
): string | null => {
  const start = formatEventDate(startDate);
  const end = formatEventDate(endDate);

  if (start && end && start !== end) {
    return `${start} – ${end}`;
  }

  return start ?? end;
};
