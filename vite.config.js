import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { generateReviewDraft } from './server/gemini-service.js'
import { resolveReviewLink } from './server/review-service.js'

function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 10_000) throw Object.assign(new Error('Request is too large.'), { status: 413 })
  }
  try {
    return body ? JSON.parse(body) : {}
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })
  }
}

function localApiPlugin(environment) {
  return {
    name: 'local-review-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url, 'http://localhost')

        try {
          if (requestUrl.pathname === '/api/resolve-review') {
            if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' })
            const result = await resolveReviewLink(requestUrl.searchParams.get('url'))
            return sendJson(response, 200, result)
          }

          if (requestUrl.pathname === '/api/generate-review') {
            if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' })
            const body = await readJsonBody(request)
            const review = await generateReviewDraft(
              { businessName: body.businessName, variation: body.variation },
              { apiKey: environment.GEMINI_API_KEY, model: environment.GEMINI_MODEL },
            )
            return sendJson(response, 200, { review })
          }
        } catch (error) {
          return sendJson(response, error.status || 500, {
            error: error.message || 'The local API could not complete the request.',
          })
        }

        return next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localApiPlugin(environment)],
  }
})
