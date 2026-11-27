import { describe, expect, it } from 'vitest'
import { computeStats, reserveForSaleCopies, type Snapshot, type SnapshotCopy, type SnapshotListing } from './stats'

function copy(id: string, figureId: string | null, extra: Partial<SnapshotCopy> = {}): SnapshotCopy {
  return { id, figureId, bucket: 'for_sale', storage: null, boxed: true, hasSleeve: true, flaw: false, status: 'in_hand', ...extra }
}
function listing(id: string, figureIds: string[], quantity = 1, extra: Partial<SnapshotListing> = {}): SnapshotListing {
  return { id, platform: 'eBay', status: 'live', quantity, figureIds, copyIds: [], ...extra }
}

describe('reserveForSaleCopies: how many for-sale copies are still to be listed', () => {
  it('nothing listed: everything is to be listed', () => {
    expect(reserveForSaleCopies([copy('a', 'F1'), copy('b', 'F1')], [])).toEqual({ notListed: 2, overListed: [] })
  })

  it('a listing for 3 of 5 identical copies leaves 2', () => {
    const copies = ['a', 'b', 'c', 'd', 'e'].map((id) => copy(id, 'F1'))
    expect(reserveForSaleCopies(copies, [listing('L1', ['F1'], 3)]).notListed).toBe(2)
  })

  it('a set takes one copy of each of its two figures', () => {
    const copies = [copy('a', 'F1'), copy('b', 'F1'), copy('c', 'F2')]
    expect(reserveForSaleCopies(copies, [listing('L1', ['F1', 'F2'], 1)]).notListed).toBe(1)
  })

  it('different copies of one figure on eBay and on Vinted: both are spoken for', () => {
    const copies = [copy('a', 'F1'), copy('b', 'F1'), copy('c', 'F1')]
    const listings = [listing('L1', ['F1'], 1), listing('L2', ['F1'], 1, { platform: 'Vinted' })]
    expect(reserveForSaleCopies(copies, listings).notListed).toBe(1)
  })

  it('the very same copy on eBay and on Vinted is counted once', () => {
    const copies = [copy('a', 'F1'), copy('b', 'F1')]
    const listings = [listing('L1', ['F1'], 1, { copyIds: ['a'] }), listing('L2', ['F1'], 1, { platform: 'Vinted', copyIds: ['a'] })]
    expect(reserveForSaleCopies(copies, listings).notListed).toBe(1)
  })

  it('a specific copy attached to a multi-quantity listing counts within that quantity, not on top', () => {
    const copies = ['a', 'b', 'c', 'd'].map((id) => copy(id, 'F1'))
    expect(reserveForSaleCopies(copies, [listing('L1', ['F1'], 2, { copyIds: ['a'] })]).notListed).toBe(2)
  })

  it('sealed blind boxes can never be accounted for by a listing', () => {
    expect(reserveForSaleCopies([copy('a', null), copy('b', null)], [listing('L1', ['F1'], 1)]).notListed).toBe(2)
  })

  it('listing more than exist is flagged and never goes below zero', () => {
    const result = reserveForSaleCopies([copy('a', 'F1')], [listing('L1', ['F1'], 3), listing('L2', ['F2'], 1)])
    expect(result).toEqual({ notListed: 0, overListed: ['F1', 'F2'] })
  })

  it('never picks a flawed copy automatically', () => {
    // Two copies, one flawed, one listing for 1: the sound copy is listed, the flawed one is not.
    expect(reserveForSaleCopies([copy('a', 'F1'), copy('b', 'F1', { flaw: true })], [listing('L1', ['F1'], 1)])).toEqual({
      notListed: 1,
      overListed: [],
    })
    // Only a flawed copy exists: the listing cannot be met from sound copies, so it is flagged.
    expect(reserveForSaleCopies([copy('b', 'F1', { flaw: true })], [listing('L1', ['F1'], 1)])).toEqual({
      notListed: 1,
      overListed: ['F1'],
    })
  })

  it('counts a flawed copy as listed when it is attached to the listing by hand', () => {
    const copies = [copy('a', 'F1'), copy('b', 'F1', { flaw: true })]
    expect(reserveForSaleCopies(copies, [listing('L1', ['F1'], 1, { copyIds: ['b'] })])).toEqual({ notListed: 1, overListed: [] })
    // ...and a second listing then takes the sound copy.
    expect(
      reserveForSaleCopies(copies, [listing('L1', ['F1'], 1, { copyIds: ['b'] }), listing('L2', ['F1'], 1, { platform: 'Vinted' })]),
    ).toEqual({ notListed: 0, overListed: [] })
  })

  it('ignores an attached copy that is not a for-sale copy of that figure', () => {
    const copies = [copy('a', 'F1'), copy('b', 'F1')]
    expect(reserveForSaleCopies(copies, [listing('L1', ['F1'], 1, { copyIds: ['zzz'] })]).notListed).toBe(1)
  })
})

