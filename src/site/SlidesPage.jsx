import { capTrim, wipeUnderline } from './styles.js'

// Every PDF dropped into ./presentations is listed automatically. File names are "Title - Subtitle.pdf"
// (split on the first " - "; the subtitle is optional). Thumbnails of each first page are rendered at
// build time by vite-plugins/pdfThumbnail.js.
const pdfUrls = import.meta.glob('./presentations/*.pdf', { query: '?url', import: 'default', eager: true })
const thumbnails = import.meta.glob('./presentations/*.pdf', { query: '?thumbnail', import: 'default', eager: true })

function parseName(file) {
  const name = file.split('/').pop().replace(/\.pdf$/i, '')
  const match = name.match(/^(.*?)\s+-\s+(.*)$/) ?? name.match(/^(.*?)-(.*)$/)
  return match ? { title: match[1].trim(), subtitle: match[2].trim() } : { title: name.trim(), subtitle: '' }
}

const PRESENTATIONS = Object.keys(pdfUrls)
  .map((file) => ({ file, url: pdfUrls[file], thumbnail: thumbnails[file], ...parseName(file) }))
  .sort((a, b) => a.title.localeCompare(b.title))

function Presentation({ title, subtitle, url, thumbnail }) {
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col gap-5 py-8 outline-none sm:flex-row sm:items-start sm:gap-8 lg:py-10"
      >
        <div className="aspect-video w-full shrink-0 overflow-hidden border-2 border-current bg-white sm:w-56 lg:w-72">
          <img src={thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <h2 className={`text-2xl sm:text-3xl ${capTrim}`}>
            <span className={wipeUnderline}>{title}</span>
          </h2>
          {subtitle && <p className="mt-2 text-lg sm:mt-3 sm:text-xl">{subtitle}</p>}
          <span className="sr-only">(PDF, opens in a new tab)</span>
        </div>
      </a>
    </li>
  )
}

function SlidesPage() {
  return (
    <div className="max-w-4xl">
      <header>
        <h1 className="text-5xl lg:text-6xl">Slides</h1>
        <p className="mt-2 text-xl lg:text-2xl">From talks and presentations I've given</p>
      </header>

      {PRESENTATIONS.length ? (
        <ul className="mt-10 divide-y-2 divide-current border-y-2 border-current lg:mt-12">
          {PRESENTATIONS.map((p) => (
            <Presentation key={p.file} {...p} />
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-lg">Nothing to see here yet. Check back soon.</p>
      )}
    </div>
  )
}

export default SlidesPage
