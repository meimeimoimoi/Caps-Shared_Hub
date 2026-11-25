import { apiClient } from '@/lib/api-client'

/** Opens the original of a document in a new tab. Crawled documents link to their site; uploads stream from
 * the API with the access token, which a plain link cannot send. */
export async function openOriginal(url: string) {
  if (!url.startsWith('/api/')) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  // Opened before the request so the browser does not block it as a popup
  const tab = window.open('', '_blank')
  try {
    const { data } = await apiClient.get<Blob>(url, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(data)
    if (tab) tab.location.href = objectUrl
    else window.location.assign(objectUrl)
    // The tab has loaded the file by then
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (e) {
    tab?.close()
    throw e
  }
}
