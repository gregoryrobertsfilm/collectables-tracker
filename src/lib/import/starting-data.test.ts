import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import readXlsxFile from 'read-excel-file/node'
import { describe, expect, it } from 'vitest'
import { computeStats } from '../inventory/stats'
import { formatCents } from '../money'
import { snapshotFromImport, startingDataChecks, STARTING_DATA_EXPECTED } from './checks'
import type { ImportData, SheetRows } from './model'
import { parseWorkbook } from './parse'

/**
 * The import test the brief asks for: read Greg's REAL starting spreadsheet and prove that
 * every number in the section 10 table comes out right.
 *
 * The spreadsheet is not kept on GitHub (it holds buyer usernames), so on a computer that
 * does not have it these tests are skipped with a warning. They always run on Greg's Mac,
 * which is where every deploy is made.
 */
const FILE = fileURLToPath(new URL('../../../Thrilljoy Starting Data for Claude Code - Greg.xlsx', import.meta.url))
const present = existsSync(FILE)
if (!present) console.warn(`\nSKIPPED: starting spreadsheet not found at ${FILE}. The section 10 import checks did not run.\n`)

async function load(): Promise<ImportData> {
  const sheets: Record<string, SheetRows> = {}
  for (const sheet of await readXlsxFile(FILE)) sheets[sheet.sheet] = sheet.data as SheetRows
  const result = parseWorkbook(sheets, { fileName: 'starting-data.xlsx' })
  if (!result.ok) throw new Error(result.problems.map((p) => `${p.tab} row ${p.row}: ${p.message}`).join('\n'))
  return result.data
}

