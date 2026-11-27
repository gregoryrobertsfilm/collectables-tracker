/**
 * The shape of a spreadsheet import after it has been read and checked, ready to be saved.
 *
 * Records point at each other by their spreadsheet codes (R-001, F-001, C-0001 ...), not by
 * database ids. The database function `import_batch` turns codes into ids as it saves.
 * Field names match the database columns so the whole object can be sent as it is.
 */

export type Bucket = 'for_sale' | 'greg' | 'kaitlyn'
export type CopyStatus = 'incoming' | 'in_hand' | 'sold' | 'shipped'
export type ListingStatus = 'draft' | 'live' | 'ended' | 'sold'
export type SaleStatus = 'to_ship' | 'shipped' | 'complete' | 'refunded'

export type ImportRelease = {
  brand: string
  code: string
  name: string
  license: string | null
  edition_size: number | null
  exclusive: string | null
  barcode: string | null
  box_number: string | null
  url: string | null
  notes: string | null
}

export type ImportFigure = {
  code: string
  release_code: string
  name: string
  variant: string
  how_to_tell: string | null
  other_names: string | null
}

export type ImportCopy = {
  code: string
  release_code: string
  /** null = sealed blind box, variant not known yet. */
  figure_code: string | null
  bucket: Bucket
  storage: string | null
  /** true = in box, false = loose, null = not recorded. */
  boxed: boolean | null
  has_sleeve: boolean | null
  has_coa: boolean | null
  in_protector: boolean | null
  flaw: boolean
  condition_note: string | null
  /** Whole cents. null = unknown, never zero. */
  cost_cents: number | null
  status: CopyStatus
  source_note: string | null
}

export type ImportListing = {
  code: string
  platform: string
  status: ListingStatus
  title: string | null
  price_cents: number | null
  floor_cents: number | null
  quantity: number
  external_id: string | null
  url: string | null
  /** YYYY-MM-DD, or null when not recorded. */
  listed_on: string | null
  note: string | null
  source_note: string | null
  needs_review: boolean
}

export type ImportListingFigure = { listing_code: string; figure_code: string; position: number }
export type ImportListingCopy = { listing_code: string; copy_code: string }

export type ImportSale = {
  code: string
  platform: string
  sold_on: string | null
  sale_price_cents: number
  shipping_charged_cents: number | null
  platform_fee_cents: number | null
  label_cost_cents: number | null
  other_cost_cents: number | null
  buyer: string | null
  order_number: string | null
  external_id: string | null
  status: SaleStatus
  note: string | null
  needs_review: boolean
}

export type ImportSaleCopy = { sale_code: string; copy_code: string }

export type ImportData = {
  file_name: string | null
  brands: Array<{ name: string }>
  storage_locations: Array<{ name: string; sort_order: number }>
  platforms: Array<{ name: string; sort_order: number }>
  releases: ImportRelease[]
  figures: ImportFigure[]
  copies: ImportCopy[]
  listings: ImportListing[]
  listing_figures: ImportListingFigure[]
  listing_copies: ImportListingCopy[]
  sales: ImportSale[]
  sale_copies: ImportSaleCopy[]
}

/** One cell as the spreadsheet reader hands it over. */
export type Cell = string | number | boolean | Date | null | undefined

/** One tab: rows of cells, with the column headings in the first row. */
export type SheetRows = Cell[][]

/** A problem found while reading the spreadsheet, in plain words, saying where it is. */
export type ImportProblem = { tab: string; row: number | null; message: string }

export type ParseResult =
  | { ok: true; data: ImportData; notes: string[] }
  | { ok: false; problems: ImportProblem[] }
