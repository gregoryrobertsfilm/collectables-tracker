import { toCents } from '../money'
import type {
  Bucket,
  Cell,
  ImportCopy,
  ImportData,
  ImportFigure,
  ImportListing,
  ImportListingCopy,
  ImportListingFigure,
  ImportProblem,
  ImportRelease,
  ImportSale,
  ImportSaleCopy,
  ListingStatus,
  ParseResult,
  SheetRows,
} from './model'

/**
 * Turns the tabs of a spreadsheet (in the layout of Greg's starting data file) into
 * records ready to save. Pure: no files, no database, so it can be tested directly.
 *
 * Rules from the brief (section 10):
 *  - Columns whose heading ends in "(calculated)" are ignored. The app works those numbers out itself.
 *  - A blank cost means unknown. A blank "in a protector" means unknown.
 *  - A sealed blind box has no Figure ID; it belongs to a release only.
 *  - Listings point at figures, not at particular copies.
 *  - Sales are history: each sold unit becomes a "sold" copy with cost unknown.
 *
 * Every problem is collected and reported with its tab and row. If there is any problem,
 * nothing is returned for saving.
 */

export const DEFAULT_BRAND = 'Thrilljoy PIX!'

/**
 * Decisions Greg has confirmed about which physical copy is on a particular listing.
 * The spreadsheet has no column for this, so they are recorded here.
 */
export const CONFIRMED_LISTING_COPIES: Array<{ external_id: string; copy_code: string; why: string }> = [
  {
    external_id: '287751723503',
    copy_code: 'C-0123',
    why: 'eBay title says "Box Wear". Greg confirmed on 2026-11-26 it is the Bag 05 Flash Chase with the slight tear.',
  },
]

const OWNER_TO_BUCKET: Record<string, Bucket> = {
  'for sale': 'for_sale',
  "greg's collection": 'greg',
  "kaitlyn's collection": 'kaitlyn',
}

const LISTING_STATUS: Record<string, ListingStatus> = { live: 'live', draft: 'draft', ended: 'ended', sold: 'sold' }

type Options = { fileName?: string | null; brand?: string }

