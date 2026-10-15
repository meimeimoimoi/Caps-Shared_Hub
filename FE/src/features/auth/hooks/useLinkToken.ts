import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Reads the one-time token from an emailed link (#token=...) and removes it from the address bar,
 * so it does not stay in history or get copied. */
export function useLinkToken(): string | null {
  const location = useLocation()
  const navigate = useNavigate()
  // Read once: the URL no longer carries the token after the cleanup below
  const [token] = useState(() =>
    new URLSearchParams(location.hash.slice(1)).get('token')
  )

  useEffect(() => {
    const hash = new URLSearchParams(location.hash.slice(1))
    if (!hash.has('token')) return
    hash.delete('token')
    const fragment = hash.toString()
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: fragment ? `#${fragment}` : '',
      },
      { replace: true, state: location.state }
    )
  }, [location, navigate])

  return token
}