describe('computeStats', () => {
  const snapshot: Snapshot = {
    releases: [{ id: 'R1' }, { id: 'R2' }],
    figures: [
      { id: 'F1', variant: 'Hero' },
      { id: 'F2', variant: 'Chase' },
    ],
    copies: [
      copy('a', 'F1', { storage: 'Bag 01' }),
      copy('b', 'F1', { storage: 'Bag 01', flaw: true }),
      copy('c', 'F2', { storage: 'Bag 02', hasSleeve: false }),
      copy('d', null, { storage: 'Bag 02' }),
      copy('e', 'F1', { bucket: 'greg', boxed: false, hasSleeve: false }),
      copy('f', 'F2', { bucket: 'kaitlyn' }),
      copy('g', 'F1', { status: 'incoming' }),
      copy('sold1', 'F1', { status: 'sold' }),
      copy('sold2', 'F2', { status: 'shipped', flaw: true, boxed: false }),
    ],
    listings: [
      listing('L1', ['F1'], 2),
      listing('L2', ['F1', 'F2'], 1, { platform: 'Vinted' }),
      listing('L3', ['F1'], 5, { status: 'ended' }),
      listing('L4', ['F2'], 1, { status: 'draft' }),
    ],
    sales: [
      { id: 'S1', status: 'complete', salePrice: 1499, shippingCharged: 683, platformFee: 361, labelCost: 683, otherCost: null },
      { id: 'S2', status: 'to_ship', salePrice: 4500, shippingCharged: null, platformFee: 0, labelCost: null, otherCost: null },
      { id: 'S3', status: 'refunded', salePrice: 9999, shippingCharged: null, platformFee: null, labelCost: null, otherCost: null },
    ],
  }
  const stats = computeStats(snapshot)

  it('counts owned copies only: sold and shipped are history', () => {
    expect(stats.copiesOwned).toBe(7)
    expect([stats.forSale, stats.gregs, stats.kaitlyns]).toEqual([5, 1, 1])
  })

  it('splits for-sale copies by variant, with sealed boxes apart', () => {
    expect(stats.forSaleByVariant).toEqual({ Hero: 3, Chase: 1 })
    expect(stats.forSaleSealed).toBe(1)
  })

  it('counts storage, flaws, missing sleeves and loose figures among owned copies', () => {
    expect(stats.byStorage).toEqual({ 'Bag 01': 2, 'Bag 02': 2 })
    expect(stats.flawed).toBe(1)
    expect(stats.boxedWithoutSleeve).toBe(1)
    expect(stats.loose).toBe(1)
  })

  it('counts only live listings, and a set as two units', () => {
    expect(stats.liveListings).toBe(2)
    expect(stats.liveListingsByPlatform).toEqual({ eBay: 1, Vinted: 1 })
    expect(stats.listedUnits).toBe(4)
  })

  it('works out the to-list pile, never counting a flawed copy as listed automatically', () => {
    // F1: 3 for-sale copies, one flawed. Listings want 2 + 1 = 3, but only 2 sound copies exist,
    // so the flawed one stays in the to-list pile and F1 is flagged as over-listed.
    // F2: 1 copy, 1 listed -> 0. Sealed: 1.
    expect(stats.forSaleNotListed).toBe(2)
    expect(stats.overListedFigureIds).toEqual(['F1'])
  })

  it('leaves refunded sales out of the count and the net', () => {
    expect(stats.sales).toBe(2)
    expect(stats.netCents).toBe(1138 + 4500)
  })

  it('counts figures and releases', () => {
    expect([stats.figures, stats.releases]).toEqual([2, 2])
  })
})
