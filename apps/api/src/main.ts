import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("CTRL+Farm API")
    .setDescription("API oficial do CTRL+Farm")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document);

  await app.listen(process.env.PORT ?? 3001);

  console.log("🚀 CTRL+Farm API iniciada!");
  console.log(`🌐 http://localhost:${process.env.PORT ?? 3001}`);
  console.log(`📚 Swagger: http://localhost:${process.env.PORT ?? 3001}/docs`);
}

await bootstrap();
