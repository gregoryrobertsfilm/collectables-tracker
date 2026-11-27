import { describe, expect, it } from 'vitest'
import { friendlyDataError } from './inventory'

describe('friendlyDataError: database errors in plain language', () => {
  it('explains a repeat import', () => {
    expect(friendlyDataError({ code: '23505', message: 'duplicate key value violates unique constraint "copies_owner_id_code_key"' })).toMatch(
      /already in your database/,
    )
  })
  it('explains missing tables or a missing import function', () => {
    for (const code of ['PGRST202', 'PGRST205', '42P01', '42883']) {
      expect(friendlyDataError({ code, message: 'x' })).toMatch(/has not been set up/)
    }
  })
  it('explains a refusal', () => {
    expect(friendlyDataError({ code: '42501', message: 'permission denied for table copies' })).toMatch(/refused/)
    expect(friendlyDataError({ message: 'new row violates row-level security policy' })).toMatch(/refused/)
  })
  it('passes on the plain-language message from our own database function', () => {
    expect(friendlyDataError({ code: 'P0001', message: 'Copies: 2 name a figure or storage location that does not exist.' })).toBe(
      'Copies: 2 name a figure or storage location that does not exist. Nothing was changed.',
    )
  })
  it('explains being offline or signed out', () => {
    expect(friendlyDataError({ message: 'TypeError: Failed to fetch' })).toMatch(/internet connection/)
    expect(friendlyDataError({ code: 'PGRST301', message: 'JWT expired' })).toMatch(/sign-in has expired/)
  })
  it('never shows raw technical text for anything else', () => {
    expect(friendlyDataError({ code: 'XX000', message: 'internal error at line 42' })).toBe(
      'Something went wrong talking to the database. Nothing was changed. Please try again.',
    )
    expect(friendlyDataError(null)).toMatch(/Something went wrong/)
  })
})
