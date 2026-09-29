import ExcelJS from "exceljs";
import Papa from "papaparse";
import { requireAdmin, UnauthorizedError } from "@/lib/admin";
import { templateRows } from "@/lib/importer";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof UnauthorizedError) return Response.json({ error: "Немає доступу" }, { status: 401 });
    throw e;
  }
  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const rows = templateRows();
  if (format === "csv") {
    return new Response("﻿" + Papa.unparse(rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="shablon-tovariv.csv"' },
    });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Товари");
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 18));
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="shablon-tovariv.xlsx"',
    },
  });
}
