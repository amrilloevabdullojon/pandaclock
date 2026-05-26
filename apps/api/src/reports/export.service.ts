import { Injectable } from "@nestjs/common";
import { utils, write } from "xlsx";
import PDFDocument from "pdfkit";

type RowValue = string | number;

@Injectable()
export class ExportService {
  toExcel(title: string, headers: string[], rows: RowValue[][]): Buffer {
    const sheet = utils.aoa_to_sheet([headers, ...rows]);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, sheet, title.slice(0, 31));
    return write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  async toPdf(title: string, headers: string[], rows: RowValue[][]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).fillColor("#1F2233").text(`🐼 Pandaclock — ${title}`);
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#6B7080")
        .text(`Сгенерировано ${new Date().toISOString()}`);
      doc.moveDown();

      const colCount = headers.length;
      const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / colCount;

      doc.fontSize(11).fillColor("#5B4FE2");
      headers.forEach((header, idx) => {
        doc.text(header, doc.page.margins.left + idx * colWidth, doc.y, {
          width: colWidth,
          continued: idx < colCount - 1,
        });
      });
      doc.moveDown();
      doc
        .strokeColor("#E8EAF2")
        .lineWidth(0.5)
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();
      doc.moveDown(0.3);

      doc.fillColor("#1F2233").fontSize(10);
      rows.forEach((row) => {
        const top = doc.y;
        row.forEach((cell, idx) => {
          doc.text(String(cell), doc.page.margins.left + idx * colWidth, top, {
            width: colWidth,
            continued: idx < row.length - 1,
          });
        });
        doc.moveDown(0.3);
      });

      doc.end();
    });
  }
}
