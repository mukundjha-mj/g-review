import { generateReviewDraft } from '../server/gemini-service.js'
import { getClientIp, takeRateLimit } from '../server/rate-limit.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })

  const rate = takeRateLimit(`generate:${getClientIp(request)}`, { limit: 12, windowMs: 60_000 })
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining))
  if (!rate.allowed) return response.status(429).json({ error: 'Too many review requests. Please wait a minute and try again.' })

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {}
    const review = await generateReviewDraft({
      businessName: body.businessName,
      variation: body.variation,
    })
    return response.status(200).json({ review })
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || 'Could not generate a review suggestion.' })
  }
}
