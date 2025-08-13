import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/db/src/schemas/index.ts',
  out: './libs/db/src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL as string,
    ssl: false,
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
