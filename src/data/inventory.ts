import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImportData } from '../lib/import/model'
import type { Snapshot } from '../lib/inventory/stats'

/**
 * Reading from and writing to the database. Screens never talk to Supabase directly;
 * they go through this file, so there is one place to look when something about the
 * data needs to change.
 */

const PAGE = 1000

/** Reads every row of a table, a page at a time (the database hands back at most 1,000 rows per request). */
async function fetchAll<T>(client: SupabaseClient, table: string, columns: string, orderBy: string[]): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    // A fixed, unique order is what makes reading page by page safe (no row skipped or repeated).
    let query = client.from(table).select(columns)
    for (const column of orderBy) query = query.order(column, { ascending: true })
    const { data, error } = await query.range(from, from + PAGE - 1)
    if (error) throw new DataError(friendlyDataError(error), error)
    const page = (data ?? []) as unknown as T[]
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

type CopyRow = {
  id: string
  figure_id: string | null
  bucket: 'for_sale' | 'greg' | 'kaitlyn'
  storage_location_id: string | null
  boxed: boolean | null
  has_sleeve: boolean | null
  flaw: boolean
  status: 'incoming' | 'in_hand' | 'sold' | 'shipped'
}
type ListingRow = { id: string; platform_id: string; status: 'draft' | 'live' | 'ended' | 'sold'; quantity: number }
type SaleRow = {
  id: string
  status: 'to_ship' | 'shipped' | 'complete' | 'refunded'
  sale_price_cents: number
  shipping_charged_cents: number | null
  platform_fee_cents: number | null
  label_cost_cents: number | null
  other_cost_cents: number | null
}

/** Loads what the at-a-glance numbers need, straight from the database. */
export async function fetchSnapshot(client: SupabaseClient): Promise<Snapshot> {
  const [releases, figures, copies, locations, platforms, listings, listingFigures, listingCopies, sales] = await Promise.all([
    fetchAll<{ id: string }>(client, 'releases', 'id', ['id']),
    fetchAll<{ id: string; variant: string }>(client, 'figures', 'id, variant', ['id']),
    fetchAll<CopyRow>(client, 'copies', 'id, figure_id, bucket, storage_location_id, boxed, has_sleeve, flaw, status', ['id']),
    fetchAll<{ id: string; name: string }>(client, 'storage_locations', 'id, name', ['id']),
    fetchAll<{ id: string; name: string }>(client, 'platforms', 'id, name', ['id']),
    fetchAll<ListingRow>(client, 'listings', 'id, platform_id, status, quantity', ['id']),
    fetchAll<{ listing_id: string; figure_id: string; position: number }>(
      client,
      'listing_figures',
      'listing_id, figure_id, position',
      ['listing_id', 'figure_id'],
    ),
    fetchAll<{ listing_id: string; copy_id: string }>(client, 'listing_copies', 'listing_id, copy_id', ['listing_id', 'copy_id']),
    fetchAll<SaleRow>(
      client,
      'sales',
      'id, status, sale_price_cents, shipping_charged_cents, platform_fee_cents, label_cost_cents, other_cost_cents',
      ['id'],
    ),
  ])

  const locationName = new Map(locations.map((l) => [l.id, l.name]))
  const platformName = new Map(platforms.map((p) => [p.id, p.name]))
  const figuresOf = groupBy(
    [...listingFigures].sort((a, b) => a.position - b.position),
    (row) => row.listing_id,
    (row) => row.figure_id,
  )
  const copiesOf = groupBy(
    listingCopies,
    (row) => row.listing_id,
    (row) => row.copy_id,
  )

  return {
    releases,
    figures,
    copies: copies.map((c) => ({
      id: c.id,
      figureId: c.figure_id,
      bucket: c.bucket,
      storage: c.storage_location_id === null ? null : (locationName.get(c.storage_location_id) ?? null),
      boxed: c.boxed,
      hasSleeve: c.has_sleeve,
      flaw: c.flaw,
      status: c.status,
    })),
    listings: listings.map((l) => ({
      id: l.id,
      platform: platformName.get(l.platform_id) ?? 'Unknown',
      status: l.status,
      quantity: l.quantity,
      figureIds: figuresOf.get(l.id) ?? [],
      copyIds: copiesOf.get(l.id) ?? [],
    })),
    sales: sales.map((s) => ({
      id: s.id,
      status: s.status,
      salePrice: s.sale_price_cents,
      shippingCharged: s.shipping_charged_cents,
      platformFee: s.platform_fee_cents,
      labelCost: s.label_cost_cents,
      otherCost: s.other_cost_cents,
    })),
  }
}

export type ImportCounts = Record<string, number>

/**
 * Saves a whole spreadsheet import in one all-or-nothing step (the database function
 * `import_batch`). If anything is wrong, nothing is saved.
 */
export async function saveImport(client: SupabaseClient, data: ImportData): Promise<ImportCounts> {
  const { data: counts, error } = await client.rpc('import_batch', { payload: data })
  if (error) throw new DataError(friendlyDataError(error), error)
  return (counts ?? {}) as ImportCounts
}

/** An error with a message that is safe and useful to show on screen. */
export class DataError extends Error {
  readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'DataError'
    this.cause = cause
  }
}

/** Turns a database error into plain language. Kept as a plain function so it can be tested. */
export function friendlyDataError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  const lower = message.toLowerCase()
  if (code === '23505' || lower.includes('duplicate key')) {
    return 'Some of these records are already in your database (the same IDs). Nothing was changed.'
  }
  if (code === 'PGRST202' || code === '42883' || code === 'PGRST205' || code === '42P01') {
    return 'The database has not been set up for this yet. Nothing was changed. Tell Claude: “the database tables are missing”.'
  }
  if (code === '42501' || lower.includes('permission denied') || lower.includes('row-level security')) {
    return 'The database refused this. Nothing was changed. Try signing out and in again; if it keeps happening, tell Claude.'
  }
  if (code === 'P0001' && message) {
    // Raised on purpose by our own database function, already in plain words.
    return `${message} Nothing was changed.`
  }
  if (lower.includes('failed to fetch') || lower.includes('load failed') || lower.includes('network')) {
    return 'Can’t reach the database. Check your internet connection and try again.'
  }
  if (lower.includes('jwt') || code === 'PGRST301' || code === 'PGRST303') {
    return 'Your sign-in has expired. Sign out, sign in again, then retry.'
  }
  return 'Something went wrong talking to the database. Nothing was changed. Please try again.'
}

function groupBy<T, V>(rows: T[], keyOf: (row: T) => string, valueOf: (row: T) => V): Map<string, V[]> {
  const map = new Map<string, V[]>()
  for (const row of rows) {
    const key = keyOf(row)
    const list = map.get(key) ?? []
    list.push(valueOf(row))
    map.set(key, list)
  }
  return map
}
