import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { AiFarmService } from "./ai-farm.service.js";

@ApiTags("IA Farm")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ai-farm")
export class AiFarmController {
  constructor(private readonly aiFarm: AiFarmService) {}

  @Post("chat")
  chat(@CurrentUser() user: AuthenticatedUser, @Body() body: { messages?: unknown }) {
    return this.aiFarm.chat(user, body.messages);
  }

  @Post("execute")
  execute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { action?: unknown; confirmed?: boolean },
  ) {
    return this.aiFarm.execute(user, body.action, body.confirmed === true);
  }
}
