import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

/** Мінімальна імітація сервісів Google Apps Script для запуску google-sheets/Code.gs у Node. */
class FakeRange {
  constructor(
    private sheet: FakeSheet,
    private row: number,
    private col: number,
    private rows: number,
    private cols: number,
  ) {}
  getValues() {
    return Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.cols }, (_, c) => this.sheet.cell(this.row + r, this.col + c)),
    );
  }
  getDisplayValues() {
    return this.getValues().map((r) => r.map((v) => (v instanceof Date ? v.toISOString() : String(v ?? ""))));
  }
  setValues(values: unknown[][]) {
    if (values.length !== this.rows || values.some((r) => r.length !== this.cols)) throw new Error("size mismatch");
    values.forEach((r, i) => r.forEach((v, j) => this.sheet.set(this.row + i, this.col + j, v)));
    return this;
  }
  setNumberFormats(f: string[][]) {
    if (f.length !== this.rows) throw new Error("formats size mismatch");
    return this;
  }
  setFontWeight() {
    return this;
  }
  setBackground() {
    return this;
  }
}

export class FakeSheet {
  data: unknown[][] = [];
  constructor(private name: string) {}
  getName() {
    return this.name;
  }
  cell(r: number, c: number) {
    return this.data[r - 1]?.[c - 1] ?? "";
  }
  set(r: number, c: number, v: unknown) {
    while (this.data.length < r) this.data.push([]);
    this.data[r - 1][c - 1] = v;
  }
  getLastRow() {
    return this.data.length;
  }
  getRange(row: number, col: number, rows = 1, cols = 1) {
    return new FakeRange(this, row, col, rows, cols);
  }
  getDataRange() {
    const cols = Math.max(0, ...this.data.map((r) => r.length));
    return new FakeRange(this, 1, 1, this.data.length, cols);
  }
  setFrozenRows() {}
}

export function loadAppsScript(secret = "s3cret") {
  const sheets = new Map<string, FakeSheet>();
  let locked = false;
  const spreadsheet = {
    getName: () => "Фіксатор часу",
    getSheetByName: (n: string) => sheets.get(n) ?? null,
    insertSheet: (n: string) => {
      const s = new FakeSheet(n);
      sheets.set(n, s);
      return s;
    },
    setSpreadsheetTimeZone: () => {},
  };
  const context = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, flush: () => {} },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          if (locked) throw new Error("lock busy");
          locked = true;
        },
        releaseLock: () => {
          locked = false;
        },
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (content: string) => ({ content, setMimeType() { return this; } }),
    },
    Date,
    Map,
    JSON,
    String,
    Number,
    Math,
    Object,
  });
  const code = readFileSync(path.join(__dirname, "../../google-sheets/Code.gs"), "utf8");
  vm.runInContext(code, context);
  const doPost = (body: string) =>
    (context.doPost as (e: unknown) => { content: string })({ postData: { contents: body } }).content;

  /** fetch, що передає запит у doPost (як вебдодаток Apps Script після переадресації). */
  const fetchImpl = (async (_url: string, init?: RequestInit) =>
    new Response(doPost(String(init?.body)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  return { sheets, doPost, fetchImpl, isLocked: () => locked };
}
