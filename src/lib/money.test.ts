import { describe, expect, it } from 'vitest'
import { formatCents, formatCentsOrUnknown, percentOf, profit, saleNet, splitEvenly, sumCents, toCents } from './money'

describe('toCents: reading dollar amounts exactly', () => {
  it('reads ordinary amounts', () => {
    expect(toCents('14.99')).toBe(1499)
    expect(toCents('38')).toBe(3800)
    expect(toCents('0.4')).toBe(40)
    expect(toCents('.5')).toBe(50)
    expect(toCents('7.')).toBe(700)
    expect(toCents('0')).toBe(0)
  })

  it('accepts a dollar sign, thousands commas and surrounding spaces', () => {
    expect(toCents(' $1,234.50 ')).toBe(123450)
    expect(toCents('$ 9.99')).toBe(999)
    expect(toCents('12,345,678.90')).toBe(1234567890)
  })

  it('reads negatives, including accountant-style brackets', () => {
    expect(toCents('-5.25')).toBe(-525)
    expect(toCents('(5.25)')).toBe(-525)
    expect(toCents('-$5.25')).toBe(-525)
    expect(toCents('-0.00')).toBe(0)
  })

  it('treats blank as unknown (null), never as zero', () => {
    expect(toCents('')).toBeNull()
    expect(toCents('   ')).toBeNull()
    expect(toCents(null)).toBeNull()
    expect(toCents(undefined)).toBeNull()
  })

  it('reads numbers from a spreadsheet without rounding drift', () => {
    expect(toCents(14.99)).toBe(1499)
    expect(toCents(33.98)).toBe(3398)
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(33.980000000000004)).toBe(3398)
    expect(toCents(70)).toBe(7000)
  })

  it('refuses anything that is not a clear dollar amount', () => {
    for (const bad of ['abc', '12.3.4', '1,23', '12,34.00', '$', '.', '-', '1e3', '12 34', '5.999', '4.001', '(-5.25)', '(-5)', '( -5 )', '(-$5.25)', '-(5)', '--5', '+5', '(5', '5)', '\u22125']) {
      expect(() => toCents(bad), bad).toThrow()
    }
    expect(() => toCents(Number.NaN)).toThrow()
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow()
    expect(() => toCents(4.005)).toThrow()
  })

  it('allows harmless trailing zeros', () => {
    expect(toCents('5.990')).toBe(599)
    expect(toCents('5.9900')).toBe(599)
  })
})

describe('formatCents', () => {
  it('shows dollars and cents', () => {
    expect(formatCents(1499)).toBe('$14.99')
    expect(formatCents(5)).toBe('$0.05')
    expect(formatCents(0)).toBe('$0.00')
    expect(formatCents(123450)).toBe('$1,234.50')
    expect(formatCents(-500)).toBe('-$5.00')
  })

  it('shows unknown amounts as a dash, not $0.00', () => {
    expect(formatCentsOrUnknown(null)).toBe('—')
    expect(formatCentsOrUnknown(undefined, 'cost unknown')).toBe('cost unknown')
    expect(formatCentsOrUnknown(0)).toBe('$0.00')
  })

  it('refuses fractions of a cent', () => {
    expect(() => formatCents(14.5)).toThrow()
  })

  it('round-trips with toCents', () => {
    for (const cents of [0, 1, 99, 100, 1499, 50151, 123456789, -1, -50151]) {
      expect(toCents(formatCents(cents))).toBe(cents)
    }
  })
})

