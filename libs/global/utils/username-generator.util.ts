import { generateRandomHex } from './random-strng.util';

export const sanitizeUsername = (str: string) =>
  str.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase(); // allow letters, digits, underscore, hyphen, and dot

export function usernameGen(firstName: string, lastName: string) {
  const safeFirst = sanitizeUsername(firstName).slice(0, 6);
  const safeLast = sanitizeUsername(lastName).slice(0, 6);

  return `${safeFirst}.${safeLast}-${generateRandomHex(6)}`;
}
