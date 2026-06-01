import { describe, expect, it, vi } from "vitest";
import { utils, write } from "xlsx";
import { ExcelImportService } from "./excel-import.service.js";

function buildXlsx(rows: Record<string, string>[]): Buffer {
  const sheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, "Sheet1");
  return write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("ExcelImportService.parseBuffer", () => {
  const service = new ExcelImportService({ invite: vi.fn() } as never);

  it("parses common column names (email/firstName/lastName/position)", () => {
    const buffer = buildXlsx([
      { email: "alice@uz", firstName: "Alice", lastName: "K", position: "Manager" },
      { email: "bob@uz", firstName: "Bob", lastName: "Y", position: "Dev" },
    ]);
    const entries = service.parseBuffer(buffer);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ email: "alice@uz", firstName: "Alice", position: "Manager" });
  });

  it("parses Russian column names", () => {
    const buffer = buildXlsx([
      { Email: "anna@uz", "Имя": "Анна", "Фамилия": "Каримова", "Должность": "HR" },
    ]);
    const entries = service.parseBuffer(buffer);
    expect(entries[0]).toMatchObject({ email: "anna@uz", firstName: "Анна", lastName: "Каримова" });
  });

  it("skips rows with invalid email", () => {
    const buffer = buildXlsx([
      { email: "not-an-email" },
      { email: "ok@uz" },
    ]);
    const entries = service.parseBuffer(buffer);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.email).toBe("ok@uz");
  });
});
