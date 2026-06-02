import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ChatsService } from "./chats.service.js";
import { ChatUploadsService } from "./chat-uploads.service.js";
import { ChatsController } from "./chats.controller.js";
import { ChatsGateway } from "./chats.gateway.js";
import { TenantModule } from "../tenant/tenant.module.js";

@Module({
  imports: [TenantModule, JwtModule.register({})],
  providers: [ChatsService, ChatUploadsService, ChatsGateway],
  controllers: [ChatsController],
  exports: [ChatsService],
})
export class ChatsModule {}
