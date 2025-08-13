export function isObjEmpty(obj: Record<string, any>) {
  for (var x in obj) {
    return false;
  }
  return true;
}
