/**
 * True when the app is running from the phone's home screen rather than in a browser tab.
 * iPhone reports a home-screen app as "fullscreen" (not "standalone"), so both are checked,
 * plus Apple's older `navigator.standalone` flag.
 */
export function isInstalledToHomeScreen(): boolean {
  if (typeof window === 'undefined') return false
  const byDisplayMode =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches
  const byAppleFlag = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return byDisplayMode || byAppleFlag
}
