import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const frontendUrls = (
    config.get<string>('FRONTEND_URL') || 'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedVercelSuffix = '.vercel.app';

  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      const isConfiguredOrigin = Boolean(origin && frontendUrls.includes(origin));
      let isVercelPreview = false;
      try {
        isVercelPreview = Boolean(origin && new URL(origin).hostname.endsWith(allowedVercelSuffix));
      } catch {
        isVercelPreview = false;
      }

      if (!origin || isConfiguredOrigin || isVercelPreview) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = config.get<number>('PORT') || 4000;
  await app.listen(port);

  console.log(`Médilink API running on http://localhost:${port}/api`);
}

bootstrap();
