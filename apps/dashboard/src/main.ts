import { NestFactory } from '@nestjs/core';
import { DashboardModule } from '@dashboard/dashboard.module';
import { GlobalExceptionFilter } from '@libs/global/filters';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(DashboardModule);
  app.enableCors();
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  await app.listen(process.env.DASHBOARD_PORT ?? 3000);
}
bootstrap();
