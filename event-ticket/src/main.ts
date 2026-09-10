import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import fastifyHelmet from '@fastify/helmet';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  const logger = new Logger('Bootstrap');

  // Apply Helmet for OWASP security headers (Fastify equivalent)
  await app.register(fastifyHelmet);

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable global validation (OWASP Validation & Sanitization)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,   // Strip unhandled properties 
      forbidNonWhitelisted: true, // Reject request if unknown properties are present
      transform: true  // Automatically transform payload to DTO instance
    })
  )

  // Configure strict CORS policy (OWASP Standard)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200'];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen({ port: Number(port), host: '0.0.0.0' });
  logger.log(`🚀 Api running on: http://localhost:${port}/api/v1`);
}
bootstrap();
