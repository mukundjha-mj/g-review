import {
  extractBusinessName,
  isAllowedGoogleInputUrl,
  toWriteReviewUrl,
} from '../shared/review-links.js'
import { HttpError } from './http-error.js'

const MAX_REDIRECTS = 5

async function followGoogleRedirects(input, fetchImpl, timeoutMs) {
  let currentUrl = input

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetchImpl(currentUrl, {
      redirect: 'manual',
      headers: { 'user-agent': 'Mozilla/5.0 GoogleReviewLinkResolver/2.0' },
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (response.status < 300 || response.status >= 400) return currentUrl
    const location = response.headers.get('location')
    if (!location) throw new HttpError(422, 'Google did not return a usable business link.')

    const nextUrl = new URL(location, currentUrl).href
    if (!isAllowedGoogleInputUrl(nextUrl)) {
      throw new HttpError(422, 'The Google link redirected to an unsupported website.')
    }
    currentUrl = nextUrl
  }

  throw new HttpError(422, 'The Google link redirected too many times.')
}

export async function resolveReviewLink(input, options = {}) {
  if (typeof input !== 'string' || input.length > 2048 || !isAllowedGoogleInputUrl(input)) {
    throw new HttpError(400, 'Paste a valid Google Maps or Google review link.')
  }

  const fetchImpl = options.fetchImpl || fetch
  const timeoutMs = options.timeoutMs || 8000
  let resolvedUrl = input
  let reviewUrl = toWriteReviewUrl(resolvedUrl)

  if (!reviewUrl) {
    try {
      resolvedUrl = await followGoogleRedirects(input, fetchImpl, timeoutMs)
    } catch (error) {
      if (error instanceof HttpError) throw error
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new HttpError(504, 'Google took too long to resolve this link. Please try again.')
      }
      throw new HttpError(502, 'Could not resolve this Google link. Please try another Maps Share link.')
    }
    reviewUrl = toWriteReviewUrl(resolvedUrl)
  }

  if (!reviewUrl) {
    throw new HttpError(422, 'Could not identify the business. Paste its Google Maps Share link.')
  }

  return {
    reviewUrl,
    businessName: extractBusinessName(resolvedUrl),
  }
}
