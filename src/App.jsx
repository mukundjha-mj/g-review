import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import './App.css'
import { isSafeReviewUrl, sanitizeBusinessName } from '../shared/review-links.js'

const fallbackOpenings = [
  'I had a positive experience with',
  'I appreciated my experience with',
  'My overall experience with',
]

function fallbackReview(businessName) {
  const name = businessName || 'this business'
  const opening = fallbackOpenings[Math.floor(Math.random() * fallbackOpenings.length)]
  return `${opening} ${name}. The service felt helpful and the overall process was smooth. I appreciated the experience and would consider visiting again.`
}

function ClipboardIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 5.5h6M9.5 3h5a1 1 0 0 1 1 1v2h-7V4a1 1 0 0 1 1-1Z"/><path d="M7 5h10a2 2 0 0 1 2 2v12H5V7a2 2 0 0 1 2-2Z"/></svg>
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg>
}

function PrintIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const helper = document.createElement('textarea')
  helper.value = text
  helper.setAttribute('readonly', '')
  helper.style.position = 'fixed'
  helper.style.opacity = '0'
  document.body.appendChild(helper)
  helper.select()
  helper.setSelectionRange(0, helper.value.length)
  const copied = document.execCommand('copy')
  helper.remove()
  if (!copied) throw new Error('Clipboard unavailable')
}

function ReviewCard({ reviewUrl, businessName }) {
  const [reviewMessage, setReviewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  const generateReview = async () => {
    setLoading(true)
    setNotice('')
    setCopied(false)

    try {
      const response = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          businessName,
          variation: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.review) throw new Error(data.error || 'AI suggestion unavailable.')
      setReviewMessage(data.review)
    } catch {
      setReviewMessage(fallbackReview(businessName))
      setNotice('AI is temporarily unavailable, so an editable starter was provided.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateReview()
    // A new card visit should request one fresh suggestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyReview = async () => {
    if (!reviewMessage.trim()) {
      setNotice('Wait for the review suggestion before copying.')
      return false
    }

    try {
      await writeClipboard(reviewMessage.trim())
      setCopied(true)
      setNotice('Review copied. You can now open Google and paste it.')
      return true
    } catch {
      setCopied(false)
      setNotice('Copying was blocked. Select and copy the review text manually before opening Google.')
      return false
    }
  }

  const openReview = async () => {
    if (await copyReview()) window.location.assign(reviewUrl)
  }

  const title = businessName ? `Review ${businessName}` : 'Share your review'

  return <main className="page">
    <section className="card review" aria-labelledby="review-title">
      <div className="google" aria-hidden="true">G</div>
      <h1 id="review-title">{title}</h1>
      <p className="subtitle">Use this editable suggestion only if it matches your real experience.</p>
      <div className="stars" aria-hidden="true">★★★★★</div>
      <label className="review-label" htmlFor="review-message">Your review suggestion</label>
      <textarea
        id="review-message"
        className="message"
        value={reviewMessage}
        onChange={(event) => { setReviewMessage(event.target.value); setCopied(false) }}
        placeholder={loading ? 'Creating a fresh review suggestion…' : 'Write about your experience…'}
        maxLength="500"
        rows="5"
        disabled={loading}
      />
      <p className="character-count">{reviewMessage.length}/500</p>
      <button className="secondary" type="button" onClick={copyReview} disabled={loading}>
        <ClipboardIcon />{copied ? 'Copied — ready for Google' : 'Copy review'}
      </button>
      <button className="text-button" type="button" onClick={generateReview} disabled={loading}>
        {loading ? 'Generating suggestion…' : 'Try another suggestion'}
      </button>
      <button className="primary" type="button" onClick={openReview} disabled={loading}>
        Copy &amp; open Google Review
      </button>
      <p className="status" aria-live="polite">{notice}</p>
      <p className="hint">On Google, choose your honest rating, paste the text, review it, and post.</p>
    </section>
  </main>
}

function InvalidReviewLink() {
  return <main className="page">
    <section className="card" aria-labelledby="invalid-title">
      <div className="google" aria-hidden="true">G</div>
      <h1 id="invalid-title">This review link is not valid</h1>
      <p className="subtitle">For your safety, this page opens only verified Google review links.</p>
      <a className="primary" href={window.location.pathname}>Create a new QR code</a>
    </section>
  </main>
}

function Generator() {
  const [businessUrl, setBusinessUrl] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    let inputUrl
    try {
      inputUrl = new URL(businessUrl.trim())
    } catch {
      return setError('Paste a complete Google Maps link, starting with https://.')
    }
    if (inputUrl.protocol !== 'https:' || businessUrl.length > 2048) {
      return setError('Use a valid https:// Google link under 2,048 characters.')
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/resolve-review?url=${encodeURIComponent(inputUrl.href)}`, {
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not prepare the review link.')

      const landing = new URL(window.location.href)
      landing.search = ''
      landing.hash = ''
      landing.searchParams.set('review', data.reviewUrl)
      if (data.businessName) landing.searchParams.set('business', data.businessName)

      const qrDataUrl = await QRCode.toDataURL(landing.href, {
        width: 1000,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#17233a', light: '#ffffff' },
      })
      setResult({
        qrDataUrl,
        landingUrl: landing.href,
        businessName: data.businessName,
      })
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }

  return <main className="page">
    <section className="card" aria-labelledby="generator-title">
      <h1 id="generator-title">Google Review QR Generator</h1>
      <p className="subtitle">Paste a Google Maps business link to create a printable review QR code.</p>
      <form onSubmit={generate} noValidate>
        <label htmlFor="business-link">Google Maps business link</label>
        <input
          id="business-link"
          value={businessUrl}
          onChange={(event) => setBusinessUrl(event.target.value)}
          type="url"
          inputMode="url"
          autoComplete="url"
          maxLength="2048"
          placeholder="https://maps.app.goo.gl/..."
          aria-describedby="link-error"
          required
        />
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Preparing review link…' : 'Generate QR code'}
        </button>
      </form>
      <p id="link-error" className="error" role="alert">{error}</p>
      {result && <section className="result" aria-labelledby="qr-title">
        <h2 id="qr-title">QR code ready{result.businessName ? ` for ${result.businessName}` : ''}</h2>
        <img src={result.qrDataUrl} alt={result.businessName ? `Review QR code for ${result.businessName}` : 'Google review QR code'} width="280" height="280" />
        <div className="result-actions">
          <a className="secondary" href={result.qrDataUrl} download="google-review-qr.png">
            <DownloadIcon />Download PNG
          </a>
          <button className="secondary" type="button" onClick={() => window.print()}>
            <PrintIcon />Print QR code
          </button>
        </div>
      </section>}
    </section>
  </main>
}

export default function App() {
  const landing = useMemo(() => {
    const query = new URLSearchParams(window.location.search)
    if (!query.has('review')) return null
    const reviewUrl = query.get('review')
    return {
      reviewUrl,
      businessName: sanitizeBusinessName(query.get('business')),
      valid: isSafeReviewUrl(reviewUrl),
    }
  }, [])

  if (!landing) return <Generator />
  if (!landing.valid) return <InvalidReviewLink />
  return <ReviewCard reviewUrl={landing.reviewUrl} businessName={landing.businessName} />
}
