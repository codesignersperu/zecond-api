import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '@app/app.module';
import { GlobalExceptionFilter } from '@libs/global/filters';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // for stripe webhook
  });
  app.enableCors();
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const config = new DocumentBuilder()
    .setTitle('ZECOND API')
    .setDescription('Documentation for the ZECOND API endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.APP_PORT ?? 3000);

  console.log(
    'Swagger at http://localhost:' + (process.env.APP_PORT ?? 3000) + '/docs',
  );
}
bootstrap();
