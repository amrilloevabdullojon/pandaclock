import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  check(): { status: string; service: string; timestamp: string } {
    return {
      status: "ok",
      service: "pandaclock-api",
      timestamp: new Date().toISOString(),
    };
  }
}
