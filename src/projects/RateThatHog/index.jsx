import { useEffect, useRef, useState } from 'react'
import { ReactSketchCanvas } from 'react-sketch-canvas'
import cursorSvg from './assets/cursor.svg?raw'
import meterUrl from './assets/Meter.svg'
import meterAngryUrl from './assets/Meter_Angry.svg'
import eraserSvg from './assets/eraser.svg?raw'
import pencilSvg from './assets/pencil.svg?raw'
import stamp0Url from './assets/Stamp_0.svg'
import stamp1Url from './assets/Stamp_1.svg'
import stamp2Url from './assets/Stamp_2.svg'
import stamp3Url from './assets/Stamp_3.svg'
import stamp4Url from './assets/Stamp_4.svg'
import stamp5Url from './assets/Stamp_5.svg'
import titleUrl from './assets/Title.svg'

const SIZE = 512
// Toolbar + canvas + meter, plus the page padding. Phones lay the page out this wide and scale it
// down to fit the screen, rather than clipping the drawing row.
const PAGE_WIDTH = 860
const HOG_PINK = '#ffa1e0'
const NUMBER_FONT = '"Delicious Handrawn"'
const PALETTE = [
  '#000000', '#7f7f7f', '#ffffff', HOG_PINK,
  '#e53935', '#fb8c00', '#fdd835', '#43a047',
  '#1e88e5', '#8e24aa', '#6d4c41', '#c2185b',
]

// The worker's score when Jev decides the drawing isn't a pig at all; otherwise scores are 1-5.
const NOT_A_PIG = -1

function formatScore(score) {
  return score === NOT_A_PIG ? String(NOT_A_PIG) : score.toFixed(1)
}

async function rateDrawing(dataUrl) {
  const image = await (await fetch(dataUrl)).blob()
  const res = await fetch('/api/rate-hog', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image })
  if (!res.ok) throw new Error(`rate-hog failed: ${res.status}`)
  return await res.json()
}

// The Illustrator SVGs only have a viewBox, and browsers won't draw an SVG to a canvas or use it
// as a cursor without an intrinsic size, so give it one.
function sizeSvg(svg, width, height) {
  return svg.replace('<svg ', `<svg width="${width}" height="${height}" `)
}

async function loadSvgImage(url, width, height) {
  const svg = sizeSvg(await (await fetch(url)).text(), width, height)
  const image = new Image()
  image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  await image.decode()
  URL.revokeObjectURL(image.src)
  return image
}

// A CSS cursor from an icon SVG of size viewW x viewH, drawn `width` px wide and rotated `degrees`
// clockwise, with the hotspot at `hot` (viewBox units).
function svgCursor(svg, viewW, viewH, width, [hotX, hotY], fallback, degrees = 0) {
  const scale = width / viewW
  const w = width
  const h = viewH * scale
  // Grow the cursor image to the rotated icon's bounding box and turn the icon about its centre.
  const rad = (degrees * Math.PI) / 180
  const boxW = Math.ceil(w * Math.abs(Math.cos(rad)) + h * Math.abs(Math.sin(rad)))
  const boxH = Math.ceil(w * Math.abs(Math.sin(rad)) + h * Math.abs(Math.cos(rad)))
  const icon = sizeSvg(svg.replace(/<\?xml[^>]*\?>/, ''), w, h)
  const cursor = `<svg xmlns="http://www.w3.org/2000/svg" width="${boxW}" height="${boxH}">`
    + `<g transform="translate(${boxW / 2} ${boxH / 2}) rotate(${degrees}) translate(${-w / 2} ${-h / 2})">${icon}</g></svg>`
  // Rotate the hotspot the same way.
  const dx = hotX * scale - w / 2
  const dy = hotY * scale - h / 2
  const x = Math.round(boxW / 2 + dx * Math.cos(rad) - dy * Math.sin(rad))
  const y = Math.round(boxH / 2 + dx * Math.sin(rad) + dy * Math.cos(rad))
  return `url("data:image/svg+xml,${encodeURIComponent(cursor)}") ${x} ${y}, ${fallback}`
}

