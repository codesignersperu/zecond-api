export function safeParseInt(value: string | undefined): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (!value || value.trim() === '') {
    throw new Error(`Invalid or missing numeric value: ${value}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Cannot parse '${value}' as integer`);
  }
  return parsed;
}
