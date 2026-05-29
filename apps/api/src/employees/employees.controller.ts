import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { EmployeesService } from "./employees.service.js";
import { InvitationsService } from "./invitations.service.js";
import { ExcelImportService } from "./excel-import.service.js";
import { EmployeesQueryDto } from "./dto/employees-query.dto.js";
import { UpdateEmployeeDto } from "./dto/update-employee.dto.js";
import { InviteEmployeesDto } from "./dto/invite-employee.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { PermissionsGuard } from "../auth/permissions.guard.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("employees")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("employees")
export class EmployeesController {
  constructor(
    private readonly employees: EmployeesService,
    private readonly invitations: InvitationsService,
    private readonly excelImport: ExcelImportService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Список сотрудников tenant'а" })
  @RequirePermissions("employees:read")
  list(@Query() query: EmployeesQueryDto) {
    return this.employees.list(query);
  }

  @Get(":id")
  @RequirePermissions("employees:read")
  detail(@Param("id", ParseUUIDPipe) id: string) {
    return this.employees.getById(id);
  }

  @Patch(":id")
  @RequirePermissions("employees:write")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions("employees:delete")
  @HttpCode(204)
  deactivate(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.employees.deactivate(id);
  }

  @Patch("bulk/status")
  @RequirePermissions("employees:bulk")
  bulkStatus(@Body() dto: { ids: string[]; status: "ACTIVE" | "SUSPENDED" | "TERMINATED" }) {
    return this.employees.bulkSetStatus(dto.ids, dto.status);
  }

  @Post("invite")
  @RequirePermissions("employees:invite")
  @HttpCode(201)
  invite(
    @Body() dto: InviteEmployeesDto,
    @Req() req: Request,
    @CurrentUser() user: AuthRequestUser,
  ) {
    if (!req.tenant) throw new Error("tenant required");
    return this.invitations.invite(dto.invitees, req.tenant.slug, {
      firstName: user.email.split("@")[0] ?? "",
      lastName: "",
    });
  }

  @Post("import")
  @RequirePermissions("employees:invite")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  importExcel(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Req() req: Request,
    @CurrentUser() user: AuthRequestUser,
  ) {
    if (!file) throw new Error("file is required");
    if (!req.tenant) throw new Error("tenant required");
    return this.excelImport.importFromBuffer(file.buffer, req.tenant.slug, {
      firstName: user.email.split("@")[0] ?? "",
      lastName: "",
    });
  }
}