// Hotspots: the snout's centre, the pencil's tip, and the middle of the eraser's rubbing edge.
const PAGE_CURSOR = svgCursor(cursorSvg, 69.4, 34.9, 32, [34.7, 17.5], 'auto')
// Over buttons and inputs, the snout tilts; pressing the mouse tilts it back 20 degrees
// (flat over a button, the other way anywhere else).
const HOVER_CURSOR = svgCursor(cursorSvg, 69.4, 34.9, 32, [34.7, 17.5], 'pointer', 20)
const PRESS_CURSOR = svgCursor(cursorSvg, 69.4, 34.9, 32, [34.7, 17.5], 'auto', -20)
const PENCIL_CURSOR = svgCursor(pencilSvg, 80.1, 87, 32, [5, 86], 'crosshair')
const ERASER_CURSOR = svgCursor(eraserSvg, 77.3, 79.6, 32, [18, 74], 'crosshair')

// One stamp per rating, picked by rounding the score up. Stamp_0 is for drawings that aren't a pig at all.
const STAMP_URLS = [stamp0Url, stamp1Url, stamp2Url, stamp3Url, stamp4Url, stamp5Url]

// Stamp_N.svg geometry, in their shared viewBox units (332 x 270.3): the score sits left of the slash, the 5 right of it.
const STAMP = { width: 332, height: 270.3, scoreRight: 157, outOfLeft: 195, middle: 141, fontSize: 80 }

// Draws the stamp `width` wide, rotated by `degrees` (negative is counterclockwise), tucked into the top left `margin` px from the edges.
function drawStamp(ctx, stamp, score, { width, degrees, margin }) {
  const scale = width / STAMP.width
  const w = width
  const h = STAMP.height * scale
  // Half the rotated stamp's bounding box, so the corners stay inside the margin.
  const rad = (degrees * Math.PI) / 180
  const halfW = (w * Math.abs(Math.cos(rad)) + h * Math.abs(Math.sin(rad))) / 2
  const halfH = (w * Math.abs(Math.sin(rad)) + h * Math.abs(Math.cos(rad))) / 2

  ctx.save()
  ctx.translate(margin + halfW, margin + halfH)
  ctx.rotate(rad)
  ctx.translate(-w / 2, -h / 2)
  ctx.drawImage(stamp, 0, 0, w, h)
  ctx.font = `${STAMP.fontSize * scale}px ${NUMBER_FONT}`
  ctx.fillStyle = HOG_PINK
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'right'
  ctx.fillText(formatScore(score), STAMP.scoreRight * scale, STAMP.middle * scale)
  ctx.textAlign = 'left'
  ctx.fillText('5', STAMP.outOfLeft * scale, STAMP.middle * scale)
  ctx.restore()
}

