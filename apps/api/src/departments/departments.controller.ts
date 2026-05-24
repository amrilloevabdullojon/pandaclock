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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DepartmentsService, type DepartmentNode, type DepartmentRow } from "./departments.service.js";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto/department.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";

@ApiTags("departments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: "Список отделов (плоский)" })
  list(): Promise<DepartmentRow[]> {
    return this.departments.list();
  }

  @Get("tree")
  @ApiOperation({ summary: "Дерево отделов" })
  tree(): Promise<DepartmentNode[]> {
    return this.departments.tree();
  }

  @Post()
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  create(@Body() dto: CreateDepartmentDto): Promise<DepartmentRow> {
    return this.departments.create(dto);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "HR")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentRow> {
    return this.departments.update(id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.departments.remove(id);
  }
}
