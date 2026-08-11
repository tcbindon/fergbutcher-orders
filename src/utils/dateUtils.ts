// All date helpers use Pacific/Auckland so "today" is correct regardless of
// the browser's local timezone or daylight saving changes.

const NZ_TIMEZONE = 'Pacific/Auckland';

/** Returns the current date in NZ as a YYYY-MM-DD string. */
export const todayLocal = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: NZ_TIMEZONE });
};

/** Formats any Date as a YYYY-MM-DD string in NZ time. */
export const formatDateLocal = (dt: Date): string => {
  return dt.toLocaleDateString('en-CA', { timeZone: NZ_TIMEZONE });
};

/** Parses a YYYY-MM-DD string into a local Date at midnight. */
export const parseDateLocal = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Returns a date N days from today in NZ timezone as YYYY-MM-DD. */
export const addDaysLocal = (days: number): string => {
  const nzTodayStr = todayLocal();
  const [y, m, d] = nzTodayStr.split('-').map(Number);
  const nzToday = new Date(y, m - 1, d);
  nzToday.setDate(nzToday.getDate() + days);
  return formatDateLocal(nzToday);
};

/** Returns the start of the current week (Monday) in NZ time as YYYY-MM-DD. */
export const startOfWeekLocal = (): string => {
  const nzTodayStr = todayLocal();
  const [y, m, d] = nzTodayStr.split('-').map(Number);
  const nzDate = new Date(y, m - 1, d);
  const offset = (nzDate.getDay() + 6) % 7; // Monday = 0
  nzDate.setDate(nzDate.getDate() - offset);
  return formatDateLocal(nzDate);
};
