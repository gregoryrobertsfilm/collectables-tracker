import { describe, expect, it } from 'vitest'
import type { Cell, SheetRows } from './model'
import { parseWorkbook } from './parse'

/** A tiny, valid workbook in the same layout as Greg's file. Tests change one thing at a time. */
function workbook(): Record<string, SheetRows> {
  return {
    Releases: [
      ['Release ID', 'Official Thrilljoy release name', 'License', 'Edition size', 'Exclusive or sticker', 'Thrilljoy page', 'Notes and things to confirm'],
      ['R-1', 'PIX! Alpha', 'Show A', 5000, 'Hot Topic Exclusive', 'https://example.test/alpha', null],
      ['R-2', 'PIX! Beta', 'Show B', null, null, null, 'note'],
    ],
    Figures: [
      ['Figure ID', 'Figure name', 'Variant', 'Display label', 'Release ID', 'How to tell it apart', 'Other names used', 'Total copies (calculated)'],
      ['F-1', 'Alpha', 'Hero', 'Alpha (Hero)', 'R-1', 'Blue hat', 'Al', 999],
      ['F-2', 'Alpha Gold', 'Chase', 'Alpha Gold (Chase)', 'R-1', 'Gold hat', null, 999],
      ['F-3', 'Beta', 'Hero', 'Beta (Hero)', 'R-2', null, null, 999],
    ],
    Copies: [
      ['Copy ID', 'Figure ID', 'Figure', 'Variant', 'Release ID', 'Owner', 'Storage location', 'Box', 'Has sleeve', 'Flaw noted', 'Condition note', 'Cost paid (blank = unknown)', 'In a protector (blank = unknown)', 'Where this row came from'],
      ['C-1', 'F-1', 'Alpha (Hero)', 'Hero', 'R-1', 'For sale', 'Bag 02', 'In box', 'Yes', 'No', null, null, null, 'Selling inventory'],
      ['C-2', 'F-1', 'Alpha (Hero)', 'Hero', 'R-1', 'For sale', 'Bag 10', 'In box', 'No', 'Yes', 'Torn', 12.5, 'Yes', 'Selling inventory'],
      ['C-3', 'F-2', 'Alpha Gold (Chase)', 'Chase', 'R-1', "Greg's collection", null, 'No box (loose figure)', 'No', 'No', null, null, null, 'Greg'],
      ['C-4', null, null, 'Unknown (sealed blind box)', 'R-2', 'For sale', 'Bag 02', 'In box', 'Yes', 'No', null, null, null, 'Selling inventory'],
      ['C-5', 'F-3', 'Beta (Hero)', 'Hero', 'R-2', 'Kaitlyn’s collection', null, 'In box', 'Yes', 'No', null, 0, 'No', 'Kaitlyn'],
    ],
    Listings: [
      ['Listing ID', 'Platform', 'Status', 'Listing title', 'Figure ID 1', 'Figure 1', 'Figure ID 2 (sets only)', 'Figure 2 (sets only)', 'Quantity listed (of each figure)', 'Listing type', 'List price', 'Auto-decline offers below (blank = not recorded)', 'Date listed (blank = not recorded)', 'eBay item ID', 'Source and date', 'Note'],
      ['L-1', 'eBay', 'Live', 'Alpha', 'F-1', 'Alpha (Hero)', null, null, 2, 'Multi-quantity', 9.99, 8, new Date(Date.UTC(2026, 10, 8)), '111', 'Checked on eBay', null],
      ['L-2', 'Vinted', 'Live', 'Alpha set', 'F-1', 'Alpha (Hero)', 'F-2', 'Alpha Gold (Chase)', 1, 'Hero + Chase set', 30, null, null, null, 'Vinted screenshot', null],
    ],
    Sales: [
      ['Sale ID', 'Platform', 'Date sold (blank = not recorded)', 'Figure ID', 'Figure', 'Quantity', 'Sale price', 'Shipping paid by buyer', 'Selling fees', 'Shipping label cost', 'Net earnings (calculated)', 'Buyer', 'Order number', 'eBay item ID', 'Note'],
      ['S-1', 'eBay', new Date(Date.UTC(2026, 10, 12)), 'F-3', 'Beta (Hero)', 2, 33.98, 10.15, 6.69, 10.15, 27.29, 'buyer1', '20-1', '222', null],
      ['S-2', 'Vinted', null, 'F-2', 'Alpha Gold (Chase)', 1, 45, null, 0, null, 45, null, null, null, 'price only'],
    ],
  }
}

function parsed(change?: (wb: Record<string, SheetRows>) => void) {
  const wb = workbook()
  change?.(wb)
  return parseWorkbook(wb, { fileName: 'test.xlsx' })
}

function okData(change?: (wb: Record<string, SheetRows>) => void) {
  const result = parsed(change)
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join('; '))
  return result.data
}

function problemsOf(change: (wb: Record<string, SheetRows>) => void): string[] {
  const result = parsed(change)
  return result.ok ? [] : result.problems.map((p) => `${p.tab} row ${p.row}: ${p.message}`)
}

