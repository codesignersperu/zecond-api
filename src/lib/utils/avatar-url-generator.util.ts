/**
 * `avatarUrlGenerator` uses ui-avatars.com to generate avatar URLs.
 * @param {string} firstName - The first name of the user.
 * @param {string} lastName - The last name of the user.
 * @returns {string} - The URL of the generated avatar.
 */
export function avatarUrlGenerator(
  firstName: string,
  lastName: string,
): string {
  return `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&size=128&font-size=0.4`;
}
