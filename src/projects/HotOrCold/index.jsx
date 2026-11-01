import { useEffect, useRef, useState } from 'react'
import { ReactSketchCanvas } from 'react-sketch-canvas'
import eraserSvg from './assets/eraser.svg?raw'
import pencilSvg from './assets/pencil.svg?raw'

const SIZE = 512
// Toolbar + canvas, plus the page padding. Phones lay the page out this wide and scale it down to
// fit the screen, rather than clipping the drawing row.
const PAGE_WIDTH = 656

// Scores run from -1 (cold) to +1 (hot).
function formatScore(score) {
  return `${score > 0 ? '+' : ''}${score.toFixed(2)}`
}

// The worker picks the word and only hands back an encrypted token for it, plus its category and
// the word blanked out ("____").
async function fetchWord() {
  const res = await fetch('/api/hot-or-cold/new-word', { method: 'POST' })
  if (!res.ok) throw new Error(`new-word failed: ${res.status}`)
  return await res.json()
}

// Each score comes back with the word blanked out to match it; higher scores show more letters, and
// the player wins when there are no blanks left.
function blanks(pattern) {
  return pattern.split('_').length - 1
}

async function revealWord(wordToken) {
  const res = await fetch('/api/hot-or-cold/reveal', { method: 'POST', headers: { 'X-Word-Token': wordToken } })
  if (!res.ok) throw new Error(`reveal failed: ${res.status}`)
  return (await res.json()).word
}

async function rateDrawing(dataUrl, wordToken) {
  const image = await (await fetch(dataUrl)).blob()
  const res = await fetch('/api/hot-or-cold', {
    method: 'POST',
    headers: { 'Content-Type': 'image/png', 'X-Word-Token': wordToken },
    body: image,
  })
  if (!res.ok) throw new Error(`hot-or-cold failed: ${res.status}`)
  return await res.json()
}

// The Illustrator SVGs only have a viewBox, and browsers won't use an SVG as a cursor without an
// intrinsic size, so give it one.
function sizeSvg(svg, width, height) {
  return svg.replace('<svg ', `<svg width="${width}" height="${height}" `)
}

// A CSS cursor from an icon SVG of size viewW x viewH, drawn `width` px wide, with the hotspot at
// `hot` (viewBox units).
function svgCursor(svg, viewW, viewH, width, [hotX, hotY], fallback) {
  const scale = width / viewW
  const icon = sizeSvg(svg.replace(/<\?xml[^>]*\?>/, ''), width, Math.ceil(viewH * scale))
  return `url("data:image/svg+xml,${encodeURIComponent(icon)}") ${Math.round(hotX * scale)} ${Math.round(hotY * scale)}, ${fallback}`
}

// Hotspots: the pencil's tip and the middle of the eraser's rubbing edge.
const PENCIL_CURSOR = svgCursor(pencilSvg, 80.1, 87, 32, [5, 86], 'crosshair')
const ERASER_CURSOR = svgCursor(eraserSvg, 77.3, 79.6, 32, [18, 74], 'crosshair')

