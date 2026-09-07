import { sanitizeBusinessName } from '../shared/review-links.js'
import { HttpError } from './http-error.js'

const DEFAULT_MODEL = 'gemini-3.8-flash'

function cleanGeneratedText(value) {
  return String(value || '')
    .replace(/^\s*["“]|["”]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

export async function generateReviewDraft({ businessName, variation }, options = {}) {
  const name = sanitizeBusinessName(businessName) || 'this business'
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY
  const model = options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL
  const fetchImpl = options.fetchImpl || fetch

  if (!apiKey) throw new HttpError(503, 'AI review suggestions are not configured yet.')
  if (!/^[a-z0-9._-]+$/i.test(model)) throw new HttpError(500, 'The configured Gemini model is invalid.')

  const prompt = [
    'Write one short, editable Google review draft for a real customer.',
    `Business name: ${JSON.stringify(name)}.`,
    'Use 28 to 48 words in natural first-person English.',
    'Mention the business name once. Do not mention a star rating.',
    'Do not invent a location, employee name, product, price, or specific event.',
    'Keep the claims general so the customer can edit them to match their real experience.',
    'Return only the review text with no quotation marks, label, or markdown.',
    `Variation token: ${String(variation || '').slice(0, 80)}.`,
  ].join('\n')

  let response
  try {
    response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            thinkingConfig: { thinkingLevel: 'low' },
            maxOutputTokens: 512,
          },
        }),
        signal: AbortSignal.timeout(options.timeoutMs || 12000),
      },
    )
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new HttpError(504, 'Gemini took too long to respond.')
    }
    throw new HttpError(502, 'Gemini could not generate a review suggestion.')
  }

  if (!response.ok) {
    if (response.status === 429) throw new HttpError(429, 'Gemini is busy. Please try again shortly.')
    throw new HttpError(502, 'Gemini could not generate a review suggestion.')
  }

  const data = await response.json()
  const rawReview = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join(' ')
  const review = cleanGeneratedText(rawReview)
  if (review.split(/\s+/).length < 12) {
    throw new HttpError(502, 'Gemini returned an incomplete review suggestion.')
  }
  return review
}
