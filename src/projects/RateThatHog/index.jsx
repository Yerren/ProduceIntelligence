import { useRef, useState } from 'react'
import DrawingCanvas from '../shared/DrawingCanvas.jsx'
import ScoreGraph from '../shared/ScoreGraph.jsx'
import { CANVAS_SIZE, postDrawing, sizeSvg, svgCursor, useFixedPageWidth } from '../shared/drawing.js'
import cursorSvg from './assets/cursor.svg?raw'
import meterUrl from './assets/Meter.svg'
import meterAngryUrl from './assets/Meter_Angry.svg'
import stamp0Url from './assets/Stamp_0.svg'
import stamp1Url from './assets/Stamp_1.svg'
import stamp2Url from './assets/Stamp_2.svg'
import stamp3Url from './assets/Stamp_3.svg'
import stamp4Url from './assets/Stamp_4.svg'
import stamp5Url from './assets/Stamp_5.svg'
import titleUrl from './assets/Title.svg'

// Toolbar + canvas + meter, plus the page padding.
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

function rateDrawing(dataUrl) {
  return postDrawing('/api/rate-hog', dataUrl)
}

async function loadSvgImage(url, width, height) {
  const svg = sizeSvg(await (await fetch(url)).text(), width, height)
  const image = new Image()
  image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  await image.decode()
  URL.revokeObjectURL(image.src)
  return image
}


// Hotspot: the snout's centre.
const PAGE_CURSOR = svgCursor(cursorSvg, 69.4, 34.9, 32, [34.7, 17.5], 'auto')
// Over buttons and inputs, the snout tilts; pressing the mouse tilts it back 20 degrees
// (flat over a button, the other way anywhere else).
const HOVER_CURSOR = svgCursor(cursorSvg, 69.4, 34.9, 32, [34.7, 17.5], 'pointer', 20)
const PRESS_CURSOR = svgCursor(cursorSvg, 69.4, 34.9, 32, [34.7, 17.5], 'auto', -20)

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

  useFixedPageWidth(PAGE_WIDTH)

  async function handleStroke() {
    const id = nextId.current++
    strokes.current.push(id)
    setGraph(g => [...g, id])
    try {
      const dataUrl = await canvasRef.current.exportImage('png', { width: CANVAS_SIZE, height: CANVAS_SIZE })
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
    image.src = await canvasRef.current.exportImage('png', { width: CANVAS_SIZE, height: CANVAS_SIZE })
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
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
          <DrawingCanvas ref={canvasRef} erasing={erasing} strokeColor={color} onStroke={handleStroke} />
          {/* Part of the drawing group so it doesn't wrap with the graph. */}
          <Meter score={latest} automated={latestAutomated} />
        </div>
        <ScoreGraph
          points={points}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          levels={GRAPH_LEVELS}
          padLeft={24}
          fontSize={20}
          fontFamily={NUMBER_FONT}
          color={HOG_PINK}
        />
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
    <div className="relative" style={{ height: CANVAS_SIZE, width: (CANVAS_SIZE * METER.width) / METER.height }}>
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

// The y axis runs from 0 to 5. A NOT_A_PIG score (-1) plunges below the bottom of the graph on purpose.
const GRAPH_LEVELS = [0, 1, 2, 3, 4, 5]

export default RateThatHog
