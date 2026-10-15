import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Reads the one-time token from an emailed link (#token=..., or ?token=... in links sent before the
 * fragment format) and removes it from the address bar, so it does not stay in history or get copied. */
export function useLinkToken(): string | null {
  const location = useLocation()
  const navigate = useNavigate()
  // Read once: the URL no longer carries the token after the cleanup below
  const [token] = useState(() => {
    const fromHash = new URLSearchParams(location.hash.slice(1)).get('token')
    return fromHash || new URLSearchParams(location.search).get('token')
  })

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    const hash = new URLSearchParams(location.hash.slice(1))
    if (!search.has('token') && !hash.has('token')) return
    search.delete('token')
    hash.delete('token')
    const query = search.toString()
    const fragment = hash.toString()
    navigate(
      {
        pathname: location.pathname,
        search: query ? `?${query}` : '',
        hash: fragment ? `#${fragment}` : '',
      },
      { replace: true, state: location.state }
    )
  }, [location, navigate])

  return token
}
