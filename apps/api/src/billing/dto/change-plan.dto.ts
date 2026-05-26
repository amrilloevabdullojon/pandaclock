import { IsIn } from "class-validator";
import type { PlanCode } from "../pricing.js";

const PLANS: PlanCode[] = ["STARTER", "BUSINESS", "PRO", "ENTERPRISE"];

export class ChangePlanDto {
  @IsIn(PLANS)
  plan!: PlanCode;

  @IsIn(["MONTHLY", "YEARLY"])
  period!: "MONTHLY" | "YEARLY";
}
