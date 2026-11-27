import type { SheetRows } from './model'

/**
 * Reads every tab of an .xlsx file chosen in the browser.
 * The spreadsheet library is only downloaded when an import is actually started,
 * so it does not slow down everyday use of the app.
 */
export async function readSpreadsheetFile(file: File): Promise<Record<string, SheetRows>> {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const sheets = await readXlsxFile(file)
  const result: Record<string, SheetRows> = {}
  for (const sheet of sheets) result[sheet.sheet] = sheet.data as SheetRows
  return result
}
