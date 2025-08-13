import { isEqual } from 'lodash';

export function diffObject(obj1: any, obj2: any): Record<string, any> {
  const beforeValue = {};
  const afterValue = {};

  // Get all keys that exist in both objects
  const commonKeys = Object.keys(obj1).filter((key) => key in obj2);

  // Compare values for common keys
  for (const key of commonKeys) {
    if (!isEqual(obj1[key], obj2[key])) {
      beforeValue[key] = obj1[key];
      afterValue[key] = obj2[key];
    }
  }

  return { beforeValue, afterValue };
}
