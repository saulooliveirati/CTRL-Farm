import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const exceptionResponse = exception.getResponse();
    let message = exception.message;

    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, unknown>;
      if (Array.isArray(respObj.message)) {
        message = respObj.message.join(", ");
      } else if (typeof respObj.message === "string") {
        message = respObj.message;
      }
    }

    response.status(exception.getStatus()).json({
      success: false,
      statusCode: exception.getStatus(),
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