export function parseWorkbook(sheets: Record<string, SheetRows>, options: Options = {}): ParseResult {
  const problems: ImportProblem[] = []
  const notes: string[] = []
  const brand = options.brand ?? DEFAULT_BRAND

  const releasesTab = openTab(sheets, 'Releases', problems, true)
  const figuresTab = openTab(sheets, 'Figures', problems, true)
  const copiesTab = openTab(sheets, 'Copies', problems, true)
  const listingsTab = openTab(sheets, 'Listings', problems, false)
  const salesTab = openTab(sheets, 'Sales', problems, false)
  if (!releasesTab || !figuresTab || !copiesTab) return { ok: false, problems }

  // A tab with a near-miss name would otherwise be skipped without a word.
  const knownTabs = ['releases', 'figures', 'copies', 'listings', 'sales', 'read me']
  for (const tabName of Object.keys(sheets)) {
    const lower = tabName.trim().toLowerCase()
    if (knownTabs.includes(lower)) continue
    if (/listing|sale/.test(lower)) {
      problems.push({
        tab: tabName,
        row: null,
        message: `The tab "${tabName}" looks like listings or sales but is not named exactly "Listings" or "Sales". Rename it, or delete it if it is not needed.`,
      })
    } else {
      notes.push(`The tab "${tabName}" was not recognised and was ignored.`)
    }
  }
  if (!listingsTab) notes.push('No "Listings" tab was found: no listings will be imported.')
  if (!salesTab) notes.push('No "Sales" tab was found: no sales will be imported.')

  // ---- Releases -----------------------------------------------------------
  const releases: ImportRelease[] = []
  const releaseCodes = new Set<string>()
  {
    const t = releasesTab
    const c = {
      code: t.need('Release ID'),
      name: t.need('Official', 'Release name'),
      license: t.find('License'),
      edition: t.find('Edition size'),
      exclusive: t.find('Exclusive'),
      url: t.find('Thrilljoy page', 'Page', 'Link'),
      notes: t.find('Notes'),
      barcode: t.find('Barcode', 'UPC'),
      box: t.find('Box number'),
      brand: t.find('Brand'),
    }
    t.eachRow((row, n) => {
      const code = text(row[c.code])
      if (!code) return t.problem(n, 'Release ID is blank.')
      if (releaseCodes.has(code)) return t.problem(n, `Release ID ${code} appears more than once.`)
      const name = text(row[c.name])
      if (!name) return t.problem(n, `Release ${code} has no name.`)
      releaseCodes.add(code)
      const edition = wholeNumber(row[c.edition], (m) => t.problem(n, `Release ${code}: Edition size ${m}`))
      if (edition === 0) t.problem(n, `Release ${code}: Edition size must be 1 or more, or left blank if it is not known.`)
      releases.push({
        brand: (c.brand >= 0 ? text(row[c.brand]) : null) ?? brand,
        code,
        name,
        license: at(row, c.license),
        edition_size: edition,
        exclusive: at(row, c.exclusive),
        barcode: at(row, c.barcode),
        box_number: at(row, c.box),
        url: at(row, c.url),
        notes: at(row, c.notes),
      })
    })
  }

  // ---- Figures ------------------------------------------------------------
  const figures: ImportFigure[] = []
  const figureByCode = new Map<string, ImportFigure>()
  {
    const t = figuresTab
    const c = {
      code: t.need('Figure ID'),
      name: t.need('Figure name'),
      variant: t.need('Variant'),
      release: t.need('Release ID'),
      tell: t.find('How to tell'),
      other: t.find('Other names'),
    }
    t.eachRow((row, n) => {
      const code = text(row[c.code])
      if (!code) return t.problem(n, 'Figure ID is blank.')
      if (figureByCode.has(code)) return t.problem(n, `Figure ID ${code} appears more than once.`)
      const name = text(row[c.name])
      const variant = text(row[c.variant])
      const release = text(row[c.release])
      if (!name) return t.problem(n, `Figure ${code} has no name.`)
      if (!variant) return t.problem(n, `Figure ${code} has no variant.`)
      if (!release || !releaseCodes.has(release)) {
        return t.problem(n, `Figure ${code} points at release "${release ?? ''}", which is not on the Releases tab.`)
      }
      const figure: ImportFigure = {
        code,
        release_code: release,
        name,
        variant,
        how_to_tell: at(row, c.tell),
        other_names: at(row, c.other),
      }
      figureByCode.set(code, figure)
      figures.push(figure)
    })
  }

  // ---- Copies -------------------------------------------------------------
  const copies: ImportCopy[] = []
  const copyByCode = new Map<string, ImportCopy>()
  {
    const t = copiesTab
    const c = {
      code: t.need('Copy ID'),
      figure: t.need('Figure ID'),
      variant: t.find('Variant'),
      release: t.need('Release ID'),
      owner: t.need('Owner'),
      storage: t.find('Storage location'),
      box: t.find('Box'),
      sleeve: t.find('Has sleeve'),
      coa: t.find('Has certificate', 'Has COA', 'Certificate'),
      flaw: t.find('Flaw noted', 'Flaw'),
      note: t.find('Condition note'),
      cost: t.find('Cost paid'),
      protector: t.find('In a protector'),
      source: t.find('Where this row came from'),
    }
    t.eachRow((row, n) => {
      const code = text(row[c.code])
      if (!code) return t.problem(n, 'Copy ID is blank.')
      if (copyByCode.has(code)) return t.problem(n, `Copy ID ${code} appears more than once.`)
      const release = text(row[c.release])
      if (!release || !releaseCodes.has(release)) {
        return t.problem(n, `Copy ${code} points at release "${release ?? ''}", which is not on the Releases tab.`)
      }
      const figureCode = text(row[c.figure])
      const variant = at(row, c.variant)
      const sealed = variant !== null && variant.toLowerCase().startsWith('unknown')
      if (figureCode) {
        const figure = figureByCode.get(figureCode)
        if (!figure) return t.problem(n, `Copy ${code} points at figure "${figureCode}", which is not on the Figures tab.`)
        if (figure.release_code !== release) {
          return t.problem(n, `Copy ${code} says release ${release}, but its figure ${figureCode} belongs to ${figure.release_code}.`)
        }
        if (variant !== null && !sealed && variant.toLowerCase() !== figure.variant.toLowerCase()) {
          return t.problem(n, `Copy ${code} says variant "${variant}", but figure ${figureCode} is a ${figure.variant}.`)
        }
        if (sealed) return t.problem(n, `Copy ${code} is marked as a sealed blind box but also names a figure.`)
      } else if (!sealed) {
        return t.problem(n, `Copy ${code} has no Figure ID. Only sealed blind boxes (Variant "Unknown ...") may leave it blank.`)
      }
      const ownerText = text(row[c.owner])
      const bucket = ownerText ? OWNER_TO_BUCKET[ownerText.toLowerCase().replace(/’/g, "'")] : undefined
      if (!bucket) {
        return t.problem(n, `Copy ${code} has owner "${ownerText ?? ''}". Use For sale, Greg's collection or Kaitlyn's collection.`)
      }
      const boxText = at(row, c.box)
      let boxed: boolean | null = null
      if (boxText !== null) {
        const lower = boxText.toLowerCase()
        if (lower.startsWith('in box')) boxed = true
        else if (lower.startsWith('no box') || lower.startsWith('loose')) boxed = false
        else return t.problem(n, `Copy ${code} has Box "${boxText}". Use "In box" or "No box (loose figure)".`)
      }
      const fail = (label: string) => (m: string) => t.problem(n, `Copy ${code}: ${label} ${m}`)
      const flaw = yesNo(row[c.flaw], fail('Flaw noted'))
      let cost: number | null = null
      try {
        cost = c.cost >= 0 ? toCents(moneyCell(row[c.cost])) : null
      } catch (error) {
        return t.problem(n, `Copy ${code}: Cost paid is not an amount (${(error as Error).message}).`)
      }
      if (cost !== null && cost < 0) return t.problem(n, `Copy ${code}: Cost paid cannot be negative.`)
      const copy: ImportCopy = {
        code,
        release_code: release,
        figure_code: figureCode,
        bucket,
        storage: at(row, c.storage),
        boxed,
        has_sleeve: yesNo(row[c.sleeve], fail('Has sleeve')),
        has_coa: yesNo(row[c.coa], fail('Certificate')),
        in_protector: yesNo(row[c.protector], fail('In a protector')),
        flaw: flaw ?? false,
        condition_note: at(row, c.note),
        cost_cents: cost,
        status: 'in_hand',
        source_note: at(row, c.source),
      }
      copyByCode.set(code, copy)
      copies.push(copy)
    })
  }

  // ---- Listings -----------------------------------------------------------
  const listings: ImportListing[] = []
  const listingFigures: ImportListingFigure[] = []
  const listingCopies: ImportListingCopy[] = []
  if (listingsTab) {
    const t = listingsTab
    const c = {
      code: t.need('Listing ID'),
      platform: t.need('Platform'),
      status: t.need('Status'),
      title: t.find('Listing title', 'Title'),
      figure1: t.need('Figure ID 1'),
      figure2: t.find('Figure ID 2'),
      quantity: t.need('Quantity listed', 'Quantity'),
      type: t.find('Listing type'),
      price: t.find('List price', 'Price'),
      floor: t.find('Auto-decline'),
      listed: t.find('Date listed'),
      external: t.find('eBay item ID', 'Item ID', 'Listing number'),
      source: t.find('Source'),
      note: t.find('Note'),
    }
    const seen = new Set<string>()
    t.eachRow((row, n) => {
      const code = text(row[c.code])
      if (!code) return t.problem(n, 'Listing ID is blank.')
      if (seen.has(code)) return t.problem(n, `Listing ID ${code} appears more than once.`)
      const platform = text(row[c.platform])
      if (!platform) return t.problem(n, `Listing ${code} has no platform.`)
      const statusText = text(row[c.status])
      const status = statusText ? LISTING_STATUS[statusText.toLowerCase()] : undefined
      if (!status) return t.problem(n, `Listing ${code} has status "${statusText ?? ''}". Use Live, Draft, Ended or Sold.`)
      const figure1 = text(row[c.figure1])
      const figure2 = at(row, c.figure2)
      if (!figure1 || !figureByCode.has(figure1)) {
        return t.problem(n, `Listing ${code} points at figure "${figure1 ?? ''}", which is not on the Figures tab.`)
      }
      if (figure2 !== null && !figureByCode.has(figure2)) {
        return t.problem(n, `Listing ${code} points at second figure "${figure2}", which is not on the Figures tab.`)
      }
      if (figure2 !== null && figure2 === figure1) {
        return t.problem(n, `Listing ${code} names the same figure twice.`)
      }
      const quantity = wholeNumber(row[c.quantity], (m) => t.problem(n, `Listing ${code}: Quantity ${m}`))
      if (quantity === null || quantity < 1) return t.problem(n, `Listing ${code} needs a quantity of 1 or more.`)
      const type = at(row, c.type)
      if (type !== null) {
        const isSetType = type.toLowerCase().includes('set')
        if (isSetType !== (figure2 !== null)) {
          return t.problem(n, `Listing ${code} is typed "${type}", which does not match the number of figures on it.`)
        }
      }
      let price: number | null = null
      let floor: number | null = null
      try {
        price = c.price >= 0 ? toCents(moneyCell(row[c.price])) : null
        floor = c.floor >= 0 ? toCents(moneyCell(row[c.floor])) : null
      } catch (error) {
        return t.problem(n, `Listing ${code}: a price is not an amount (${(error as Error).message}).`)
      }
      if ((price !== null && price < 0) || (floor !== null && floor < 0)) {
        return t.problem(n, `Listing ${code}: prices cannot be negative.`)
      }
      const listedOn = dateCell(row[c.listed], (m) => t.problem(n, `Listing ${code}: Date listed ${m}`))
      const source = at(row, c.source)
      seen.add(code)
      listings.push({
        code,
        platform,
        status,
        title: at(row, c.title),
        price_cents: price,
        floor_cents: floor,
        quantity,
        external_id: at(row, c.external),
        url: null,
        listed_on: listedOn,
        note: at(row, c.note),
        source_note: source,
        // Records taken from screenshots may be out of date: flag them for Greg's one-time review.
        needs_review: platform.toLowerCase() === 'vinted' || (source ?? '').toLowerCase().includes('screenshot'),
      })
      listingFigures.push({ listing_code: code, figure_code: figure1, position: 1 })
      if (figure2 !== null) listingFigures.push({ listing_code: code, figure_code: figure2, position: 2 })
    })

    for (const decision of CONFIRMED_LISTING_COPIES) {
      const listing = listings.find((l) => l.external_id === decision.external_id)
      const copy = copyByCode.get(decision.copy_code)
      if (!listing || !copy) continue
      const onListing = listingFigures.some((lf) => lf.listing_code === listing.code && lf.figure_code === copy.figure_code)
      if (!onListing || copy.bucket !== 'for_sale') {
        problems.push({
          tab: 'Listings',
          row: null,
          message: `Listing ${listing.code} was confirmed as copy ${copy.code}, but that copy is not a for-sale copy of the figure on the listing.`,
        })
        continue
      }
      listingCopies.push({ listing_code: listing.code, copy_code: copy.code })
      notes.push(`Listing ${listing.code} is attached to copy ${copy.code} (${decision.why})`)
    }
  }

  // ---- Sales --------------------------------------------------------------
  const sales: ImportSale[] = []
  const saleCopies: ImportSaleCopy[] = []
  if (salesTab) {
    const t = salesTab
    const c = {
      code: t.need('Sale ID'),
      platform: t.need('Platform'),
      sold: t.find('Date sold'),
      figure: t.need('Figure ID'),
      quantity: t.find('Quantity'),
      price: t.need('Sale price'),
      shipping: t.find('Shipping paid by buyer'),
      fee: t.find('Selling fees', 'Platform fee'),
      label: t.find('Shipping label cost', 'Label cost'),
      buyer: t.find('Buyer'),
      order: t.find('Order number'),
      external: t.find('eBay item ID', 'Item ID'),
      note: t.find('Note'),
    }
    const seen = new Set<string>()
    t.eachRow((row, n) => {
      const code = text(row[c.code])
      if (!code) return t.problem(n, 'Sale ID is blank.')
      if (seen.has(code)) return t.problem(n, `Sale ID ${code} appears more than once.`)
      const platform = text(row[c.platform])
      if (!platform) return t.problem(n, `Sale ${code} has no platform.`)
      const figureCode = text(row[c.figure])
      const figure = figureCode ? figureByCode.get(figureCode) : undefined
      if (!figure) return t.problem(n, `Sale ${code} points at figure "${figureCode ?? ''}", which is not on the Figures tab.`)
      const quantity = c.quantity >= 0 ? wholeNumber(row[c.quantity], (m) => t.problem(n, `Sale ${code}: Quantity ${m}`)) ?? 1 : 1
      if (quantity < 1) return t.problem(n, `Sale ${code} needs a quantity of 1 or more.`)
      let price: number | null
      let shipping: number | null
      let fee: number | null
      let label: number | null
      try {
        price = toCents(moneyCell(row[c.price]))
        shipping = c.shipping >= 0 ? toCents(moneyCell(row[c.shipping])) : null
        fee = c.fee >= 0 ? toCents(moneyCell(row[c.fee])) : null
        label = c.label >= 0 ? toCents(moneyCell(row[c.label])) : null
      } catch (error) {
        return t.problem(n, `Sale ${code}: an amount is not valid (${(error as Error).message}).`)
      }
      if (price === null) return t.problem(n, `Sale ${code} has no sale price.`)
      if ([price, shipping, fee, label].some((v) => v !== null && v < 0)) {
        return t.problem(n, `Sale ${code}: amounts cannot be negative.`)
      }
      const soldOn = dateCell(row[c.sold], (m) => t.problem(n, `Sale ${code}: Date sold ${m}`))
      // The sale came from a listing in this file when exactly one listing on the same
      // platform carries the same listing number (a multi-quantity listing that has partly sold).
      const externalId = at(row, c.external)
      const fromListings =
        externalId === null
          ? []
          : listings.filter((l) => l.platform.toLowerCase() === platform.toLowerCase() && l.external_id === externalId)
      seen.add(code)
      sales.push({
        code,
        platform,
        listing_code: fromListings.length === 1 ? fromListings[0].code : null,
        sold_on: soldOn,
        sale_price_cents: price,
        shipping_charged_cents: shipping,
        platform_fee_cents: fee,
        label_cost_cents: label,
        other_cost_cents: null,
        buyer: at(row, c.buyer),
        order_number: at(row, c.order),
        external_id: externalId,
        status: 'complete',
        note: at(row, c.note),
        needs_review: platform.toLowerCase() === 'vinted',
      })
      // Sold copies are not on the Copies tab. Create one "sold" copy per unit, cost unknown.
      for (let i = 1; i <= quantity; i++) {
        const copyCode = `SOLD-${code}-${i}`
        const copy: ImportCopy = {
          code: copyCode,
          release_code: figure.release_code,
          figure_code: figure.code,
          bucket: 'for_sale',
          storage: null,
          boxed: null,
          has_sleeve: null,
          has_coa: null,
          in_protector: null,
          flaw: false,
          condition_note: null,
          cost_cents: null,
          status: 'sold',
          source_note: `Sold before the tracker started (sale ${code}). Condition and cost were not recorded.`,
        }
        if (copyByCode.has(copyCode)) return t.problem(n, `Copy ID ${copyCode} is already used.`)
        copyByCode.set(copyCode, copy)
        copies.push(copy)
        saleCopies.push({ sale_code: code, copy_code: copyCode })
      }
    })
  }

  // One name, one spelling: "Ebay" and "eBay" would otherwise look like two platforms.
  const clash = (tab: string, what: string, values: Array<string | null>) => {
    const groups = new Map<string, Map<string, number>>()
    for (const value of values) {
      if (value === null) continue
      const group = groups.get(value.toLowerCase()) ?? new Map<string, number>()
      group.set(value, (group.get(value) ?? 0) + 1)
      groups.set(value.toLowerCase(), group)
    }
    for (const group of groups.values()) {
      if (group.size < 2) continue
      const list = [...group].map(([spelling, count]) => `"${spelling}" (${count} ${count === 1 ? 'time' : 'times'})`).join(' and ')
      problems.push({ tab, row: null, message: `One ${what} is written more than one way: ${list}. Make them the same.` })
    }
  }
  clash('Releases', 'brand', releases.map((r) => r.brand))
  clash('Figures', 'variant', figures.map((f) => f.variant))
  clash('Copies', 'storage location', copies.map((c) => c.storage))
  clash('Listings and Sales', 'platform', [...listings.map((l) => l.platform), ...sales.map((s) => s.platform)])

  if (problems.length > 0) return { ok: false, problems }

  const storageNames = [...new Set(copies.map((copy) => copy.storage).filter((s): s is string => s !== null))].sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  )
  const preferred = ['ebay', 'vinted']
  const platformNames = [...new Set([...listings.map((l) => l.platform), ...sales.map((s) => s.platform)])].sort((a, b) => {
    const ia = preferred.indexOf(a.toLowerCase())
    const ib = preferred.indexOf(b.toLowerCase())
    if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    return a.localeCompare(b)
  })

  const data: ImportData = {
    file_name: options.fileName ?? null,
    brands: [...new Set(releases.map((r) => r.brand))].map((name) => ({ name })),
    storage_locations: storageNames.map((name, i) => ({ name, sort_order: i + 1 })),
    platforms: platformNames.map((name, i) => ({ name, sort_order: i + 1 })),
    releases,
    figures,
    copies,
    listings,
    listing_figures: listingFigures,
    listing_copies: listingCopies,
    sales,
    sale_copies: saleCopies,
  }
  return { ok: true, data, notes }
}