function HotOrCold() {
  const canvasRef = useRef(null)
  const graphArea = useRef(null)
  const graphHeight = useHeight(graphArea)
  const nextId = useRef(0)
  // Strokes currently on the canvas (mirrors the canvas undo stack).
  const strokeCount = useRef(0)
  // Every graph point is a submission id; scores arrive for them out of order.
  const [graph, setGraph] = useState([])
  const [scores, setScores] = useState({})
  const [erasing, setErasing] = useState(false)
  const [autoSubmit, setAutoSubmit] = useState(true)
  // Promise of the current word's { token, category, pattern }, so strokes made while it loads wait for it.
  // Replies that land after a new word was picked are ignored.
  const word = useRef(null)
  const [category, setCategory] = useState(null)
  // The blanked-out word with the most letters showing so far.
  const [pattern, setPattern] = useState(null)
  const [gaveUp, setGaveUp] = useState(false)

  // index.html's viewport is shared with the other projects, so swap it only while this page is up.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta.content
    meta.content = `width=${PAGE_WIDTH}, user-scalable=no`
    return () => { meta.content = original }
  }, [])

  function pickWord() {
    const next = fetchWord()
    word.current = next
    next.then(({ category, pattern }) => {
      if (word.current !== next) return
      setCategory(category)
      setPattern(pattern)
    }, err => console.error(err))
  }

  useEffect(pickWord, [])

  async function submit() {
    const id = nextId.current++
    const current = word.current
    setGraph(g => [...g, id])
    try {
      const dataUrl = await canvasRef.current.exportImage('png', { width: SIZE, height: SIZE })
      const res = await rateDrawing(dataUrl, (await current).token)
      if (word.current !== current) return
      setScores(s => ({ ...s, [id]: res.score }))
      setPattern(p => (p === null || blanks(res.pattern) < blanks(p) ? res.pattern : p))
    } catch (err) {
      console.error(err)
    }
  }

  function handleStroke() {
    strokeCount.current++
    if (autoSubmit) submit()
  }

  // Dev only: adds a graph point with a fake Jev score after a random delay, so replies can land out of order.
  function addFakeScore() {
    const id = nextId.current++
    setGraph(g => [...g, id])
    const score = Math.random() * 2 - 1
    setTimeout(() => setScores(s => ({ ...s, [id]: score })), 200 + Math.random() * 1000)
  }

  function undo() {
    if (strokeCount.current === 0) return
    canvasRef.current.undo()
    strokeCount.current--
    if (autoSubmit && strokeCount.current > 0) submit()
  }

  function clear() {
    canvasRef.current.resetCanvas()
    strokeCount.current = 0
    setGraph([])
    setScores({})
  }

  function newWord() {
    pickWord()
    setCategory(null)
    setPattern(null)
    setGaveUp(false)
    clear()
  }

  // Fills in the whole word.
  async function giveUp() {
    const current = word.current
    try {
      const answer = await revealWord((await current).token)
      if (word.current !== current) return
      setPattern(answer)
      setGaveUp(true)
    } catch (err) {
      console.error(err)
    }
  }

  const won = !gaveUp && pattern !== null && blanks(pattern) === 0

  function setEraser(on) {
    canvasRef.current.eraseMode(on)
    setErasing(on)
  }

  const points = graph.map(id => scores[id])
  // Latest response in submission order; a slow reply to an older submission never replaces a newer one.
  const latest = points.findLast(score => score !== undefined)

  return (
    // Exactly screen height, so there's nothing to scroll unless the screen is too short to fit the
    // drawing. touch-pan blocks pinch zoom where browsers ignore user-scalable=no (iOS Safari).
    <div className="h-dvh overflow-auto flex flex-col items-center gap-4 p-4 touch-pan-x touch-pan-y">
      <h1 className="text-3xl">Hot or Cold</h1>
      {/* Fixed heights so nothing shifts the layout as these fill in. */}
      <div className="flex flex-col items-center gap-2">
        <p className="h-6">{category && `Category: ${category}`}</p>
        <AnswerSlots pattern={pattern ?? ''} />
        <p className="h-6">{won ? 'You got it!' : gaveUp ? 'You gave up.' : ''}</p>
      </div>
      {/* The score + graph sit beside the drawing when the window is wide enough for both, and
          otherwise below it, squashed into whatever height is left. */}
      <div className="flex-1 flex flex-col items-center gap-6 min-[1200px]:flex-row min-[1200px]:justify-center">
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 w-24">
            <button className={`border px-2 ${!erasing ? 'font-bold' : ''}`} onClick={() => setEraser(false)}>Pen</button>
            <button className={`border px-2 ${erasing ? 'font-bold' : ''}`} onClick={() => setEraser(true)}>Eraser</button>
            <button className="border px-2" onClick={undo}>Undo</button>
            <button className="border px-2" onClick={clear}>Clear</button>
            <button className="border px-2" onClick={newWord}>New word</button>
            <button className="border px-2" onClick={giveUp}>Give up</button>
            <label className="flex gap-1 items-center">
              <input type="checkbox" checked={autoSubmit} onChange={e => setAutoSubmit(e.target.checked)} />
              Submit every stroke
            </label>
            {!autoSubmit && <button className="border px-2 bg-black text-white" onClick={submit}>Submit</button>}
            {import.meta.env.DEV && <button className="border px-2" onClick={addFakeScore}>Fake</button>}
          </div>
          <div style={{ cursor: erasing ? ERASER_CURSOR : PENCIL_CURSOR }}>
            <ReactSketchCanvas
              ref={canvasRef}
              width={`${SIZE}px`}
              height={`${SIZE}px`}
              canvasColor="#ffffff"
              strokeColor="#000000"
              strokeWidth={4}
              eraserWidth={16}
              onStroke={handleStroke}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 min-[1200px]:flex-none">
          {/* Fixed height so the first score doesn't shift the layout. */}
          <div className="text-3xl h-9">{latest === undefined ? '' : formatScore(latest)}</div>
          {/* The graph is drawn to this area's height, and positioned absolutely so it can't
              stretch the area it's measured from. */}
          <div
            ref={graphArea}
            className="relative flex-1 min-h-24 min-[1200px]:flex-none min-[1200px]:h-(--size)"
            style={{ width: SIZE, maxHeight: SIZE, '--size': `${SIZE}px` }}
          >
            {graphHeight > 0 && <ScoreGraph points={points} height={graphHeight} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// The height of the element in `ref`, kept up to date as it resizes.
function useHeight(ref) {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return height
}

const isLetter = char => /\p{L}/u.test(char)

// The answer as one slot per letter, empty until revealed, with spaces and hyphens as they are.
function AnswerSlots({ pattern }) {
  return (
    <div className="flex h-9 text-3xl">
      {[...pattern].map((char, i) => {
        if (char === ' ') return <span key={i} className="w-4" />
        if (!isLetter(char) && char !== '_') return <span key={i} className="w-6 text-center">{char}</span>
        return <span key={i} className="w-6 mx-0.5 text-center border-b-2">{char === '_' ? '' : char}</span>
      })}
    </div>
  )
}

const PAD = { left: 40, right: 8, top: 12, bottom: 12 }
const GRAPH_LEVELS = [-1, -0.5, 0, 0.5, 1]

function ScoreGraph({ points, height }) {
  const plotWidth = SIZE - PAD.left - PAD.right
  const plotHeight = height - PAD.top - PAD.bottom
  // Trailing points still awaiting a score take no room, so the graph only moves once a score arrives.
  const span = points.findLastIndex(score => score !== undefined)
  const x = i => PAD.left + (span > 0 ? (i / span) * plotWidth : 0)
  const y = score => PAD.top + ((1 - score) / 2) * plotHeight
  // Pending (or failed) points are skipped; the line joins the scores we have.
  const known = points.flatMap((score, i) => (score === undefined ? [] : [[x(i), y(score)]]))

  return (
    <svg width={SIZE} height={height} overflow="visible" className="absolute inset-0 text-current">
      {GRAPH_LEVELS.map(level => (
        <g key={level}>
          <line x1={PAD.left} x2={SIZE - PAD.right} y1={y(level)} y2={y(level)} stroke="currentColor" strokeOpacity={0.15} />
          <text x={PAD.left - 6} y={y(level)} textAnchor="end" dominantBaseline="middle" fontSize={16} fill="currentColor" fillOpacity={0.6}>{level}</text>
        </g>
      ))}
      <polyline points={known.map(p => p.join(',')).join(' ')} fill="none" stroke="#000000" strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default HotOrCold
