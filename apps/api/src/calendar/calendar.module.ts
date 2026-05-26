import { Module } from "@nestjs/common";
import { CalendarService } from "./calendar.service.js";
import { CalendarController } from "./calendar.controller.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule],
  providers: [CalendarService],
  controllers: [CalendarController],
  exports: [CalendarService],
})
export class CalendarModule {}
