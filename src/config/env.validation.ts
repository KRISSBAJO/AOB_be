type EnvInput = Record<string, unknown>;

export function validateEnv(config: EnvInput) {
  const port = Number(config.PORT ?? 3001);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return {
    ...config,
    PORT: port,
    DATABASE_URL: config.DATABASE_URL,
    CORS_ORIGIN: config.CORS_ORIGIN,
    API_KEY: config.API_KEY,
    JWT_SECRET: config.JWT_SECRET,
    JWT_ACCESS_TTL_SECONDS: Number(config.JWT_ACCESS_TTL_SECONDS ?? 900),
    JWT_REFRESH_SECRET: config.JWT_REFRESH_SECRET,
    JWT_REFRESH_TTL_DAYS: Number(config.JWT_REFRESH_TTL_DAYS ?? 30),
    PASSWORD_RESET_TTL_MINUTES: Number(config.PASSWORD_RESET_TTL_MINUTES ?? 30),
  };
}
