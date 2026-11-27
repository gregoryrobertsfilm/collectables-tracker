/**
 * Turns Supabase's technical sign-in errors into plain language.
 * Kept as a plain function so it can be tested.
 */
export function friendlyAuthError(error: { message?: string; status?: number; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.'
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'That email and password don’t match. Check both and try again.'
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'This account’s email has not been confirmed yet in Supabase.'
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || error.status === 429) {
    return 'Too many tries in a short time. Wait a minute, then try again.'
  }
  if (code === 'weak_password' || message.includes('password should be')) {
    return 'That password is too short or too simple. Use a longer one.'
  }
  if (code === 'same_password') {
    return 'That is the same as your current password. Choose a different one.'
  }
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) {
    return 'Can’t reach the database. Check your internet connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}
