export type JwtPayload = {
  id: string;
  email: string;
  sessionId: string;
};

export type AuthModuleOptions = {
  jwtSecret: string;
};

export type AuthModuleAsyncOptions = {
  imports?: any[];
  useFactory: (
    ...args: any[]
  ) => Promise<AuthModuleOptions> | AuthModuleOptions;
  inject?: any[];
};

export type AuthRequestMetadata = {
  isActiveUserOnly: boolean;
};
