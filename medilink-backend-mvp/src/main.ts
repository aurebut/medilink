import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { SensitiveDataInterceptor } from './common/interceptors/sensitive-data.interceptor';
import { isTrustedWriteRequest } from './common/middleware/request-origin.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const config = app.get(ConfigService);
  app.set('trust proxy', 1);
  const allowedOrigins = [
    config.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    config.get<string>('CORS_ALLOWED_ORIGINS') || '',
  ]
    .join(',')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const frontendUrls = allowedOrigins.map((origin) => {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Unsupported CORS origin protocol: ${origin}`);
    }
    return parsed.origin;
  });

  app.use(cookieParser());
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (config.get<string>('NODE_ENV') === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
      );
    }
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isTrustedWriteRequest(req.method, req.path, req.get('origin'), frontendUrls)) {
      next();
      return;
    }

    res.status(403).json({
      statusCode: 403,
      message: 'Origine de requete non autorisee.',
      error: 'Forbidden',
    });
  });

  app.useGlobalInterceptors(new SensitiveDataInterceptor());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      let normalizedOrigin: string;
      try {
        normalizedOrigin = new URL(origin).origin;
      } catch {
        callback(new Error('Invalid CORS origin'));
        return;
      }

      if (frontendUrls.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  const port = config.get<number>('PORT') || 4000;
  await app.listen(port);

  console.log(`Médilink API running on http://localhost:${port}/api`);
}

bootstrap();
