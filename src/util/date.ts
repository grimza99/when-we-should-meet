export const addOneMonth = (isoDate: string) => {
  const expiresAt = new Date(isoDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt.toISOString();
};
