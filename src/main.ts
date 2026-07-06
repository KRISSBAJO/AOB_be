import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3001);
  const corsOrigin = configService.get<string>("CORS_ORIGIN");

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(",").map((origin) => origin.trim()) : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
    }),
  );

  const documentConfig = new DocumentBuilder()
    .setTitle("AOG Service API")
    .setDescription("Backend API for AOG Services operations")
    .setVersion("0.1.0")
    .addApiKey({ type: "apiKey", name: "x-api-key", in: "header" }, "api-key")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
}

void bootstrap();
