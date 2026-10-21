import { useRef, useState } from 'react'
import { ReactSketchCanvas } from 'react-sketch-canvas'

const SIZE = 512
const PALETTE = [
  '#000000', '#7f7f7f', '#ffffff', '#f4a6c1',
  '#e53935', '#fb8c00', '#fdd835', '#43a047',
  '#1e88e5', '#8e24aa', '#6d4c41', '#c2185b',
]

async function rateDrawing(dataUrl) {
  const image = await (await fetch(dataUrl)).blob()
  const res = await fetch('/api/rate-hog', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image })
  if (!res.ok) throw new Error(`rate-hog failed: ${res.status}`)
  return (await res.json()).score
}

function RateThatHog() {
  const canvasRef = useRef(null)
  const nextId = useRef(0)
  // Ids of the strokes currently on the canvas, oldest first (mirrors the canvas undo stack).
  const strokes = useRef([])
  // Every graph point refers to a stroke id; undo re-appends the id of the stroke it falls back to.
  const [graph, setGraph] = useState([])
  const [scores, setScores] = useState({})
  const [color, setColor] = useState('#000000')
  const [erasing, setErasing] = useState(false)

  async function handleStroke() {
    const id = nextId.current++
    strokes.current.push(id)
    setGraph(g => [...g, id])
    try {
      const dataUrl = await canvasRef.current.exportImage('png', { width: SIZE, height: SIZE })
      const score = await rateDrawing(dataUrl)
      setScores(s => ({ ...s, [id]: score }))
    } catch (err) {
      console.error(err)
    }
  }

  // Dev only: adds a graph point with a fake Jev score after a random delay, so replies can land out of order.
  function addFakeScore() {
    const id = nextId.current++
    setGraph(g => [...g, id])
    setTimeout(() => setScores(s => ({ ...s, [id]: 1 + Math.random() * 4 })), 200 + Math.random() * 1000)
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
      ctx.font = 'bold 48px Quicksand, sans-serif'
      ctx.textBaseline = 'top'
      ctx.lineWidth = 6
      ctx.strokeStyle = '#ffffff'
      ctx.strokeText(latest.toFixed(1), 16, 16)
      ctx.fillStyle = '#000000'
      ctx.fillText(latest.toFixed(1), 16, 16)
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-6xl">Rate That Hog</h1>
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
            <button className="mt-auto border px-2 bg-black text-white" onClick={exportDrawing}>Export</button>
          </div>
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
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl h-12">{latest === undefined ? '' : latest.toFixed(1)}</div>
          <ScoreGraph points={points} />
        </div>
      </div>
    </div>
  )
}

// Score (h-12 = 48px) + gap (gap-4 = 16px) + graph lines up with the drawing's height.
const GRAPH_HEIGHT = SIZE - 64
const PAD = { left: 20, right: 8, top: 8, bottom: 8 }

function ScoreGraph({ points }) {
  const plotWidth = SIZE - PAD.left - PAD.right
  const plotHeight = GRAPH_HEIGHT - PAD.top - PAD.bottom
  // Trailing points still awaiting a score take no room, so the graph only moves once a score arrives.
  const span = points.findLastIndex(score => score !== undefined)
  const x = i => PAD.left + (span > 0 ? (i / span) * plotWidth : 0)
  const y = score => PAD.top + ((5 - score) / 4) * plotHeight
  // Pending (or failed) points are skipped; the line joins the scores we have.
  const known = points.flatMap((score, i) => (score === undefined ? [] : [[x(i), y(score)]]))

  return (
    <svg width={SIZE} height={GRAPH_HEIGHT} className="text-current">
      {[1, 2, 3, 4, 5].map(level => (
        <g key={level}>
          <line x1={PAD.left} x2={SIZE - PAD.right} y1={y(level)} y2={y(level)} stroke="currentColor" strokeOpacity={0.15} />
          <text x={PAD.left - 6} y={y(level)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor" fillOpacity={0.6}>{level}</text>
        </g>
      ))}
      <polyline points={known.map(p => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      {known.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={4} fill="currentColor" />)}
    </svg>
  )
}

export default RateThatHog