// ---------------------------------------------------------------------------
// Reading a tab
// ---------------------------------------------------------------------------

type Tab = {
  /** Column position of a required heading. Records a problem (and returns -1) if missing. */
  need: (...names: string[]) => number
  /** Column position of an optional heading, or -1. */
  find: (...names: string[]) => number
  /** Calls `visit` for each non-empty data row with its spreadsheet row number. */
  eachRow: (visit: (row: Cell[], rowNumber: number) => void) => void
  problem: (rowNumber: number | null, message: string) => void
}

function openTab(sheets: Record<string, SheetRows>, name: string, problems: ImportProblem[], required: boolean): Tab | null {
  const key = Object.keys(sheets).find((k) => k.trim().toLowerCase() === name.toLowerCase())
  const rows = key ? sheets[key] : undefined
  if (!rows || rows.length === 0) {
    if (required) problems.push({ tab: name, row: null, message: `The spreadsheet has no "${name}" tab.` })
    return null
  }
  // Calculated columns are Greg's own checking formulas. They are never read, whatever they are called.
  const headers = rows[0].map((h) => {
    const heading = typeof h === 'string' ? h.trim().toLowerCase() : ''
    return heading.endsWith('(calculated)') ? '' : heading
  })
  const find = (...names: string[]) => {
    for (const wanted of names) {
      const lower = wanted.toLowerCase()
      // An exact heading always wins over one that merely starts with the same words.
      const exact = headers.indexOf(lower)
      if (exact >= 0) return exact
      const starts = headers.flatMap((heading, index) => (heading !== '' && heading.startsWith(lower) ? [index] : []))
      if (starts.length === 1) return starts[0]
      if (starts.length > 1) {
        problems.push({
          tab: name,
          row: 1,
          message: `The "${name}" tab has ${starts.length} columns starting with "${wanted}", so it is not clear which one to read. Rename one of them.`,
        })
        return starts[0]
      }
    }
    return -1
  }
  let missing = false
  return {
    find,
    need: (...names) => {
      const index = find(...names)
      if (index < 0) {
        missing = true
        problems.push({ tab: name, row: 1, message: `The "${name}" tab has no "${names[0]}" column.` })
      }
      return index
    },
    eachRow: (visit) => {
      if (missing) return
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.every((cell) => cell === null || cell === undefined || (typeof cell === 'string' && cell.trim() === ''))) continue
        visit(row, i + 1)
      }
    },
    problem: (row, message) => {
      problems.push({ tab: name, row, message })
    },
  }
}

