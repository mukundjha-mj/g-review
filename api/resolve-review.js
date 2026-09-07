const allowedHosts = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'search.google.com',
  'g.page',
])

function isAllowedGoogleUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

function toWriteReviewUrl(value) {
  const url = new URL(value)
  if (url.hostname === 'search.google.com' && url.pathname === '/local/writereview' && url.searchParams.get('placeid')) return url.href
  if (url.hostname === 'g.page' && url.pathname.endsWith('/review')) return url.href

  const decoded = decodeURIComponent(url.href)
  if (/!12e1(?:[!?]|$)/.test(decoded)) return url.href

  const placeId = url.searchParams.get('query_place_id') || url.searchParams.get('placeid')
  if (placeId) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`

  const dataId = decoded.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)(?:!|[?&#]|$)/i)?.[1]
  if (dataId) return `https://www.google.com/maps/place//data=!4m3!3m2!1s${dataId}!12e1`
  return null
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  const input = Array.isArray(request.query.url) ? request.query.url[0] : request.query.url
  if (!input || !isAllowedGoogleUrl(input)) return response.status(400).json({ error: 'Paste a valid Google Maps or Google review link.' })

  try {
    let resolvedUrl = input
    let reviewUrl = toWriteReviewUrl(resolvedUrl)
    if (!reviewUrl) {
      const result = await fetch(input, {
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 GoogleReviewLinkResolver/1.0' },
      })
      resolvedUrl = result.url
      if (!isAllowedGoogleUrl(resolvedUrl)) throw new Error('Invalid redirect.')
      reviewUrl = toWriteReviewUrl(resolvedUrl)
    }
    if (!reviewUrl) return response.status(422).json({ error: 'Could not identify the business. Paste its Google Maps Share link.' })
    return response.status(200).json({ reviewUrl })
  } catch {
    return response.status(502).json({ error: 'Could not resolve this Google link. Please try another Maps Share link.' })
  }
}