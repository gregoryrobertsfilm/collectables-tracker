/**
 * Money rules (brief, section 9).
 *
 * Every amount is held as a whole number of CENTS, never as a decimal number of dollars.
 * Computers cannot store most decimals exactly (0.1 + 0.2 is not quite 0.3), so adding
 * dollars drifts by fractions of a cent. Whole cents never drift.
 *
 * A missing amount is `null`. Null means "unknown" and is never treated as zero for a cost.
 */

export type Cents = number

/**
 * Reads a dollar amount typed by a person or stored in a spreadsheet and returns exact cents.
 * Returns null for blank input. Throws on anything that is not a clear dollar amount, so a
 * typo can never be silently saved as the wrong number.
 *
 *   toCents("14.99") -> 1499     toCents("$1,234.5") -> 123450     toCents("") -> null
 */
export function toCents(input: string | number | null | undefined): Cents | null {
  if (input === null || input === undefined) return null

  let text: string
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error(`Not a valid amount: ${input}`)
    // toFixed(4) cancels the tiny errors spreadsheets introduce (e.g. 33.980000000000004)
    // while keeping enough digits to notice a genuine fraction of a cent.
    text = input.toFixed(4)
  } else {
    text = input.trim()
    if (text === '') return null
  }

  let negative = false
  if (text.startsWith('(') && text.endsWith(')')) {
    negative = true
    text = text.slice(1, -1).trim()
  }
  if (text.startsWith('-')) {
    // "(-5.25)" is ambiguous (brackets and a minus sign both mean negative): refuse it.
    if (negative) throw new Error(`Not a valid dollar amount: "${input}"`)
    negative = true
    text = text.slice(1).trim()
  }
  text = text.replace(/^\$/, '').trim()

  const match = /^(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?$/.exec(text)
  if (!match || (match[1] === '' && (match[2] === undefined || match[2] === ''))) {
    throw new Error(`Not a valid dollar amount: "${input}"`)
  }
  const dollars = match[1].replace(/,/g, '') || '0'
  const fraction = match[2] ?? ''
  if (/[1-9]/.test(fraction.slice(2))) {
    throw new Error(`Amounts can have at most two decimal places: "${input}"`)
  }
  const cents = Number(dollars) * 100 + Number(fraction.slice(0, 2).padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) throw new Error(`Amount is too large: "${input}"`)
  return negative && cents !== 0 ? -cents : cents
}

/** Shows cents as dollars: 1499 -> "$14.99", -500 -> "-$5.00", 123450 -> "$1,234.50". */
export function formatCents(cents: Cents): string {
  assertCents(cents)
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100).toLocaleString('en-US')
  const rest = String(abs % 100).padStart(2, '0')
  return `${cents < 0 ? '-' : ''}$${dollars}.${rest}`
}

/** Like formatCents, but shows unknown amounts as a dash instead of pretending they are $0.00. */
export function formatCentsOrUnknown(cents: Cents | null | undefined, unknown = '—'): string {
  return cents === null || cents === undefined ? unknown : formatCents(cents)
}

/** Adds amounts exactly. Unknown (null) entries are skipped. */
export function sumCents(amounts: Iterable<Cents | null | undefined>): Cents {
  let total = 0
  for (const amount of amounts) {
    if (amount === null || amount === undefined) continue
    assertCents(amount)
    total += amount
  }
  return total
}

export type SaleAmounts = {
  salePrice: Cents
  /** Shipping the buyer paid. Unknown counts as nothing received. */
  shippingCharged?: Cents | null
  platformFee?: Cents | null
  labelCost?: Cents | null
  otherCost?: Cents | null
}

/** Net for a sale = sale price + shipping the buyer paid - platform fee - label cost - any other cost. */
export function saleNet(sale: SaleAmounts): Cents {
  assertCents(sale.salePrice)
  return (
    sale.salePrice +
    sumCents([sale.shippingCharged]) -
    sumCents([sale.platformFee]) -
    sumCents([sale.labelCost]) -
    sumCents([sale.otherCost])
  )
}

/**
 * Profit = net - cost, but ONLY when the cost is known.
 * A blank cost returns null ("cost unknown"); it is never treated as a cost of zero.
 */
export function profit(net: Cents, cost: Cents | null | undefined): Cents | null {
  assertCents(net)
  if (cost === null || cost === undefined) return null
  assertCents(cost)
  return net - cost
}

/**
 * Splits a total across a number of copies so the parts add up to the total exactly.
 * Any leftover cents go to the first copies: $10.00 across 3 -> $3.34, $3.33, $3.33.
 */
export function splitEvenly(total: Cents, parts: number): Cents[] {
  assertCents(total)
  if (!Number.isInteger(parts) || parts < 1) throw new Error('Must split across at least one copy')
  const sign = total < 0 ? -1 : 1
  const abs = Math.abs(total)
  const base = Math.floor(abs / parts)
  const extra = abs % parts
  return Array.from({ length: parts }, (_, i) => withSign(sign, base + (i < extra ? 1 : 0)))
}

/**
 * Works out a percentage of an amount, rounded to the nearest cent (halves round up).
 * The rate is given in hundredths of a percent so it stays a whole number: 13.6% -> 1360.
 */
export function percentOf(amount: Cents, rateHundredthsOfPercent: number): Cents {
  assertCents(amount)
  if (!Number.isInteger(rateHundredthsOfPercent) || rateHundredthsOfPercent < 0) {
    throw new Error('Rate must be a whole number of hundredths of a percent')
  }
  const sign = amount < 0 ? -1 : 1
  const numerator = Math.abs(amount) * rateHundredthsOfPercent
  if (!Number.isSafeInteger(numerator)) throw new Error('Amount is too large')
  return withSign(sign, Math.floor((numerator + 5000) / 10000))
}

/** Applies a sign without ever producing "negative zero", which would print as -$0.00 in places. */
function withSign(sign: number, magnitude: number): Cents {
  return magnitude === 0 ? 0 : sign * magnitude
}

function assertCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Money must be a whole number of cents, got ${value}`)
  }
}
