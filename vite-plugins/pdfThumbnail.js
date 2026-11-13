// Vite plugin: `import thumb from './deck.pdf?thumbnail'` renders the PDF's first page to a WebP at
// build/dev time and returns its URL, so visitors never download the whole PDF just to see a preview.
// Rendered images are cached by content hash in node_modules/.cache, so unchanged PDFs aren't re-rendered.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createCanvas } from '@napi-rs/canvas'

const QUERY = '?thumbnail'
const CACHE_VERSION = 1

export default function pdfThumbnail({ width = 960, quality = 85 } = {}) {
  let cacheDir
  let pdfjsDir

  return {
    name: 'pdf-thumbnail',
    // Runs before Vite's asset plugin, which would otherwise claim `.pdf` ids.
    enforce: 'pre',

    configResolved(config) {
      cacheDir = path.join(config.root, 'node_modules', '.cache', 'pdf-thumbnails')
      pdfjsDir = path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))
    },

    async load(id) {
      if (!id.endsWith(QUERY)) return null
      const file = id.slice(0, -QUERY.length)
      this.addWatchFile(file)

      const data = await readFile(file)
      const key = createHash('sha1').update(`${CACHE_VERSION}:${width}:${quality}:`).update(data).digest('hex')
      const out = path.join(cacheDir, `${path.basename(file, '.pdf')}.${key.slice(0, 16)}.webp`)

      try {
        await access(out)
      } catch {
        await mkdir(cacheDir, { recursive: true })
        await writeFile(out, await renderFirstPage(data, width, quality, pdfjsDir))
      }

      // Hand the image back to Vite as an ordinary asset import, so it's hashed and emitted like any other.
      return `import url from ${JSON.stringify(out.replaceAll('\\', '/'))}\nexport default url\n`
    },
  }
}

async function renderFirstPage(data, width, quality, pdfjsDir) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({
    data: new Uint8Array(data),
    // pdf.js insists on a trailing forward slash here, even on Windows.
    standardFontDataUrl: `${pdfjsDir.replaceAll('\\', '/')}/standard_fonts/`,
    cMapUrl: `${pdfjsDir.replaceAll('\\', '/')}/cmaps/`,
    verbosity: 0,
  })

  try {
    const doc = await task.promise
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: width / base.width })
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height))
    const ctx = canvas.getContext('2d')
    // Slides without a background would otherwise come out transparent (and black-on-black in dark mode).
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas.encode('webp', quality)
  } finally {
    await task.destroy()
  }
}
