const stores = globalThis.__googleReviewRateLimits || new Map()
globalThis.__googleReviewRateLimits = stores

export function takeRateLimit(key, { limit, windowMs }) {
  const now = Date.now()
  const current = stores.get(key)
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current

  bucket.count += 1
  stores.set(key, bucket)

  if (stores.size > 1000) {
    for (const [storedKey, value] of stores) {
      if (value.resetAt <= now) stores.delete(storedKey)
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  }
}

export function getClientIp(request) {
  const forwarded = request.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return request.socket?.remoteAddress || 'unknown'
}
