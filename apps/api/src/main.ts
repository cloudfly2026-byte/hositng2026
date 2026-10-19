import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

if (process.env.HESTIA_ALLOW_SELF_SIGNED === 'true' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['https://velupi.com', 'https://app.velupi.com', 'http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Velupi Control Plane] API listening on port ${port} (0.0.0.0)`);
}

void bootstrap();