function RateThatHog() {
  const canvasRef = useRef(null)
  const nextId = useRef(0)
  // Ids of the strokes currently on the canvas, oldest first (mirrors the canvas undo stack).
  const strokes = useRef([])
  // Every graph point refers to a stroke id; undo re-appends the id of the stroke it falls back to.
  const [graph, setGraph] = useState([])
  const [scores, setScores] = useState({})
  // Stroke ids Jev thinks were drawn with automated software.
  const [automated, setAutomated] = useState({})
  const [color, setColor] = useState('#000000')
  const [erasing, setErasing] = useState(false)

  // index.html's viewport is shared with the other projects, so swap it only while this page is up.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta.content
    meta.content = `width=${PAGE_WIDTH}, user-scalable=no`
    return () => { meta.content = original }
  }, [])

  async function handleStroke() {
    const id = nextId.current++
    strokes.current.push(id)
    setGraph(g => [...g, id])
    try {
      const dataUrl = await canvasRef.current.exportImage('png', { width: SIZE, height: SIZE })
      const res = await rateDrawing(dataUrl)
      // "Not a pig" replies leave out automated.
      setAutomated(a => ({ ...a, [id]: res.automated === true }))
      setScores(s => ({ ...s, [id]: res.score }))
    } catch (err) {
      console.error(err)
    }
  }

  // Dev only: adds a graph point with a fake Jev score after a random delay, so replies can land out of order.
  // One in five fakes is "not a pig".
  function addFakeScore() {
    const id = nextId.current++
    setGraph(g => [...g, id])
    const score = Math.random() < 0.2 ? NOT_A_PIG : 1 + Math.random() * 4
    setTimeout(() => setScores(s => ({ ...s, [id]: score })), 200 + Math.random() * 1000)
  }

  // Downloads the drawing as a PNG with the latest score stamped in the top left.
  async function exportDrawing() {
    const image = new Image()
    image.src = await canvasRef.current.exportImage('png', { width: SIZE, height: SIZE })
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    if (latest !== undefined) {
      const [stamp] = await Promise.all([
        loadSvgImage(STAMP_URLS[Math.min(5, Math.max(0, Math.ceil(latest)))], STAMP.width, STAMP.height),
        document.fonts.load(`16px ${NUMBER_FONT}`),
      ])
      drawStamp(ctx, stamp, latest, { width: 100, degrees: -20, margin: 4 })
    }

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'rate-that-hog.png'
    link.click()
  }

  function undo() {
    if (strokes.current.length === 0) return
    canvasRef.current.undo()
    strokes.current.pop()
    const previous = strokes.current.at(-1)
    if (previous !== undefined) setGraph(g => [...g, previous])
  }

  function clear() {
    canvasRef.current.resetCanvas()
    strokes.current = []
    setGraph([])
    setScores({})
    setAutomated({})
  }

  function setEraser(on) {
    canvasRef.current.eraseMode(on)
    setErasing(on)
  }

  function pickColor(value) {
    setColor(value)
    setEraser(false)
  }

  const points = graph.map(id => scores[id])
  // Latest response in stroke order; a slow reply to an older stroke never replaces a newer one.
  const latest = points.findLast(score => score !== undefined)
  const latestAutomated = automated[graph.findLast(id => scores[id] !== undefined)] ?? false

  return (
    <div
      className={[
        'min-h-screen flex flex-col items-center justify-center gap-6 p-4',
        // Blocks pinch zoom where browsers ignore user-scalable=no (iOS Safari).
        'touch-pan-x touch-pan-y',
        // While the mouse is down the whole page is :active; the drawing area sets its own cursor inline.
        'cursor-(--page-cursor) active:cursor-(--press-cursor)',
        '[&_:is(button,input)]:cursor-(--hover-cursor) [&_:is(button,input):active]:cursor-(--page-cursor)',
      ].join(' ')}
      style={{ '--page-cursor': PAGE_CURSOR, '--hover-cursor': HOVER_CURSOR, '--press-cursor': PRESS_CURSOR }}
    >
      <h1><img src={titleUrl} alt="Rate That Hog" className="h-48" /></h1>
      {/* Wraps the score + graph below the drawing when there's no room beside it. */}
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 w-16">
            <div className="grid grid-cols-2 gap-1">
              {PALETTE.map(swatch => (
                <button
                  key={swatch}
                  aria-label={swatch}
                  className={`h-7 border ${!erasing && color === swatch ? 'outline-2 outline-offset-1' : ''}`}
                  style={{ background: swatch }}
                  onClick={() => pickColor(swatch)}
                />
              ))}
            </div>
            <input type="color" className="w-full h-8" value={color} onChange={e => pickColor(e.target.value)} />
            <button className={`border px-2 ${!erasing ? 'font-bold' : ''}`} onClick={() => setEraser(false)}>Pen</button>
            <button className={`border px-2 ${erasing ? 'font-bold' : ''}`} onClick={() => setEraser(true)}>Eraser</button>
            <button className="border px-2" onClick={undo}>Undo</button>
            <button className="border px-2" onClick={clear}>Clear</button>
            {import.meta.env.DEV && <button className="border px-2" onClick={addFakeScore}>Fake</button>}
            {/* The toolbar stretches to the canvas height, so mt-auto pins this to the canvas bottom. */}
            <button className="mt-auto border px-2 bg-black text-white" onClick={exportDrawing}>Save hog</button>
          </div>
          <div style={{ cursor: erasing ? ERASER_CURSOR : PENCIL_CURSOR }}>
            <ReactSketchCanvas
              ref={canvasRef}
              width={`${SIZE}px`}
              height={`${SIZE}px`}
              canvasColor="#ffffff"
              strokeColor={color}
              strokeWidth={4}
              eraserWidth={16}
              onStroke={handleStroke}
            />
          </div>
          {/* Part of the drawing group so it doesn't wrap with the graph. */}
          <Meter score={latest} automated={latestAutomated} />
        </div>
        <ScoreGraph points={points} />
      </div>
    </div>
  )
}

