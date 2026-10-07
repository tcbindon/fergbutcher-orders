export const getNextNumericId = (
  records: Array<{ id: string }>,
  additionalRecords: Array<{ id: string }> = []
): string => {
  const usedIds = new Set([...records, ...additionalRecords].map(record => record.id));
  const numericIds = [...usedIds]
    .filter(id => /^\d+$/.test(id))
    .map(id => Number(id));
  let nextId = (numericIds.length > 0 ? Math.max(...numericIds) : 0) + 1;

  while (usedIds.has(String(nextId))) {
    nextId++;
  }

  return String(nextId);
};
