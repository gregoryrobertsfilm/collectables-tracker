import { formatCents } from '../money'
import type { Snapshot, Stats } from '../inventory/stats'
import type { ImportData } from './model'

/**
 * The "prove it worked" table from the brief (section 10): each number the app must show
 * after loading Greg's starting spreadsheet, next to what the app actually counts.
 */

export type CheckRow = { label: string; expected: string; actual: string; ok: boolean }

/** A spreadsheet import as a snapshot, using the spreadsheet codes as ids. */
export function snapshotFromImport(data: ImportData): Snapshot {
  const figuresByListing = new Map<string, string[]>()
  for (const row of [...data.listing_figures].sort((a, b) => a.position - b.position)) {
    const list = figuresByListing.get(row.listing_code) ?? []
    list.push(row.figure_code)
    figuresByListing.set(row.listing_code, list)
  }
  const copiesByListing = new Map<string, string[]>()
  for (const row of data.listing_copies) {
    const list = copiesByListing.get(row.listing_code) ?? []
    list.push(row.copy_code)
    copiesByListing.set(row.listing_code, list)
  }
  return {
    releases: data.releases.map((r) => ({ id: r.code })),
    figures: data.figures.map((f) => ({ id: f.code, variant: f.variant })),
    copies: data.copies.map((c) => ({
      id: c.code,
      figureId: c.figure_code,
      bucket: c.bucket,
      storage: c.storage,
      boxed: c.boxed,
      hasSleeve: c.has_sleeve,
      flaw: c.flaw,
      status: c.status,
    })),
    listings: data.listings.map((l) => ({
      id: l.code,
      platform: l.platform,
      status: l.status,
      quantity: l.quantity,
      figureIds: figuresByListing.get(l.code) ?? [],
      copyIds: copiesByListing.get(l.code) ?? [],
    })),
    sales: data.sales.map((s) => ({
      id: s.code,
      status: s.status,
      salePrice: s.sale_price_cents,
      shippingCharged: s.shipping_charged_cents,
      platformFee: s.platform_fee_cents,
      labelCost: s.label_cost_cents,
      otherCost: s.other_cost_cents,
    })),
  }
}

/** The numbers Greg's starting spreadsheet must produce (brief, section 10). */
export const STARTING_DATA_EXPECTED = {
  copiesOwned: 226,
  forSale: 146,
  gregs: 55,
  kaitlyns: 25,
  forSaleHero: 109,
  forSaleChase: 35,
  forSaleSealed: 2,
  bags: { 'Bag 01': 26, 'Bag 02': 26, 'Bag 03': 26, 'Bag 04': 26, 'Bag 05': 26, 'Bag 06': 16 } as Record<string, number>,
  flawed: 5,
  boxedWithoutSleeve: 5,
  loose: 2,
  figures: 110,
  releases: 89,
  liveListings: 26,
  liveEbay: 14,
  liveVinted: 12,
  listedUnits: 44,
  forSaleNotListed: 102,
  sales: 17,
  netCents: 50151,
} as const

/** Builds the section 10 table: expected value, the app's value, and whether they match. */
export function startingDataChecks(stats: Stats): CheckRow[] {
  const e = STARTING_DATA_EXPECTED
  const row = (label: string, expected: string | number, actual: string | number): CheckRow => ({
    label,
    expected: String(expected),
    actual: String(actual),
    ok: String(expected) === String(actual),
  })
  const bagNames = Object.keys(e.bags)
  const firstFive = bagNames.slice(0, 5)
  return [
    row('Copies in total', e.copiesOwned, stats.copiesOwned),
    row(
      'For sale / Greg’s collection / Kaitlyn’s collection',
      `${e.forSale} / ${e.gregs} / ${e.kaitlyns}`,
      `${stats.forSale} / ${stats.gregs} / ${stats.kaitlyns}`,
    ),
    row(
      'For sale by variant: Hero / Chase / sealed',
      `${e.forSaleHero} / ${e.forSaleChase} / ${e.forSaleSealed}`,
      `${stats.forSaleByVariant.Hero ?? 0} / ${stats.forSaleByVariant.Chase ?? 0} / ${stats.forSaleSealed}`,
    ),
    row(
      'Bag 01 to Bag 05, each',
      firstFive.map((name) => e.bags[name]).join(' / '),
      firstFive.map((name) => stats.byStorage[name] ?? 0).join(' / '),
    ),
    row('Bag 06', e.bags['Bag 06'], stats.byStorage['Bag 06'] ?? 0),
    row('Copies with a flaw', e.flawed, stats.flawed),
    row('Boxed copies without a sleeve', e.boxedWithoutSleeve, stats.boxedWithoutSleeve),
    row('Loose figures with no box', e.loose, stats.loose),
    row('Figures / releases', `${e.figures} / ${e.releases}`, `${stats.figures} / ${stats.releases}`),
    row(
      'Live listings (eBay / Vinted)',
      `${e.liveListings} (${e.liveEbay} / ${e.liveVinted})`,
      `${stats.liveListings} (${stats.liveListingsByPlatform.eBay ?? 0} / ${stats.liveListingsByPlatform.Vinted ?? 0})`,
    ),
    row('Units on a live listing (a set counts as two)', e.listedUnits, stats.listedUnits),
    row('For-sale copies not on any listing', e.forSaleNotListed, stats.forSaleNotListed),
    row('Sales', e.sales, stats.sales),
    row('Net earnings from those sales', formatCents(e.netCents), formatCents(stats.netCents)),
  ]
}