describe.skipIf(!present)("Greg's starting spreadsheet", () => {
  it('reads without a single problem', async () => {
    const data = await load()
    expect(data.releases).toHaveLength(89)
    expect(data.figures).toHaveLength(110)
    // 226 owned copies plus 18 sold units from 17 sales (one sale was for two).
    expect(data.copies.filter((c) => c.status === 'in_hand')).toHaveLength(226)
    expect(data.copies.filter((c) => c.status === 'sold')).toHaveLength(18)
    expect(data.listings).toHaveLength(26)
    expect(data.sales).toHaveLength(17)
  })

  it('reproduces every number in the section 10 table', async () => {
    const stats = computeStats(snapshotFromImport(await load()))
    const rows = startingDataChecks(stats)
    const wrong = rows.filter((row) => !row.ok).map((row) => `${row.label}: expected ${row.expected}, got ${row.actual}`)
    expect(wrong).toEqual([])
    expect(rows).toHaveLength(14)

    // The same numbers again, spelled out one by one, so a failure names the exact line.
    const e = STARTING_DATA_EXPECTED
    expect(stats.copiesOwned).toBe(226)
    expect([stats.forSale, stats.gregs, stats.kaitlyns]).toEqual([146, 55, 25])
    expect([stats.forSaleByVariant.Hero, stats.forSaleByVariant.Chase, stats.forSaleSealed]).toEqual([109, 35, 2])
    expect(stats.byStorage).toEqual(e.bags)
    expect(stats.flawed).toBe(5)
    expect(stats.boxedWithoutSleeve).toBe(5)
    expect(stats.loose).toBe(2)
    expect([stats.figures, stats.releases]).toEqual([110, 89])
    expect(stats.liveListings).toBe(26)
    expect(stats.liveListingsByPlatform).toEqual({ eBay: 14, Vinted: 12 })
    expect(stats.listedUnits).toBe(44)
    expect(stats.forSaleNotListed).toBe(102)
    expect(stats.overListedFigureIds).toEqual([])
    expect(stats.sales).toBe(17)
    expect(stats.netCents).toBe(50151)
    expect(formatCents(stats.netCents)).toBe('$501.51')
  })

  it('imports every cost and every "in a protector" as unknown, never as zero or no', async () => {
    const data = await load()
    expect(data.copies.every((c) => c.cost_cents === null)).toBe(true)
    expect(data.copies.every((c) => c.in_protector === null)).toBe(true)
  })

  it('keeps the two sealed blind boxes attached to a release only', async () => {
    const data = await load()
    const sealed = data.copies.filter((c) => c.figure_code === null)
    expect(sealed.map((c) => [c.code, c.release_code, c.storage])).toEqual([
      ['C-0016', 'R-051', 'Bag 01'],
      ['C-0065', 'R-014', 'Bag 03'],
    ])
  })

  it('records Kara Thrace (Chase) with no owned copies, only its sold one', async () => {
    const data = await load()
    const kara = data.figures.find((f) => f.name === 'Kara Thrace' && f.variant === 'Chase')!
    expect(kara).toBeDefined()
    const copies = data.copies.filter((c) => c.figure_code === kara.code)
    expect(copies.map((c) => c.status)).toEqual(['sold'])
  })

  it('attaches the "Box Wear" Flash Chase listing to the flawed Bag 05 copy, as Greg confirmed', async () => {
    const data = await load()
    const listing = data.listings.find((l) => l.external_id === '287751723503')!
    expect(data.listing_copies).toEqual([{ listing_code: listing.code, copy_code: 'C-0123' }])
    const copy = data.copies.find((c) => c.code === 'C-0123')!
    expect(copy.flaw).toBe(true)
    expect(copy.storage).toBe('Bag 05')
  })

  it('applies a set listing quantity to each of its two figures', async () => {
    const data = await load()
    const sets = data.listings.filter((l) => data.listing_figures.filter((lf) => lf.listing_code === l.code).length === 2)
    expect(sets).toHaveLength(7)
    expect(sets.every((l) => l.quantity === 1)).toBe(true)
  })

  it('flags every Vinted listing and sale for the one-time review, and no eBay ones', async () => {
    const data = await load()
    expect(data.listings.filter((l) => l.needs_review).map((l) => l.platform)).toEqual(Array(12).fill('Vinted'))
    expect(data.sales.filter((s) => s.needs_review).map((s) => s.platform)).toEqual(Array(4).fill('Vinted'))
  })

  it('keeps undated Vinted sales undated and reads eBay dates without slipping a day', async () => {
    const data = await load()
    expect(data.sales.filter((s) => s.platform === 'Vinted').every((s) => s.sold_on === null)).toBe(true)
    expect(data.sales.find((s) => s.code === 'S-001')!.sold_on).toBe('2026-11-09')
    expect(data.listings.find((l) => l.code === 'L-001')!.listed_on).toBe('2026-11-08')
    expect(data.listings.filter((l) => l.platform === 'Vinted').every((l) => l.listed_on === null)).toBe(true)
  })

  it('stores amounts as exact cents and eBay item numbers as text', async () => {
    const data = await load()
    const s3 = data.sales.find((s) => s.code === 'S-003')!
    expect([s3.sale_price_cents, s3.shipping_charged_cents, s3.platform_fee_cents, s3.label_cost_cents]).toEqual([3398, 1015, 669, 1015])
    expect(s3.external_id).toBe('287725334460')
    const l9 = data.listings.find((l) => l.code === 'L-009')!
    expect([l9.price_cents, l9.floor_cents]).toEqual([6299, 5000])
    // Vinted charges the seller no fee: recorded as a real zero. Shipping was not recorded: unknown.
    const v = data.sales.find((s) => s.code === 'S-014')!
    expect([v.platform_fee_cents, v.shipping_charged_cents, v.label_cost_cents]).toEqual([0, null, null])
  })

  it('lists storage locations and platforms in a sensible order', async () => {
    const data = await load()
    expect(data.storage_locations.map((s) => s.name)).toEqual(['Bag 01', 'Bag 02', 'Bag 03', 'Bag 04', 'Bag 05', 'Bag 06'])
    expect(data.platforms.map((p) => p.name)).toEqual(['eBay', 'Vinted'])
    expect(data.brands).toEqual([{ name: 'Thrilljoy PIX!' }])
  })
})
