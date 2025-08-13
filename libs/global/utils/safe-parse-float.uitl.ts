export function safeParseFloat(value: string | undefined): number {
  if (!value || value.trim() === '') {
    throw new Error(`Invalid or missing numeric value: ${value}`);
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Cannot parse '${value}' as float`);
  }
  return parsed;
}
