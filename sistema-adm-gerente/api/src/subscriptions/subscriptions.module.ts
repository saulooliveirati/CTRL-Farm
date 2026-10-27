import { Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { SubscriptionsController } from "./subscriptions.controller.js";
import { SubscriptionsService } from "./subscriptions.service.js";

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
