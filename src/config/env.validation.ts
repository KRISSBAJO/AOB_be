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
    AWS_REGION: config.AWS_REGION ?? config.S3_REGION,
    AWS_S3_BUCKET: config.AWS_S3_BUCKET ?? config.S3_BUCKET,
    AWS_ACCESS_KEY_ID: config.AWS_ACCESS_KEY_ID ?? config.S3_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: config.AWS_SECRET_ACCESS_KEY ?? config.S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_BASE_URL: config.S3_PUBLIC_BASE_URL,
    CLOUDINARY_CLOUD_NAME: config.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: config.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: config.CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_FOLDER: config.CLOUDINARY_UPLOAD_FOLDER,
    CLOUDINARY_UPLOAD_PRESET: config.CLOUDINARY_UPLOAD_PRESET,
    SMTP_HOST: config.SMTP_HOST,
    SMTP_PORT: Number(config.SMTP_PORT ?? 587),
    SMTP_USER: config.SMTP_USER,
    SMTP_PASS: config.SMTP_PASS ?? config.SMTP_PASSWORD,
    SMTP_SECURE: config.SMTP_SECURE,
    EMAIL_FROM: config.EMAIL_FROM ?? config.MAIL_FROM,
    MAIL_PROVIDER: config.MAIL_PROVIDER,
  };
}
