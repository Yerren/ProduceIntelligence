import { useEffect, useRef, useState } from 'react'
import DrawingCanvas from '../shared/DrawingCanvas.jsx'
import ScoreGraph from '../shared/ScoreGraph.jsx'
import { CANVAS_SIZE, postDrawing, useFixedPageWidth } from '../shared/drawing.js'
import eraserUrl from '../shared/assets/eraser.svg'
import pencilUrl from '../shared/assets/pencil.svg'
import undoUrl from './assets/undo.svg'
import binUrl from './assets/bin.svg'
import titleUrl from './assets/DTT_Title.svg'

// Canvas plus the page padding.
const PAGE_WIDTH = CANVAS_SIZE + 32

// How long Clear has to be held down.
const CLEAR_HOLD_MS = 800

function formatScore(score) {
  return `${score > 0 ? '+' : ''}${score.toFixed(2)}`
}

// The worker picks the word and only hands back an encrypted token for it, plus its category. Even
// the word's length stays hidden until a score is close enough.
async function fetchWord() {
  const res = await fetch('/api/draw-the-thing/new-word', { method: 'POST' })
  if (!res.ok) throw new Error(`new-word failed: ${res.status}`)
  return await res.json()
}

// Each score comes back with the word blanked out to match it; higher scores show more letters, and
// the player wins when there are no blanks left.
function blanks(pattern) {
  return pattern.split('_').length - 1
}

async function revealWord(wordToken) {
  const res = await fetch('/api/draw-the-thing/reveal', { method: 'POST', headers: { 'X-Word-Token': wordToken } })
  if (!res.ok) throw new Error(`reveal failed: ${res.status}`)
  return (await res.json()).word
}

function rateDrawing(dataUrl, wordToken) {
  return postDrawing('/api/draw-the-thing', dataUrl, { 'X-Word-Token': wordToken })
}