/** Sets one cell by tab, data row number (1 = first row under the headings) and column heading. */
function set(wb: Record<string, SheetRows>, tab: string, dataRow: number, heading: string, value: Cell) {
  const index = wb[tab][0].findIndex((h) => typeof h === 'string' && h.startsWith(heading))
  if (index < 0) throw new Error(`no column ${heading}`)
  wb[tab][dataRow][index] = value
}

describe('parseWorkbook: a valid spreadsheet', () => {
  it('reads every tab', () => {
    const data = okData()
    expect(data.releases.map((r) => r.code)).toEqual(['R-1', 'R-2'])
    expect(data.figures.map((f) => [f.code, f.release_code, f.variant])).toEqual([
      ['F-1', 'R-1', 'Hero'],
      ['F-2', 'R-1', 'Chase'],
      ['F-3', 'R-2', 'Hero'],
    ])
    expect(data.file_name).toBe('test.xlsx')
    expect(data.brands).toEqual([{ name: 'Thrilljoy PIX!' }])
  })

  it('never reads a "(calculated)" column, even when its name matches', () => {
    // "Total copies (calculated)" and "Net earnings (calculated)" hold junk values above.
    const data = okData((wb) => {
      wb.Figures[0].push('Variant (calculated)')
      wb.Figures[1].push('Rare Chase')
    })
    expect(data.figures[0].variant).toBe('Hero')
  })

  it('maps owners, box, yes/no and blanks', () => {
    const [c1, c2, c3, c4, c5] = okData().copies
    expect([c1.bucket, c3.bucket, c5.bucket]).toEqual(['for_sale', 'greg', 'kaitlyn'])
    expect([c1.boxed, c3.boxed]).toEqual([true, false])
    expect([c1.has_sleeve, c2.has_sleeve]).toEqual([true, false])
    expect([c1.flaw, c2.flaw]).toEqual([false, true])
    expect(c2.condition_note).toBe('Torn')
    expect([c1.in_protector, c2.in_protector, c5.in_protector]).toEqual([null, true, false])
    expect(c1.has_coa).toBeNull()
    expect(c4.figure_code).toBeNull()
    expect(c4.release_code).toBe('R-2')
    expect(c1.status).toBe('in_hand')
  })

  it('keeps a blank cost unknown and a typed zero as a real zero', () => {
    const [c1, c2, , , c5] = okData().copies
    expect(c1.cost_cents).toBeNull()
    expect(c2.cost_cents).toBe(1250)
    expect(c5.cost_cents).toBe(0)
  })

  it('reads listings, including a two-figure set', () => {
    const data = okData()
    expect(data.listings.map((l) => [l.code, l.platform, l.status, l.quantity, l.price_cents, l.floor_cents, l.listed_on, l.external_id])).toEqual([
      ['L-1', 'eBay', 'live', 2, 999, 800, '2026-11-08', '111'],
      ['L-2', 'Vinted', 'live', 1, 3000, null, null, null],
    ])
    expect(data.listing_figures).toEqual([
      { listing_code: 'L-1', figure_code: 'F-1', position: 1 },
      { listing_code: 'L-2', figure_code: 'F-1', position: 1 },
      { listing_code: 'L-2', figure_code: 'F-2', position: 2 },
    ])
    expect(data.listings.map((l) => l.needs_review)).toEqual([false, true])
  })

  it('turns each sold unit into a sold copy with cost unknown', () => {
    const data = okData()
    const sold = data.copies.filter((c) => c.status === 'sold')
    expect(sold.map((c) => [c.code, c.figure_code, c.release_code, c.cost_cents, c.bucket])).toEqual([
      ['SOLD-S-1-1', 'F-3', 'R-2', null, 'for_sale'],
      ['SOLD-S-1-2', 'F-3', 'R-2', null, 'for_sale'],
      ['SOLD-S-2-1', 'F-2', 'R-1', null, 'for_sale'],
    ])
    expect(data.sale_copies).toEqual([
      { sale_code: 'S-1', copy_code: 'SOLD-S-1-1' },
      { sale_code: 'S-1', copy_code: 'SOLD-S-1-2' },
      { sale_code: 'S-2', copy_code: 'SOLD-S-2-1' },
    ])
    expect(data.sales.map((s) => [s.code, s.sold_on, s.sale_price_cents, s.shipping_charged_cents, s.platform_fee_cents, s.label_cost_cents, s.status])).toEqual([
      ['S-1', '2026-11-12', 3398, 1015, 669, 1015, 'complete'],
      ['S-2', null, 4500, null, 0, null, 'complete'],
    ])
  })

  it('orders storage locations naturally (Bag 02 before Bag 10) and eBay before Vinted', () => {
    const data = okData()
    expect(data.storage_locations).toEqual([
      { name: 'Bag 02', sort_order: 1 },
      { name: 'Bag 10', sort_order: 2 },
    ])
    expect(data.platforms).toEqual([
      { name: 'eBay', sort_order: 1 },
      { name: 'Vinted', sort_order: 2 },
    ])
  })

  it('works without Listings and Sales tabs (a plain inventory file)', () => {
    const data = okData((wb) => {
      delete wb.Listings
      delete wb.Sales
    })
    expect(data.listings).toEqual([])
    expect(data.sales).toEqual([])
    expect(data.copies).toHaveLength(5)
  })

  it('skips completely blank rows', () => {
    const data = okData((wb) => {
      wb.Copies.splice(2, 0, [null, null, '  ', null])
    })
    expect(data.copies.filter((c) => c.status === 'in_hand')).toHaveLength(5)
  })
})

