import { Module } from "@nestjs/common";
import { EmailService } from "./email.service.js";
import { EmailController } from "./email.controller.js";

// AuthModule помечен @Global() — JwtAuthGuard/PermissionsGuard доступны без import.
@Module({
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