// ---------------------------------------------------------------------------
// Reading a cell
// ---------------------------------------------------------------------------

/** Cell as trimmed text, or null when blank. Numbers (such as an eBay item number) become text. */
function text(cell: Cell): string | null {
  if (cell === null || cell === undefined) return null
  if (cell instanceof Date) return toIsoDate(cell)
  const value = typeof cell === 'number' ? String(cell) : String(cell).trim()
  return value === '' ? null : value
}

/** Like `text`, for an optional column (index -1 means the column is not in the file). */
function at(row: Cell[], index: number): string | null {
  return index >= 0 ? text(row[index]) : null
}

/** A money cell handed to toCents: numbers stay numbers, text stays text, blank stays blank. */
function moneyCell(cell: Cell): string | number | null {
  if (cell === null || cell === undefined) return null
  if (typeof cell === 'number' || typeof cell === 'string') return cell
  throw new Error('expected a number')
}

function yesNo(cell: Cell, fail: (message: string) => void): boolean | null {
  if (cell === null || cell === undefined) return null
  if (typeof cell === 'boolean') return cell
  const value = String(cell).trim().toLowerCase()
  if (value === '') return null
  if (value === 'yes' || value === 'y' || value === 'true') return true
  if (value === 'no' || value === 'n' || value === 'false') return false
  fail(`should be Yes, No or blank, not "${String(cell)}".`)
  return null
}

function wholeNumber(cell: Cell, fail: (message: string) => void): number | null {
  if (cell === null || cell === undefined) return null
  const value = typeof cell === 'number' ? cell : Number(String(cell).trim().replace(/,/g, ''))
  if (typeof cell === 'string' && cell.trim() === '') return null
  if (!Number.isInteger(value) || value < 0) {
    fail(`should be a whole number, not "${String(cell)}".`)
    return null
  }
  return value
}

function dateCell(cell: Cell, fail: (message: string) => void): string | null {
  if (cell === null || cell === undefined) return null
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) {
      fail('is not a valid date.')
      return null
    }
    return toIsoDate(cell)
  }
  const value = String(cell).trim()
  if (value === '') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) {
    const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    if (toIsoDate(probe) === `${match[1]}-${match[2]}-${match[3]}`) return `${match[1]}-${match[2]}-${match[3]}`
  }
  fail(`should be a date, not "${value}".`)
  return null
}

/** Spreadsheet dates arrive as midnight UTC, so read the calendar day in UTC to avoid slipping a day. */
function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