describe('parseWorkbook: problems are reported and nothing is returned', () => {
  it('a missing tab or column', () => {
    expect(problemsOf((wb) => delete wb.Copies)).toEqual(['Copies row null: The spreadsheet has no "Copies" tab.'])
    expect(problemsOf((wb) => (wb.Copies[0][5] = 'Whose')).join(' ')).toMatch(/no "Owner" column/)
  })

  it('duplicate IDs', () => {
    expect(problemsOf((wb) => set(wb, 'Copies', 2, 'Copy ID', 'C-1')).join(' ')).toMatch(/Copy ID C-1 appears more than once/)
    expect(problemsOf((wb) => set(wb, 'Releases', 2, 'Release ID', 'R-1')).join(' ')).toMatch(/Release ID R-1 appears more than once/)
    expect(problemsOf((wb) => set(wb, 'Figures', 2, 'Figure ID', 'F-1')).join(' ')).toMatch(/Figure ID F-1 appears more than once/)
  })

  it('a link that points nowhere', () => {
    expect(problemsOf((wb) => set(wb, 'Figures', 1, 'Release ID', 'R-9')).join(' ')).toMatch(/release "R-9"/)
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Figure ID', 'F-9')).join(' ')).toMatch(/figure "F-9"/)
    expect(problemsOf((wb) => set(wb, 'Listings', 1, 'Figure ID 1', 'F-9')).join(' ')).toMatch(/figure "F-9"/)
    expect(problemsOf((wb) => set(wb, 'Sales', 1, 'Figure ID', 'F-9')).join(' ')).toMatch(/figure "F-9"/)
  })

  it('a copy whose release or variant disagrees with its figure', () => {
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Release ID', 'R-2')).join(' ')).toMatch(/belongs to R-1/)
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Variant', 'Chase')).join(' ')).toMatch(/is a Hero/)
  })

  it('a copy with no figure that is not a sealed blind box, and a sealed one that names a figure', () => {
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Figure ID', null)).join(' ')).toMatch(/Only sealed blind boxes/)
    expect(problemsOf((wb) => set(wb, 'Copies', 4, 'Figure ID', 'F-3')).join(' ')).toMatch(/sealed blind box but also names a figure/)
  })

  it('an unknown owner, box or yes/no value', () => {
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Owner', 'Mine')).join(' ')).toMatch(/owner "Mine"/)
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Box', 'Maybe')).join(' ')).toMatch(/Box "Maybe"/)
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Has sleeve', 'Sort of')).join(' ')).toMatch(/Yes, No or blank/)
  })

  it('amounts that are not amounts', () => {
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Cost paid', 'ten')).join(' ')).toMatch(/Cost paid is not an amount/)
    expect(problemsOf((wb) => set(wb, 'Copies', 1, 'Cost paid', -5)).join(' ')).toMatch(/cannot be negative/)
    expect(problemsOf((wb) => set(wb, 'Listings', 1, 'List price', '9.999')).join(' ')).toMatch(/not an amount/)
    expect(problemsOf((wb) => set(wb, 'Sales', 1, 'Sale price', null)).join(' ')).toMatch(/no sale price/)
  })

  it('bad listing details', () => {
    expect(problemsOf((wb) => set(wb, 'Listings', 1, 'Status', 'Paused')).join(' ')).toMatch(/status "Paused"/)
    expect(problemsOf((wb) => set(wb, 'Listings', 1, 'Quantity listed', 0)).join(' ')).toMatch(/quantity of 1 or more/)
    expect(problemsOf((wb) => set(wb, 'Listings', 1, 'Quantity listed', 1.5)).join(' ')).toMatch(/whole number/)
    expect(problemsOf((wb) => set(wb, 'Listings', 1, 'Listing type', 'Hero + Chase set')).join(' ')).toMatch(/does not match the number of figures/)
    expect(problemsOf((wb) => set(wb, 'Listings', 2, 'Figure ID 2', 'F-1')).join(' ')).toMatch(/same figure twice/)
    expect(problemsOf((wb) => set(wb, 'Listings', 1, 'Date listed', 'last week')).join(' ')).toMatch(/should be a date/)
  })

  it('reports every problem at once, with tab and row, so they can all be fixed in one go', () => {
    const problems = problemsOf((wb) => {
      set(wb, 'Copies', 1, 'Owner', 'Mine')
      set(wb, 'Copies', 2, 'Box', 'Maybe')
      set(wb, 'Sales', 2, 'Figure ID', 'F-9')
    })
    expect(problems).toHaveLength(3)
    expect(problems[0]).toMatch(/^Copies row 2:/)
    expect(problems[1]).toMatch(/^Copies row 3:/)
    expect(problems[2]).toMatch(/^Sales row 3:/)
  })
})
