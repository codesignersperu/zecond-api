import * as crypto from 'crypto';

/**
 * `generateRandomHex` generates a random hexadecimal string of the specified length using node.js's built-in crypto module.
 * @param {number} length - The desired length of the random string.
 * @returns {string} A random hexadecimal string of the specified length.
 */
export function generateRandomHex(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex');
}
