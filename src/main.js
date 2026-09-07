import './style.css'

const params = new URLSearchParams(location.search)
const escape = (text) => { const node = document.createElement('div'); node.textContent = text; return node.innerHTML }
const app = document.querySelector('#app')

function showReview() {
  const business = params.get('business') || 'Your Business'
  const url = params.get('review') || ''
  const message = `Excellent service! Very professional and timely. The team was courteous and did a fantastic job. Highly recommend ${business} for anyone looking for quality service. 👍`
  document.title = `Review ${business}`
  app.innerHTML = `<main class="page"><section class="card review"><div class="google">G</div><h1>${escape(business)}</h1><p class="subtitle">Thank you! Share your experience with ${escape(business)}</p><div class="stars">★★★★★</div><p class="label">YOUR REVIEW MESSAGE</p><p class="message">${escape(message)}</p><button class="copy" id="copy">📋 Tap to Copy Message</button><p class="then">then</p><a class="primary" id="open" href="${escape(url)}">⭐ Open Google Review &amp; Paste</a><p class="hint">On Google, choose your rating, tap the text box, paste, then post.</p></section></main>`
  const copy = async () => { try { await navigator.clipboard.writeText(message); document.querySelector('#copy').textContent = '✓ Copied! Now tap below' } catch { window.prompt('Copy this review message:', message) } }
  document.querySelector('#copy').onclick = copy
  document.querySelector('#open').onclick = () => navigator.clipboard?.writeText(message).catch(() => {})
}

function showGenerator() {
  app.innerHTML = `<main class="page"><section class="card"><h1>Google Review QR Generator</h1><p class="subtitle">Create a QR code that opens your review card before sending customers to Google.</p><label>Business name<input id="business" placeholder="Spice Garden" required></label><label>Google review or business link<input id="reviewUrl" type="url" placeholder="https://maps.app.goo.gl/..." required></label><button class="primary" id="generate">Generate QR Code</button><p class="error" id="error" role="alert"></p><section id="result" hidden><h2 id="name"></h2><img id="qr" alt="Review QR code"><button class="copy" onclick="window.print()">Print QR Code</button></section></section></main>`
  document.querySelector('#generate').onclick = () => {
    const business = document.querySelector('#business').value.trim(), rawUrl = document.querySelector('#reviewUrl').value.trim(), error = document.querySelector('#error')
    error.textContent = ''
    if (!business) return error.textContent = 'Enter the business name.'
    let review; try { review = new URL(rawUrl) } catch { return error.textContent = 'Paste a valid Google review link.' }
    if (review.protocol !== 'https:') return error.textContent = 'Use an https:// link.'
    const landing = new URL(location.href); landing.search = ''; landing.searchParams.set('business', business); landing.searchParams.set('review', review.href)
    document.querySelector('#name').textContent = `Review ${business}`
    document.querySelector('#qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=12&data=${encodeURIComponent(landing.href)}`
    document.querySelector('#result').hidden = false
  }
}

params.has('review') ? showReview() : showGenerator()