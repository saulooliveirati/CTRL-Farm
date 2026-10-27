import { ExecutionContext, Injectable, createParamDecorator } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { AuthenticatedAdmin } from "./jwt.strategy.js";

@Injectable()
export class JwtAdminAuthGuard extends AuthGuard("admin-jwt") {}

export const CurrentAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
