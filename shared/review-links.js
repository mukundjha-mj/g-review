const INPUT_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'search.google.com',
  'g.page',
])

const REVIEW_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'search.google.com',
  'g.page',
])

function parseHttpsUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    return url
  } catch {
    return null
  }
}

function safelyDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function isAllowedGoogleInputUrl(value) {
  const url = parseHttpsUrl(value)
  return Boolean(url && INPUT_HOSTS.has(url.hostname.toLowerCase()))
}

export function isSafeReviewUrl(value) {
  const url = parseHttpsUrl(value)
  if (!url || !REVIEW_HOSTS.has(url.hostname.toLowerCase())) return false

  const host = url.hostname.toLowerCase()
  if (host === 'search.google.com') {
    return url.pathname === '/local/writereview' && Boolean(url.searchParams.get('placeid'))
  }
  if (host === 'g.page') return url.pathname.endsWith('/review')
  return url.pathname.startsWith('/maps/') && /!12e1(?:[!?]|$)/.test(safelyDecode(url.href))
}

export function toWriteReviewUrl(value) {
  const url = parseHttpsUrl(value)
  if (!url || !INPUT_HOSTS.has(url.hostname.toLowerCase())) return null
  if (isSafeReviewUrl(url.href)) return url.href

  const placeId = url.searchParams.get('query_place_id') || url.searchParams.get('placeid')
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
  }

  const decoded = safelyDecode(url.href)
  const dataId = decoded.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)(?:!|[?&#]|$)/i)?.[1]
  return dataId ? `https://www.google.com/maps/place//data=!4m3!3m2!1s${dataId}!12e1` : null
}

export function sanitizeBusinessName(value) {
  if (typeof value !== 'string') return ''
  return value
    .split('').filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    }).join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

export function extractBusinessName(value) {
  const url = parseHttpsUrl(value)
  if (!url) return ''

  const path = safelyDecode(url.pathname)
  const placeMatch = path.match(/\/maps\/place\/([^/]+)/i)
  if (placeMatch) return sanitizeBusinessName(placeMatch[1].replace(/\+/g, ' '))

  if (url.hostname.toLowerCase() === 'g.page') {
    const slug = path.split('/').filter(Boolean).find((part) => part.toLowerCase() !== 'review')
    if (slug) return sanitizeBusinessName(slug.replace(/[-+]/g, ' '))
  }

  return ''
}
