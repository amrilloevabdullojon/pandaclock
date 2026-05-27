import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { JwtStrategy } from "./jwt.strategy.js";
import { TenantModule } from "../tenant/tenant.module.js";
import { EmailModule } from "../email/email.module.js";
import { EmployeesModule } from "../employees/employees.module.js";

@Global()
@Module({
  imports: [
    TenantModule,
    EmailModule,
    EmployeesModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({}),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
