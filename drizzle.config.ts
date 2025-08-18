import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schemas/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL,
    ssl: false,
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
