declare namespace NodeJS {
  interface ProcessEnv {
    [string]: string | undefined;
    APP_PORT: string;
    DASHBOARD_PORT: string;
    DB_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRY: string;
    SUPPORTED_FILE_TYPES: string;
    MAX_FILE_SIZE: string;
  }
}
