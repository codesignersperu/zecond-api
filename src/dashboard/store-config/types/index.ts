export type CategoriesResponse = Record<
  string,
  { id: number; subcategories: [string, string][] }
>;
