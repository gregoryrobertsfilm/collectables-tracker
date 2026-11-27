import { saleNet, sumCents, type Cents } from '../money'

/**
 * Works out the at-a-glance numbers (how many copies, whose, where, listed or not, sales
 * and net) from a plain "snapshot" of the records. The same code runs on a spreadsheet
 * before it is saved and on what is actually in the database afterwards, so the two can
 * be compared like for like.
 */

export type SnapshotCopy = {
  id: string
  /** null = sealed blind box, variant unknown. */
  figureId: string | null
  bucket: 'for_sale' | 'greg' | 'kaitlyn'
  storage: string | null
  boxed: boolean | null
  hasSleeve: boolean | null
  flaw: boolean
  status: 'incoming' | 'in_hand' | 'sold' | 'shipped'
}

export type SnapshotListing = {
  id: string
  platform: string
  status: 'draft' | 'live' | 'ended' | 'sold'
  /** How many are offered. For a set, the number of sets. */
  quantity: number
  /** One figure, or two for a set. The quantity applies to each. */
  figureIds: string[]
  /** Specific physical copies attached to this listing, if any. */
  copyIds: string[]
}

export type SnapshotSale = {
  id: string
  status: 'to_ship' | 'shipped' | 'complete' | 'refunded'
  salePrice: Cents
  shippingCharged: Cents | null
  platformFee: Cents | null
  labelCost: Cents | null
  otherCost: Cents | null
}

export type Snapshot = {
  releases: Array<{ id: string }>
  figures: Array<{ id: string; variant: string }>
  copies: SnapshotCopy[]
  listings: SnapshotListing[]
  sales: SnapshotSale[]
}

export type Stats = {
  /** Copies owned today (on their way or in hand). Sold and shipped copies are history. */
  copiesOwned: number
  forSale: number
  gregs: number
  kaitlyns: number
  /** For-sale copies by variant. "sealed" = blind boxes whose variant is unknown. */
  forSaleByVariant: Record<string, number>
  forSaleSealed: number
  /** Owned copies per storage location name. */
  byStorage: Record<string, number>
  flawed: number
  boxedWithoutSleeve: number
  loose: number
  figures: number
  releases: number
  liveListings: number
  liveListingsByPlatform: Record<string, number>
  /** Units on a live listing. A set counts once for each figure in it. */
  listedUnits: number
  /** For-sale copies that no live listing accounts for. This is the "to list" pile. */
  forSaleNotListed: number
  /** Figures whose live listings offer more units than there are for-sale copies. */
  overListedFigureIds: string[]
  /** Sales that still stand (refunded ones are left out). */
  sales: number
  netCents: Cents
}

const OWNED = new Set(['incoming', 'in_hand'])

export function computeStats(snapshot: Snapshot): Stats {
  const variantOf = new Map(snapshot.figures.map((f) => [f.id, f.variant]))
  const owned = snapshot.copies.filter((copy) => OWNED.has(copy.status))
  const forSale = owned.filter((copy) => copy.bucket === 'for_sale')

  const forSaleByVariant: Record<string, number> = {}
  let forSaleSealed = 0
  for (const copy of forSale) {
    if (copy.figureId === null) {
      forSaleSealed++
      continue
    }
    const variant = variantOf.get(copy.figureId) ?? 'Unknown'
    forSaleByVariant[variant] = (forSaleByVariant[variant] ?? 0) + 1
  }

  const byStorage: Record<string, number> = {}
  for (const copy of owned) {
    if (copy.storage === null) continue
    byStorage[copy.storage] = (byStorage[copy.storage] ?? 0) + 1
  }

  const live = snapshot.listings.filter((listing) => listing.status === 'live')
  const liveListingsByPlatform: Record<string, number> = {}
  let listedUnits = 0
  for (const listing of live) {
    liveListingsByPlatform[listing.platform] = (liveListingsByPlatform[listing.platform] ?? 0) + 1
    listedUnits += listing.quantity * listing.figureIds.length
  }

  const reservation = reserveForSaleCopies(forSale, live)

  const standing = snapshot.sales.filter((sale) => sale.status !== 'refunded')
  const netCents = sumCents(
    standing.map((sale) =>
      saleNet({
        salePrice: sale.salePrice,
        shippingCharged: sale.shippingCharged,
        platformFee: sale.platformFee,
        labelCost: sale.labelCost,
        otherCost: sale.otherCost,
      }),
    ),
  )

  return {
    copiesOwned: owned.length,
    forSale: forSale.length,
    gregs: owned.filter((copy) => copy.bucket === 'greg').length,
    kaitlyns: owned.filter((copy) => copy.bucket === 'kaitlyn').length,
    forSaleByVariant,
    forSaleSealed,
    byStorage,
    flawed: owned.filter((copy) => copy.flaw).length,
    boxedWithoutSleeve: owned.filter((copy) => copy.boxed === true && copy.hasSleeve === false).length,
    loose: owned.filter((copy) => copy.boxed === false).length,
    figures: snapshot.figures.length,
    releases: snapshot.releases.length,
    liveListings: live.length,
    liveListingsByPlatform,
    listedUnits,
    forSaleNotListed: reservation.notListed,
    overListedFigureIds: reservation.overListed,
    sales: standing.length,
    netCents,
  }
}

/**
 * Works out how many for-sale copies are spoken for by live listings.
 *
 * A listing is attached to a figure and a quantity, not usually to a particular copy:
 * when identical copies exist it does not matter which one ships. So for each figure,
 * the copies spoken for are:
 *   - every specific copy attached to a live listing (counted once, even if that same
 *     copy is listed on two sites), plus
 *   - for each live listing, the part of its quantity not covered by attached copies,
 * and never more than the number of for-sale copies that exist. Sealed blind boxes have
 * no figure, so no listing can account for them: they always count as not listed.
 */
export function reserveForSaleCopies(
  forSaleCopies: SnapshotCopy[],
  liveListings: SnapshotListing[],
): { notListed: number; overListed: string[] } {
  const copiesByFigure = new Map<string, SnapshotCopy[]>()
  let notListed = 0
  for (const copy of forSaleCopies) {
    if (copy.figureId === null) {
      notListed++
      continue
    }
    const list = copiesByFigure.get(copy.figureId) ?? []
    list.push(copy)
    copiesByFigure.set(copy.figureId, list)
  }

  const overListed: string[] = []
  const figureIds = new Set<string>([...copiesByFigure.keys(), ...liveListings.flatMap((l) => l.figureIds)])
  for (const figureId of figureIds) {
    const copies = copiesByFigure.get(figureId) ?? []
    const copyIds = new Set(copies.map((copy) => copy.id))
    const attached = new Set<string>()
    let unattached = 0
    for (const listing of liveListings) {
      if (!listing.figureIds.includes(figureId)) continue
      const mine = listing.copyIds.filter((id) => copyIds.has(id))
      for (const id of mine) attached.add(id)
      unattached += Math.max(0, listing.quantity - mine.length)
    }
    const wanted = attached.size + unattached
    if (wanted > copies.length) overListed.push(figureId)
    notListed += copies.length - Math.min(copies.length, wanted)
  }
  return { notListed, overListed: overListed.sort() }
}
