# Google Review Auto-Submitter - Urban Company City Office

## What This Does

When a customer scans the QR code:
1. They see a beautiful animated page with **5 stars pre-filled**
2. They tap **"Submit Review on Google"**
3. Confetti animation plays, then they're redirected to Google's review page
4. On Google, the review dialog is already open — they just type (optional) and hit **Post**!

## Files

| File | Purpose |
|------|---------|
| `index.html` | The main review page customers see after scanning QR |
| `qr-code.html` | QR code display page (print this and place at your shop) |
| `qr-generator.html` | Paste a Google review link and generate a printable QR code |

## Setup Instructions

### Option 1: Quick (No hosting needed)
1. Host this folder on an HTTPS website, then open `qr-generator.html` in a browser
2. Paste your Google Business review link and generate the QR code
3. Print the QR code. It opens `index.html` first, then the customer copies the message and opens Google.

Or open `qr-code.html` to print the already configured QR code.

### Option 2: Full Experience (Recommended - with hosted page)
1. Host `index.html` on any web server (GitHub Pages, Netlify, Vercel, etc.)
2. Update the QR code URL in `qr-code.html` to point to your hosted `index.html`
3. Print and display the QR code at your business

### Free Hosting Options:
- **GitHub Pages**: Push to a GitHub repo, enable Pages in settings
- **Netlify**: Drag and drop the folder at netlify.com/drop
- **Vercel**: Connect your repo or upload files

## Important Notes

- **Google requires users to manually submit reviews** — this is by design
- The page pre-fills 5 stars visually and gets them excited to review
- Users can change the star rating if they want (interactive stars)
- The actual submission happens on Google's platform

## Customization

### Change the business name:
Edit the `<h1 class="business-name">` in `index.html`

### Change default star rating:
Remove `active` class from stars you don't want pre-filled

### Enable auto-redirect (skip button click):
Uncomment the last line in the `<script>` section of `index.html`:
```js
setTimeout(() => { handleSubmit(new Event('click')); }, 3000);
```

## Review URL
```
https://search.google.com/local/writereview?placeid=ChIJwcYbOADlDDkRYcVCmvGzpJw
```

If the above doesn't work, use the direct Maps link:
```
https://maps.app.goo.gl/rY6PYESZgmCPh4sj9
```