function DrawTheThing() {
  const canvasRef = useRef(null)
  const graphArea = useRef(null)
  const graphHeight = useHeight(graphArea)
  const nextId = useRef(0)
  // The submission id for each stroke currently on the canvas (mirrors the canvas undo stack), so
  // undoing a stroke can reuse the score from before it instead of resubmitting.
  const strokes = useRef([])
  // Every graph point is a submission id; scores arrive for them out of order.
  const [graph, setGraph] = useState([])
  const [scores, setScores] = useState({})
  const [erasing, setErasing] = useState(false)
  // Promise of the current word's { token, category, pattern }, so strokes made while it loads wait for it.
  // Replies that land after a new word was picked are ignored.
  const word = useRef(null)
  const [category, setCategory] = useState(null)
  // The blanked-out word with the most letters showing so far, or null until a score has been high
  // enough for the worker to give away its length.
  const [pattern, setPattern] = useState(null)
  const [gaveUp, setGaveUp] = useState(false)

  useFixedPageWidth(PAGE_WIDTH)

  function pickWord() {
    const next = fetchWord()
    word.current = next
    next.then(({ category }) => {
      if (word.current !== next) return
      setCategory(category)
    }, err => console.error(err))
  }

  useEffect(pickWord, [])

  // Every stroke is submitted as soon as it's drawn.
  async function handleStroke() {
    const id = nextId.current++
    const current = word.current
    strokes.current.push(id)
    setGraph(g => [...g, id])
    try {
      const dataUrl = await canvasRef.current.exportImage('png', { width: CANVAS_SIZE, height: CANVAS_SIZE })
      const res = await rateDrawing(dataUrl, (await current).token)
      if (word.current !== current) return
      setScores(s => ({ ...s, [id]: res.score }))
      // Once the length shows it stays, even if later scores drop back below the threshold.
      if (res.pattern !== null) setPattern(p => (p === null || blanks(res.pattern) < blanks(p) ? res.pattern : p))
    } catch (err) {
      console.error(err)
    }
  }

  // Dev only: adds a graph point with a fake Jev score after a random delay, so replies can land out of order.
  function addFakeScore() {
    const id = nextId.current++
    setGraph(g => [...g, id])
    const score = Math.random() * 2 - 1
    setTimeout(() => setScores(s => ({ ...s, [id]: score })), 200 + Math.random() * 1000)
  }

  // Repeats the score from before the last stroke on the graph (or its pending reply) rather than
  // resubmitting the drawing.
  function undo() {
    if (strokes.current.length === 0) return
    canvasRef.current.undo()
    strokes.current.pop()
    const previous = strokes.current.at(-1)
    if (previous !== undefined) setGraph(g => [...g, previous])
  }

  // Wipes the drawing but keeps the graph.
  function clear() {
    canvasRef.current.resetCanvas()
    strokes.current = []
  }

  function newWord() {
    pickWord()
    setCategory(null)
    setPattern(null)
    setGaveUp(false)
    clear()
    setGraph([])
    setScores({})
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
      {/* As wide as the canvas: the title is too wide to size by height like Rate That Hog's. */}
      <h1><img src={titleUrl} alt="Draw The Thing" draggable={false} style={{ width: CANVAS_SIZE }} /></h1>
      {/* Fixed heights so nothing shifts the layout as these fill in. */}
      <div className="flex flex-col items-center gap-2">
        <p className="h-6">{category && `Category: ${category}`}</p>
        <AnswerSlots pattern={pattern} loaded={category !== null} />
        <p className="h-6">{won ? 'You got it!' : gaveUp ? 'You gave up.' : ''}</p>
      </div>
      {/* The score + graph sit beside the drawing when the window is wide enough for both, and
          otherwise below it, squashed into whatever height is left. */}
      <div className="flex-1 flex flex-col items-center gap-6 min-[1200px]:flex-row min-[1200px]:justify-center">
        <div className="flex flex-col gap-2" style={{ width: CANVAS_SIZE }}>
          <div className="flex gap-2">
            <ToolButton label="Pencil" active={!erasing} onClick={() => setEraser(false)}>
              <img src={pencilUrl} alt="" draggable={false} className="size-7" />
            </ToolButton>
            <ToolButton label="Eraser" active={erasing} onClick={() => setEraser(true)}>
              <img src={eraserUrl} alt="" draggable={false} className="size-7" />
            </ToolButton>
            <ToolButton label="Undo" onClick={undo}>
              <img src={undoUrl} alt="" draggable={false} className="size-7" />
            </ToolButton>
            {import.meta.env.DEV && <ToolButton label="Fake score" onClick={addFakeScore}>F</ToolButton>}
            <HoldButton label="Clear (hold)" className="ml-auto" holdMs={CLEAR_HOLD_MS} onHold={clear}>
              <img src={binUrl} alt="" draggable={false} className="size-7" />
            </HoldButton>
          </div>
          <DrawingCanvas ref={canvasRef} erasing={erasing} onStroke={handleStroke} />
          <div className="flex gap-2 justify-center">
            <PressButton className="border px-2 w-24" onClick={newWord}>New word</PressButton>
            <PressButton className="border px-2 w-24" onClick={giveUp}>Give up</PressButton>
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
            style={{ width: CANVAS_SIZE, maxHeight: CANVAS_SIZE, '--size': `${CANVAS_SIZE}px` }}
          >
            {graphHeight > 0 && (
              <ScoreGraph
                points={points}
                width={CANVAS_SIZE}
                height={graphHeight}
                levels={GRAPH_LEVELS}
                padLeft={40}
                fontSize={16}
                color="#000000"
                className="absolute inset-0"
              />
            )}
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

// Scores run from -1 (cold) to +1 (hot).
const GRAPH_LEVELS = [-1, -0.5, 0, 0.5, 1]

const isLetter = char => /\p{L}/u.test(char)

// The letter counts the way a crossword clue gives them: "(5)", or "(3,5)" for two words and
// "(1-5)" for a hyphenated one.
function lengthLabel(pattern) {
  const count = part => [...part].filter(char => char === '_' || isLetter(char)).length
  return `(${pattern.split(' ').map(word => word.split('-').map(count).join('-')).join(',')})`
}

// The answer as one slot per letter, empty until revealed, with spaces and hyphens as they are, and
// its length after it. Until the length is known, it's one fixed-length line and "(?)".
function AnswerSlots({ pattern, loaded }) {
  if (!loaded) return <div className="h-9" />
  if (pattern === null) {
    return (
      <div className="flex items-end gap-3 h-9 text-3xl">
        <span className="w-48 h-full border-b-2" />
        <span>(?)</span>
      </div>
    )
  }
  return (
    <div className="flex items-end gap-3 h-9 text-3xl">
      <div className="flex h-full">
        {[...pattern].map((char, i) => {
          if (char === ' ') return <span key={i} className="w-4" />
          if (!isLetter(char) && char !== '_') return <span key={i} className="w-6 text-center">{char}</span>
          return <span key={i} className="w-6 mx-0.5 text-center border-b-2">{char === '_' ? '' : char}</span>
        })}
      </div>
      <span>{lengthLabel(pattern)}</span>
    </div>
  )
}

// Buttons (other than Clear, which fills and shakes instead) shrink a little while pressed, and
// spring back on release or as soon as the pointer leaves them. This is tracked by hand rather than
// with :active, which can stay stuck on after dragging off the button.
function PressButton({ className = '', onPointerDown, children, ...props }) {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)

  return (
    <button
      {...props}
      className={`${className} transition-[scale] duration-[37.5ms] ${pressed ? 'scale-90' : ''}`}
      onPointerDown={e => {
        if (e.button === 0) setPressed(true)
        onPointerDown?.(e)
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onDragStart={e => e.preventDefault()}
    >
      {children}
    </button>
  )
}

const TOOL_BUTTON = `relative size-10 border flex items-center justify-center overflow-hidden`

// A toggle (one with `active`) switches on as soon as it's pressed down rather than on release; a
// keyboard press switches it on with the click.
function ToolButton({ label, active, onClick, children }) {
  const toggle = active !== undefined

  function handlePointerDown(e) {
    if (toggle && e.button === 0 && !active) onClick()
  }

  return (
    <PressButton
      className={`${TOOL_BUTTON} ${active ? 'bg-black/15' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={() => {
        if (!active) onClick()
      }}
      onPointerDown={handlePointerDown}
    >
      {children}
    </PressButton>
  )
}

// Has to be held for `holdMs` to arm, while a fill sweeps across and the button shakes; it stays
// filled and shaking once armed, and fires `onHold` when let go. Letting go early cancels it.
function HoldButton({ label, holdMs, onHold, className = '', children }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)
  const armed = useRef(false)

  function start(e) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setHolding(true)
    armed.current = false
    timer.current = setTimeout(() => (armed.current = true), holdMs)
  }

  function release() {
    const fire = armed.current
    cancel()
    if (fire) onHold()
  }

  function cancel() {
    clearTimeout(timer.current)
    armed.current = false
    setHolding(false)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <button
      className={`${TOOL_BUTTON} select-none touch-none ${holding ? 'animate-shake' : ''} ${className}`}
      title={label}
      aria-label={label}
      onPointerDown={start}
      onPointerUp={release}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onContextMenu={e => e.preventDefault()}
    >
      <span
        className="absolute inset-y-0 left-0 bg-red-500/40"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${holdMs}ms linear` : 'none' }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}

export default DrawTheThing
