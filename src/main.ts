import { NestFactory } from '@nestjs/core';
import { MainModule } from './main.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(MainModule, {
    rawBody: true,
    cors: true,
  });
  // app.use(helmet());
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
