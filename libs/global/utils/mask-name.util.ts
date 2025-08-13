const maskString = (str: string) => {
  if (!str || str.length === 0) return '';
  return str.charAt(0) + '*'.repeat(str.length - 1);
};

export function maskName(firstName: string, lastName: string) {
  return `${maskString(firstName)} ${maskString(lastName)}`;
}
