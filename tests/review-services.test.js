import { describe, expect, it } from 'bun:test'
import {
  extractBusinessName,
  isAllowedGoogleInputUrl,
  isSafeReviewUrl,
  sanitizeBusinessName,
  toWriteReviewUrl,
} from '../shared/review-links.js'
import { generateReviewDraft } from '../server/gemini-service.js'
import { resolveReviewLink } from '../server/review-service.js'

describe('Google review URL validation', () => {
  it('accepts supported Google input hosts only over HTTPS', () => {
    expect(isAllowedGoogleInputUrl('https://maps.app.goo.gl/example')).toBe(true)
    expect(isAllowedGoogleInputUrl('http://maps.app.goo.gl/example')).toBe(false)
    expect(isAllowedGoogleInputUrl('https://maps.app.goo.gl.evil.example/example')).toBe(false)
  })

  it('accepts only direct Google review URLs on the customer page', () => {
    expect(isSafeReviewUrl('https://search.google.com/local/writereview?placeid=ChIJ-example')).toBe(true)
    expect(isSafeReviewUrl('https://www.google.com/maps/place//data=!4m3!3m2!1s0x1:0x2!12e1')).toBe(true)
    expect(isSafeReviewUrl('https://www.google.com/maps/place/example')).toBe(false)
    expect(isSafeReviewUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeReviewUrl('https://example.com/review')).toBe(false)
  })

  it('converts place IDs and Maps data IDs to direct review links', () => {
    expect(toWriteReviewUrl('https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJ-test'))
      .toBe('https://search.google.com/local/writereview?placeid=ChIJ-test')
    expect(toWriteReviewUrl('https://www.google.com/maps/place/Test/data=!4m2!3m1!1s0x1:0x2'))
      .toBe('https://www.google.com/maps/place//data=!4m3!3m2!1s0x1:0x2!12e1')
  })

  it('extracts and sanitizes business names', () => {
    expect(extractBusinessName('https://www.google.com/maps/place/Cr%C3%A8me+Castle/data=!4m2')).toBe('Crème Castle')
    expect(sanitizeBusinessName('  Test\nBusiness  ')).toBe('TestBusiness')
  })
})

describe('Google link resolution', () => {
  it('follows allowed redirects and returns a business-specific result', async () => {
    const finalUrl = 'https://www.google.com/maps/place/Creme+Castle/data=!4m2!3m1!1s0x1:0x2'
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return calls === 1
        ? new Response(null, { status: 302, headers: { location: finalUrl } })
        : new Response(null, { status: 200 })
    }

    await expect(resolveReviewLink('https://maps.app.goo.gl/example', { fetchImpl }))
      .resolves.toEqual({
        reviewUrl: 'https://www.google.com/maps/place//data=!4m3!3m2!1s0x1:0x2!12e1',
        businessName: 'Creme Castle',
      })
  })

  it('blocks redirects away from Google', async () => {
    const fetchImpl = async () => new Response(null, {
      status: 302,
      headers: { location: 'https://example.com/phishing' },
    })

    await expect(resolveReviewLink('https://maps.app.goo.gl/example', { fetchImpl }))
      .rejects.toMatchObject({ status: 422 })
  })
})

describe('Gemini review generation', () => {
  it('keeps the key server-side and returns cleaned text', async () => {
    let capturedOptions
    const fetchImpl = async (_url, options) => {
      capturedOptions = options
      return Response.json({
        candidates: [{ content: { parts: [{ text: '“I had a pleasant experience with Creme Castle and appreciated the helpful service throughout my visit.”\n' }] } }],
      })
    }

    const review = await generateReviewDraft(
      { businessName: 'Creme Castle', variation: 'test' },
      { apiKey: 'server-secret', fetchImpl },
    )

    expect(review).toBe('I had a pleasant experience with Creme Castle and appreciated the helpful service throughout my visit.')
    expect(capturedOptions.headers['x-goog-api-key']).toBe('server-secret')
  })

  it('fails clearly when Gemini is not configured', async () => {
    await expect(generateReviewDraft(
      { businessName: 'Test Business' },
      { apiKey: '' },
    )).rejects.toMatchObject({ status: 503 })
  })
})
