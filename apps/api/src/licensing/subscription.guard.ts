import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { LicensingService } from "./licensing.service.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";

export const FEATURE_KEY = "required_feature";
export const RequireFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private licensingService: LicensingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    const hasAccess = await this.licensingService.checkFeatureAccess(user, requiredFeature);

    if (!hasAccess) {
      throw new ForbiddenException(
        `O recurso "${requiredFeature}" não está liberado no seu plano atual ou sua assinatura expirou. Acesse Configurações > Licenciamento para ativar uma chave compatível.`,
      );
    }

    return true;
  }
}
