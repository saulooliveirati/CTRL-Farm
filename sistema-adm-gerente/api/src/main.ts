import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      "http://localhost:4000",
      "http://localhost:3000",
      "http://127.0.0.1:4000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Sistema ADM Gerente - CTRL-Farm")
    .setDescription(
      "API privada de licenciamento, clientes, assinaturas, planos, atualizações e validação de chaves RSA do CTRL-Farm.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.ADM_API_PORT || process.env.PORT || 4001);
  await app.listen(port);

  console.log(`\n======================================================`);
  console.log(`🛡️  Sistema ADM Gerente API rodando com sucesso!`);
  console.log(`🌐  Servidor: http://localhost:${port}/api/v1`);
  console.log(`📚  Swagger Docs: http://localhost:${port}/docs`);
  console.log(`======================================================\n`);
}

bootstrap().catch((err) => {
  console.error("Erro fatal ao iniciar Sistema ADM Gerente API:", err);
  process.exit(1);
});
