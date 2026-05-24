import { Injectable } from "@nestjs/common";
import { read, utils } from "xlsx";
import { InvitationsService, type InviteOutcome } from "./invitations.service.js";
import type { InviteEmployeeEntry } from "./dto/invite-employee.dto.js";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class ExcelImportService {
  constructor(private readonly invitations: InvitationsService) {}

  async importFromBuffer(
    buffer: Buffer,
    tenantSlug: string,
    invitedBy: { firstName: string; lastName: string },
  ): Promise<InviteOutcome> {
    const entries = this.parseBuffer(buffer);
    return this.invitations.invite(entries, tenantSlug, invitedBy);
  }

  parseBuffer(buffer: Buffer): InviteEmployeeEntry[] {
    const workbook = read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];

    const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const entries: InviteEmployeeEntry[] = [];

    for (const row of rows) {
      const email = String(pick(row, ["email", "Email", "E-mail", "Почта"])).trim();
      if (!EMAIL_RX.test(email)) continue;

      entries.push({
        email,
        firstName: String(pick(row, ["firstName", "first_name", "Имя", "Имя сотрудника"]) || "").trim() || undefined,
        lastName: String(pick(row, ["lastName", "last_name", "Фамилия"]) || "").trim() || undefined,
        position: String(pick(row, ["position", "Должность"]) || "").trim() || undefined,
      });
    }

    return entries;
  }
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}
