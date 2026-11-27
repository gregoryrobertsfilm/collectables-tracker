import { describe, expect, it } from 'vitest'
import { friendlyAuthError } from './messages'

describe('friendlyAuthError', () => {
  it('explains a wrong email or password without saying which one', () => {
    const message = friendlyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 })
    expect(message).toMatch(/don’t match/)
    expect(friendlyAuthError({ message: 'Invalid login credentials' })).toBe(message)
  })

  it('explains too many attempts', () => {
    expect(friendlyAuthError({ status: 429, message: 'Request rate limit reached' })).toMatch(/Too many tries/)
    expect(friendlyAuthError({ code: 'over_email_send_rate_limit' })).toMatch(/Too many tries/)
  })

  it('explains a connection problem', () => {
    expect(friendlyAuthError({ message: 'Failed to fetch' })).toMatch(/internet connection/)
    expect(friendlyAuthError({ message: 'Load failed' })).toMatch(/internet connection/)
  })

  it('explains a weak or repeated password', () => {
    expect(friendlyAuthError({ code: 'weak_password' })).toMatch(/too short or too simple/)
    expect(friendlyAuthError({ code: 'same_password' })).toMatch(/same as your current password/)
  })

  it('never shows raw technical text for anything unexpected', () => {
    const message = friendlyAuthError({ message: 'AuthApiError: unexpected_failure at gotrue line 42', status: 500 })
    expect(message).toBe('Something went wrong. Please try again.')
    expect(friendlyAuthError(null)).toBe('Something went wrong. Please try again.')
  })
})
