import type { SheetRows } from './model'

/** The spreadsheet reader itself could not be downloaded (offline, or the app is out of date). */
export class ReaderUnavailableError extends Error {}

/** Reading took far too long, so it was given up on. */
export class ReadTimeoutError extends Error {}

const READ_TIMEOUT_MS = 30_000

async function loadReader() {
  try {
    return (await import('read-excel-file/browser')).default
  } catch {
    throw new ReaderUnavailableError('The spreadsheet reader could not be downloaded.')
  }
}

/**
 * Reads every tab of an .xlsx file chosen in the browser.
 * The spreadsheet library is only downloaded when an import is actually started,
 * so it does not slow down everyday use of the app.
 */
export async function readSpreadsheetFile(file: File): Promise<Record<string, SheetRows>> {
  const readXlsxFile = await loadReader()
  // Safety net: if the reader ever stalls, say so instead of spinning forever.
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const sheets = await Promise.race([
      readXlsxFile(file),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ReadTimeoutError('Reading the spreadsheet took too long.')), READ_TIMEOUT_MS)
      }),
    ])
    const result: Record<string, SheetRows> = {}
    for (const sheet of sheets) result[sheet.sheet] = sheet.data as SheetRows
    return result
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