describe('saleNet: sale price + shipping paid - fee - label - other', () => {
  it('follows the formula', () => {
    expect(saleNet({ salePrice: 1499, shippingCharged: 683, platformFee: 361, labelCost: 683 })).toBe(1138)
    expect(saleNet({ salePrice: 1000, shippingCharged: 500, platformFee: 200, labelCost: 450, otherCost: 25 })).toBe(825)
  })

  it('treats unknown shipping, fee and label as nothing', () => {
    expect(saleNet({ salePrice: 4500 })).toBe(4500)
    expect(saleNet({ salePrice: 4500, shippingCharged: null, platformFee: 0, labelCost: null })).toBe(4500)
  })

  it('can go negative when costs exceed the sale', () => {
    expect(saleNet({ salePrice: 500, platformFee: 108, labelCost: 600 })).toBe(-208)
  })

  it("adds up Greg's 17 real sales to exactly $501.51", () => {
    // [sale price, shipping paid by buyer, selling fees, label cost] straight from the Sales tab.
    const sales: Array<[number, number | null, number, number | null]> = [
      [14.99, 6.83, 3.61, 6.83],
      [14.99, 7.46, 3.72, 7.46],
      [33.98, 10.15, 6.69, 10.15],
      [38, 8.14, 7.07, 8.14],
      [22.99, 7.87, 4.94, 7.87],
      [40, 8.38, 7.52, 8.38],
      [55, 10.02, 9.77, 10.02],
      [19.99, 8.13, 4.49, 8.14],
      [44.99, 6.98, 8, 6.98],
      [70, 6.04, 11.79, 6.05],
      [9.99, 6.04, 2.72, 6.04],
      [70, 10.15, 12.02, 10.15],
      [36, 8.58, 7.05, 8.58],
      [45, null, 0, null],
      [10, null, 0, null],
      [55, null, 0, null],
      [10, null, 0, null],
    ]
    const nets = sales.map(([price, shipping, fee, label]) =>
      saleNet({
        salePrice: toCents(price)!,
        shippingCharged: toCents(shipping),
        platformFee: toCents(fee),
        labelCost: toCents(label),
      }),
    )
    expect(nets).toHaveLength(17)
    expect(sumCents(nets)).toBe(50151)
    expect(formatCents(sumCents(nets))).toBe('$501.51')
  })
})

describe('profit: only when the cost is known', () => {
  it('is net minus cost', () => {
    expect(profit(1138, 500)).toBe(638)
    expect(profit(1138, 2000)).toBe(-862)
  })

  it('a cost of zero is a real cost (a free item), so profit equals net', () => {
    expect(profit(1138, 0)).toBe(1138)
  })

  it('a blank cost means unknown: no profit figure at all', () => {
    expect(profit(1138, null)).toBeNull()
    expect(profit(1138, undefined)).toBeNull()
  })
})

describe('sumCents', () => {
  it('adds exactly and skips unknowns', () => {
    expect(sumCents([10, 20, 30])).toBe(60)
    expect(sumCents([10, null, 20, undefined])).toBe(30)
    expect(sumCents([])).toBe(0)
  })

  it('has no rounding drift over many small amounts', () => {
    expect(sumCents(Array.from({ length: 10000 }, () => 10))).toBe(100000)
  })
})

describe('splitEvenly: one receipt across several copies', () => {
  it('splits and always adds back up to the total', () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333])
    expect(splitEvenly(1000, 4)).toEqual([250, 250, 250, 250])
    expect(splitEvenly(1, 3)).toEqual([1, 0, 0])
    expect(splitEvenly(0, 2)).toEqual([0, 0])
    for (const [total, parts] of [[12345, 8], [9999, 7], [100, 12], [-1000, 3]] as const) {
      const split = splitEvenly(total, parts)
      expect(split).toHaveLength(parts)
      expect(sumCents(split)).toBe(total)
      expect(Math.max(...split) - Math.min(...split)).toBeLessThanOrEqual(1)
    }
  })

  it('never produces negative zero', () => {
    for (const part of [...splitEvenly(-1, 3), ...splitEvenly(-2, 3), ...splitEvenly(0, 3)]) {
      expect(Object.is(part, -0)).toBe(false)
    }
    expect(splitEvenly(-1, 3)).toEqual([-1, 0, 0])
    expect(Object.is(percentOf(-4, 1000), -0)).toBe(false)
    expect(Object.is(percentOf(-1000, 0), -0)).toBe(false)
    expect(percentOf(-1250, 1000)).toBe(-125)
  })

  it('refuses to split across zero copies', () => {
    expect(() => splitEvenly(1000, 0)).toThrow()
    expect(() => splitEvenly(1000, 1.5)).toThrow()
  })
})

describe('percentOf: fee percentages', () => {
  it('works out 13.6% and rounds to the nearest cent', () => {
    expect(percentOf(10000, 1360)).toBe(1360)
    expect(percentOf(2182, 1360)).toBe(297) // 296.752 -> 297
    expect(percentOf(1000, 0)).toBe(0)
    expect(percentOf(1250, 1000)).toBe(125)
    expect(percentOf(5, 1000)).toBe(1) // 0.5 cents rounds up
    expect(percentOf(4, 1000)).toBe(0) // 0.4 cents rounds down
  })

  it('refuses a rate that is not a whole number of hundredths of a percent', () => {
    expect(() => percentOf(1000, 13.6)).toThrow()
    expect(() => percentOf(1000, -1)).toThrow()
  })
})
