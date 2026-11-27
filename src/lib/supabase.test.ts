import { describe, expect, it } from 'vitest'
import { emailLinkProblemFrom, isRecoveryAddress } from './supabase'

describe('isRecoveryAddress: spotting a password-reset email link', () => {
  it('recognises a working reset link', () => {
    expect(isRecoveryAddress('#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=recovery&')).toBe(true)
    expect(isRecoveryAddress('#type=recovery&access_token=abc')).toBe(true)
    expect(isRecoveryAddress('#access_token=abc&type=recovery')).toBe(true)
  })

  it('ignores ordinary addresses and other link types', () => {
    expect(isRecoveryAddress('')).toBe(false)
    expect(isRecoveryAddress('#')).toBe(false)
    expect(isRecoveryAddress('#access_token=abc&type=magiclink')).toBe(false)
    expect(isRecoveryAddress('#access_token=abc&type=recovery_other')).toBe(false)
    expect(isRecoveryAddress('#access_token=abc&subtype=recovery')).toBe(false)
  })

  it('ignores "type=recovery" typed into an address with no sign-in token', () => {
    // Anyone can send a link like this; it must not push a signed-in user to the password screen.
    expect(isRecoveryAddress('#type=recovery')).toBe(false)
    expect(isRecoveryAddress('#type=recovery&')).toBe(false)
    expect(isRecoveryAddress('?type=recovery')).toBe(false)
    expect(isRecoveryAddress('?access_token=abc&type=recovery')).toBe(false)
  })

  it('does not ask for a new password when the link failed', () => {
    const expired = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&type=recovery'
    expect(isRecoveryAddress(expired)).toBe(false)
    expect(isRecoveryAddress('#access_token=abc&type=recovery&error=x')).toBe(false)
    expect(emailLinkProblemFrom(expired)).toMatch(/expired or was already used/)
  })

  it('reports no problem for a normal visit', () => {
    expect(emailLinkProblemFrom('')).toBeNull()
    expect(emailLinkProblemFrom('&')).toBeNull()
    expect(emailLinkProblemFrom('#access_token=abc&type=recovery&')).toBeNull()
  })
})
