export const todayLocal = (): string => new Date().toLocaleDateString('en-CA');

export const formatDateLocal = (dt: Date): string => dt.toLocaleDateString('en-CA');

export const parseDateLocal = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
