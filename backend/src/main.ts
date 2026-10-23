import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Wealth4wardNestApp');
  const app = await NestFactory.create(AppModule);

  const rawPrefix = process.env.API_PREFIX || 'api/v1';
  const apiPrefix = rawPrefix.startsWith('/') ? rawPrefix.substring(1) : rawPrefix;
  app.setGlobalPrefix(apiPrefix);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === frontendUrl) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  const port =  process.env.PORT || 8000;
  await app.listen(port);
  logger.log(`🚀 Wealth4ward NestJS Backend is running on: http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