// Meter.svg geometry, in its viewBox units (192 x 465.7). The tube is transparent, so the fill
// sits behind the image with its edges tucked under the outlines. The base is already pink.
const METER = {
  width: 192, height: 465.7,
  tubeLeft: 68, tubeRight: 123, tubeTop: 145, tubeBottom: 370,
  // Above the pink base's true centre (407), because the font's digits sit low in their line box.
  scoreX: 95, scoreY: 396,
}

function Meter({ score, automated }) {
  const pct = (value, total) => `${(value / total) * 100}%`
  const angry = score === NOT_A_PIG || automated
  const fill = (Math.max(0, score ?? 0) / 5) * (METER.tubeBottom - METER.tubeTop)

  return (
    <div className="relative" style={{ height: SIZE, width: (SIZE * METER.width) / METER.height }}>
      <div
        className="absolute"
        style={{
          background: HOG_PINK,
          left: pct(METER.tubeLeft, METER.width),
          width: pct(METER.tubeRight - METER.tubeLeft, METER.width),
          bottom: pct(METER.height - METER.tubeBottom, METER.height),
          height: pct(fill, METER.height),
        }}
      />
      {/* Both faces are always loaded so the switch to angry is instant. */}
      <img src={meterUrl} alt="" className={`absolute inset-0 size-full ${angry ? 'invisible' : ''}`} />
      <img src={meterAngryUrl} alt="" className={`absolute inset-0 size-full ${angry ? '' : 'invisible'}`} />
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 leading-none"
        style={{ fontFamily: NUMBER_FONT, fontSize: 90, left: pct(METER.scoreX, METER.width), top: pct(METER.scoreY, METER.height) }}
      >
        {score === undefined ? '' : formatScore(score)}
      </div>
    </div>
  )
}

const GRAPH_HEIGHT = SIZE
const PAD = { left: 24, right: 8, top: 12, bottom: 12 }
// The y axis runs from 0 to 5. A NOT_A_PIG score (-1) plunges below the bottom of the graph on purpose.
const GRAPH_LEVELS = [0, 1, 2, 3, 4, 5]

function ScoreGraph({ points }) {
  const plotWidth = SIZE - PAD.left - PAD.right
  const plotHeight = GRAPH_HEIGHT - PAD.top - PAD.bottom
  // Trailing points still awaiting a score take no room, so the graph only moves once a score arrives.
  const span = points.findLastIndex(score => score !== undefined)
  const x = i => PAD.left + (span > 0 ? (i / span) * plotWidth : 0)
  const y = score => PAD.top + ((5 - score) / 5) * plotHeight
  // Pending (or failed) points are skipped; the line joins the scores we have.
  const known = points.flatMap((score, i) => (score === undefined ? [] : [[x(i), y(score)]]))

  return (
    <svg width={SIZE} height={GRAPH_HEIGHT} overflow="visible" className="text-current">
      {GRAPH_LEVELS.map(level => (
        <g key={level}>
          <line x1={PAD.left} x2={SIZE - PAD.right} y1={y(level)} y2={y(level)} stroke="currentColor" strokeOpacity={0.15} />
          <text x={PAD.left - 6} y={y(level)} textAnchor="end" dominantBaseline="middle" fontSize={20} fontFamily={NUMBER_FONT} fill="currentColor" fillOpacity={0.6}>{level}</text>
        </g>
      ))}
      <polyline points={known.map(p => p.join(',')).join(' ')} fill="none" stroke={HOG_PINK} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default RateThatHog
