import { useMemo, useState } from 'react'
import './App.css'

const messageFor = (business) => `Excellent service! Very professional and timely. The team was courteous and did a fantastic job. Highly recommend ${business} for anyone looking for quality service. 👍`

function ReviewCard({ business, reviewUrl }) {
  const [copied, setCopied] = useState(false)
  const message = messageFor(business)
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true) }
    catch { window.prompt('Copy this review message:', message) }
  }
  return <main className="page"><section className="card review"><div className="google">G</div><h1>{business}</h1><p className="subtitle">Thank you! Share your experience with {business}</p><div className="stars">★★★★★</div><p className="label">YOUR REVIEW MESSAGE</p><p className="message">{message}</p><button className="copy" onClick={copy}>{copied ? '✓ Copied! Now tap below' : '📋 Tap to Copy Message'}</button><p className="then">then</p><a className="primary" href={reviewUrl} onClick={() => navigator.clipboard?.writeText(message).catch(() => {})}>⭐ Open Google Review &amp; Paste</a><p className="hint">On Google, choose your rating, tap the text box, paste, then post.</p></section></main>
}

function Generator() {
  const [business, setBusiness] = useState('')
  const [reviewUrl, setReviewUrl] = useState('')
  const [error, setError] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const generate = () => {
    setError('')
    if (!business.trim()) return setError('Enter the business name.')
    let url; try { url = new URL(reviewUrl.trim()) } catch { return setError('Paste a valid Google review link.') }
    if (url.protocol !== 'https:') return setError('Use an https:// link.')
    const landing = new URL(location.href); landing.search = ''; landing.searchParams.set('business', business.trim()); landing.searchParams.set('review', url.href)
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=12&data=${encodeURIComponent(landing.href)}`)
  }
  return <main className="page"><section className="card"><h1>Google Review QR Generator</h1><p className="subtitle">Create a QR code that opens your review card before sending customers to Google.</p><label>Business name<input value={business} onChange={(event) => setBusiness(event.target.value)} placeholder="Spice Garden" /></label><label>Google review or business link<input value={reviewUrl} onChange={(event) => setReviewUrl(event.target.value)} type="url" placeholder="https://maps.app.goo.gl/..." /></label><button className="primary" onClick={generate}>Generate QR Code</button><p className="error" role="alert">{error}</p>{qrUrl && <section className="result"><h2>Review {business}</h2><img src={qrUrl} alt="Review QR code"/><button className="copy" onClick={() => window.print()}>Print QR Code</button></section>}</section></main>
}

export default function App() {
  const query = useMemo(() => new URLSearchParams(location.search), [])
  return query.has('review') ? <ReviewCard business={query.get('business') || 'Your Business'} reviewUrl={query.get('review')} /> : <Generator />
}