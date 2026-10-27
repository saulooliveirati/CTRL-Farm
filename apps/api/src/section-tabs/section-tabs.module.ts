import { Module } from "@nestjs/common";
import { SectionTabsController } from "./section-tabs.controller.js";
import { SectionTabsService } from "./section-tabs.service.js";

@Module({
  controllers: [SectionTabsController],
  providers: [SectionTabsService],
  exports: [SectionTabsService],
})
export class SectionTabsModule {}
