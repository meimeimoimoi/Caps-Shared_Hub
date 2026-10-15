/* The access token lives only in memory, never in localStorage, so an injected script cannot read it
 * from storage. A reloaded tab starts without it and gets a new one through the HttpOnly refresh cookie. */

let token: string | null = null
let signedIn = false

export function getAccessToken() {
  return token
}

/** True when this tab has (or is restoring) a session, even before the access token is back. */
export function isSignedIn() {
  return signedIn
}

/** Pass a token to start or renew a session; pass signedIn without a token to restore after a reload. */
export function setAccessToken(
  next: string | null,
  nextSignedIn = next !== null
) {
  token = next
  signedIn = nextSignedIn
}
