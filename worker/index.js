// Worker entry: handles /api/* and hands everything else to the static assets.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

// Score levels, low to high. Jev returns the level index (0-4); the client shows it as 1-5.
const HOG_LEVELS = [
  'Not even an animal.',
  'An animal, but not a pig.',
  'Possibly a pig, if you squint.',
  'Clearly a pig.',
  'A masterpiece drawing of a pig.',
]

async function rateHog(request, env) {
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  if (request.headers.get('Content-Type') !== 'image/png') return new Response(null, { status: 415 })

  const image = await request.arrayBuffer()
  if (image.byteLength === 0 || image.byteLength > MAX_IMAGE_BYTES) return new Response(null, { status: 413 })

  const ref = crypto.randomUUID()
  const body = new FormData()
  body.append('request', new Blob([JSON.stringify({
    model: 'jev-latest',
    state: { drawing: ref },
    assets: { [ref]: { type: 'image', part: 'drawing' } },
    questions: {
      hog: {
        type: 'score',
        instructions: 'How good a drawing of a pig is `drawing`?',
        criteria: HOG_LEVELS,
      },
    },
  })], { type: 'application/json' }))
  body.append('drawing', new Blob([image], { type: 'image/png' }), 'drawing.png')

  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
      'TypeSafe-Danger-Zone-Images': 'true',
    },
    body,
  })
  if (!res.ok) {
    console.error('Jev request failed', res.status, await res.text())
    return new Response(null, { status: 502 })
  }

  const { answers } = await res.json()
  return Response.json({ score: answers.hog.score + 1 })
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/rate-hog') return rateHog(request, env)
    return env.ASSETS.fetch(request)
  },
}
