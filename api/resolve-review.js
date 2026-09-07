import { getClientIp, takeRateLimit } from '../server/rate-limit.js'
import { resolveReviewLink } from '../server/review-service.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })

  const rate = takeRateLimit(`resolve:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 })
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining))
  if (!rate.allowed) return response.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' })

  const input = Array.isArray(request.query.url) ? request.query.url[0] : request.query.url
  try {
    return response.status(200).json(await resolveReviewLink(input))
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || 'Could not prepare the review link.' })
  }
}
