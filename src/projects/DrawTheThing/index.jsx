import { useEffect, useRef, useState } from 'react'
import DrawingCanvas from '../shared/DrawingCanvas.jsx'
import ScoreGraph from '../shared/ScoreGraph.jsx'
import { CANVAS_SIZE, postDrawing, useFixedPageWidth } from '../shared/drawing.js'
import eraserUrl from '../shared/assets/eraser.svg'
import pencilUrl from '../shared/assets/pencil.svg'
import undoUrl from './assets/undo.svg'
import binUrl from './assets/bin.svg'
import titleUrl from './assets/DTT_Title.svg'
import gaugeUrl from './assets/guage.svg'
import arrowUrl from './assets/arrow.svg'

// Canvas plus the page padding.
const PAGE_WIDTH = CANVAS_SIZE + 32
// Set once How to play has been closed, so it only opens by itself on the first visit.
const SEEN_HELP = 'drawTheThing.seenHowToPlay'

// The handwritten font Rate That Hog uses, loaded in index.css.
const FONT = '"Delicious Handrawn"'

// Height over width of DTT_Title.svg's viewBox.
const TITLE_RATIO = 174.9 / 884.2
// Roughly the height of the page besides the title and gauge in the wide layout (padding, gaps,
// word lines, toolbar, canvas and buttons), so the title only grows into spare height.
const BELOW_TITLE = 840

function formatScore(score) {
  return `${score > 0 ? '+' : ''}${score.toFixed(2)}`
}

// The worker picks the word and only hands back an encrypted token for it, plus its category. Even
// the word's length stays hidden until a score is close enough.
async function fetchWord() {
  const res = await fetch('/api/draw-the-thing/new-word', { method: 'POST' })
  if (!res.ok) {
    if (noDevWorker(res)) return { token: DEV_WORD.token, category: DEV_WORD.category }
    throw new Error(`new-word failed: ${res.status}`)
  }
  return await res.json()
}

// Placeholder word for the local dev server, which has no worker behind /api and 404s.
const DEV_WORD = { token: 'dev-placeholder', category: 'household object', word: 'toothbrush' }
const noDevWorker = res => import.meta.env.DEV && res.status === 404

// Each score comes back with the word blanked out to match it; higher scores show more letters, and
// the player wins when there are no blanks left.
function blanks(pattern) {
  return pattern.split('_').length - 1
}

async function revealWord(wordToken) {
  const res = await fetch('/api/draw-the-thing/reveal', { method: 'POST', headers: { 'X-Word-Token': wordToken } })
  if (!res.ok) {
    if (noDevWorker(res) && wordToken === DEV_WORD.token) return DEV_WORD.word
    throw new Error(`reveal failed: ${res.status}`)
  }
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
  const [confirmingClear, setConfirmingClear] = useState(false)
  // How to play shows by itself on the first visit only; the (?) button brings it back.
  const [helpOpen, setHelpOpen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_HELP) === null
    } catch {
      return true
    }
  })
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const screen = useRef(null)
  const content = useRef(null)
  // Phones lay the page out at a fixed width and scroll if they must (useFixedPageWidth); with a
  // mouse, the page shrinks to fit the window instead. On a phone the graph can shrink further too.
  const desktop = useMediaQuery('(hover: hover) and (pointer: fine)')
  const fit = useFitHeight(screen, content, desktop)

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

  const graphView = graphHeight > 0 && (
    <ScoreGraph
      points={points}
      width={CANVAS_SIZE}
      height={graphHeight}
      levels={GRAPH_LEVELS}
      labels={level => GRAPH_LABELS[level]}
      padLeft={56}
      fontSize={20}
      fontFamily={FONT}
      gradient={GRAPH_GRADIENT}
      sketchy
      className="absolute inset-0"
    />
  )

  return (
    // Exactly screen height, so there's nothing to scroll unless the screen is too short to fit the
    // drawing. touch-pan blocks pinch zoom where browsers ignore user-scalable=no (iOS Safari).
    <div ref={screen} className="h-dvh overflow-auto touch-pan-x touch-pan-y bg-white text-black [color-scheme:light]" style={{ fontFamily: FONT }}>
      {/* At least screen height, so the graph can grow into what's left below the drawing. On a
          desktop screen too short for all of it, the whole page is scaled down to fit (the canvas
          maps the pointer through the transform); the negative margin takes back the space the
          unscaled layout still takes up, so there's nothing left to scroll. */}
      <div
        ref={content}
        className="min-h-full flex flex-col items-center gap-4 p-4 origin-top"
        style={fit.scale < 1 ? { transform: `scale(${fit.scale})`, marginBottom: -fit.height * (1 - fit.scale) } : undefined}
      >
        {/* As wide as the canvas, or when the graph sits beside it, growing toward the width of both
            for as long as the window is tall enough to fit everything else below it. */}
        {/* Phones are short on room, so they go without the title. */}
        {desktop && <h1>
          <img
            src={titleUrl}
            alt="Draw The Thing"
            draggable={false}
            className="w-(--canvas) min-[1200px]:w-(--wide)"
            style={{
              '--canvas': `${CANVAS_SIZE}px`,
              // Grows into whatever height is spare, between the canvas width and the width of both.
              '--wide': `clamp(${CANVAS_SIZE}px, (100dvh - ${BELOW_TITLE + GAUGE_HEIGHT + 8}px) / ${TITLE_RATIO}, ${2 * CANVAS_SIZE + 24}px)`,
            }}
          />
        </h1>}
        {/* Fixed heights so nothing shifts the layout as these fill in. */}
        <div className="flex flex-col items-center gap-2">
          {/* Long categories wrap onto a second line rather than overflow the page. */}
          <p
            className="min-h-8 text-[32px] leading-none text-center text-balance max-w-(--canvas) min-[1200px]:max-w-(--both)"
            style={{ '--canvas': `${CANVAS_SIZE}px`, '--both': `${2 * CANVAS_SIZE + 24}px` }}
          >
            {category && `Category: ${category}`}
          </p>
          <AnswerSlots pattern={pattern} loaded={category !== null} />
          {/* Giving up asks first; once the word is out, the same link moves on to a new one. */}
          <p className="h-6 text-2xl leading-none">
            {won ? 'You got it! ' : gaveUp ? 'You gave up. ' : ''}
            <button type="button" className="underline cursor-pointer" onClick={won || gaveUp ? newWord : () => setConfirmingGiveUp(true)}>
              {won || gaveUp ? 'New word' : 'Give up'}
            </button>
          </p>
        </div>
        {/* The gauge sits right above the drawing, centred over the graph as well when that's
            beside it. */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <Gauge score={latest} />
          {/* The graph sits beside the drawing when the window is wide enough for both, level with
              the canvas, and otherwise below it, squashed into whatever height is left. */}
          <div className="flex-1 flex flex-col items-center gap-6 min-[1200px]:flex-row min-[1200px]:items-start min-[1200px]:justify-center">
            <div className="flex flex-col gap-2" style={{ width: CANVAS_SIZE }}>
              <DrawingCanvas ref={canvasRef} erasing={erasing} onStroke={handleStroke} />
              <div className="flex gap-2">
                <ToolButton label="Pencil" active={!erasing} onClick={() => setEraser(false)}>
                  <img src={pencilUrl} alt="" draggable={false} className="size-14 [@media(hover:hover)_and_(pointer:fine)]:size-7" />
                </ToolButton>
                <ToolButton label="Eraser" active={erasing} onClick={() => setEraser(true)}>
                  <img src={eraserUrl} alt="" draggable={false} className="size-14 [@media(hover:hover)_and_(pointer:fine)]:size-7" />
                </ToolButton>
                <ToolButton label="Undo" onClick={undo}>
                  <img src={undoUrl} alt="" draggable={false} className="size-14 [@media(hover:hover)_and_(pointer:fine)]:size-7" />
                </ToolButton>
                {import.meta.env.DEV && (
                  <PressButton className="border px-2 self-center text-2xl" title="Fake score" onClick={addFakeScore}>F</PressButton>
                )}
                <PressButton className={`${TOOL_BUTTON} ml-auto`} title="Clear" aria-label="Clear" onClick={() => setConfirmingClear(true)}>
                  <img src={binUrl} alt="" draggable={false} className="size-14 [@media(hover:hover)_and_(pointer:fine)]:size-7" />
                </PressButton>
              </div>
            </div>
            {/* The graph is drawn to this area's height, and positioned absolutely so it can't
                stretch the area it's measured from. On a phone it lives in a drawer that slides
                out over the page from the right edge, hidden until its tab is tapped. */}
            {desktop ? (
              <div
                ref={graphArea}
                className="relative flex-1 min-h-64 min-[1200px]:flex-none min-[1200px]:h-(--size)"
                style={{ width: CANVAS_SIZE, maxHeight: CANVAS_SIZE, '--size': `${CANVAS_SIZE}px` }}
              >
                {graphView}
              </div>
            ) : (
              <>
              {/* The open drawer is wider than the tab leaves room for, so tapping the graph or
                  anywhere around it closes it again. */}
              {graphOpen && <div className="fixed inset-0 z-10" onClick={() => setGraphOpen(false)} />}
              <div
                className={`fixed top-1/4 right-0 z-20 flex items-center transition-transform duration-300 motion-reduce:transition-none ${graphOpen ? '' : 'translate-x-(--hide)'}`}
                style={{ '--hide': `${CANVAS_SIZE + 36}px` }}
              >
                <button
                  type="button"
                  className="border-2 border-r-0 bg-white px-2 py-4 text-2xl [writing-mode:vertical-rl] rotate-180"
                  aria-expanded={graphOpen}
                  onClick={() => setGraphOpen(o => !o)}
                >
                  {graphOpen ? 'Hide graph' : 'Graph'}
                </button>
                <div className="border-2 border-r-0 bg-white p-4" onClick={() => setGraphOpen(false)}>
                  <div ref={graphArea} className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE * 0.75 }}>
                    {graphView}
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
      <PressButton
        className="fixed top-2 right-2 z-10 size-10 rounded-full border-2 bg-white text-2xl leading-none"
        title="How to play"
        aria-label="How to play"
        onClick={() => setHelpOpen(true)}
      >
        ?
      </PressButton>
      <HowToPlay
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false)
          try {
            localStorage.setItem(SEEN_HELP, '1')
          } catch {
            // Without storage it just shows again next visit.
          }
        }}
      />
      <ConfirmDialog
        open={confirmingGiveUp}
        message="Give up on this word?"
        confirmLabel="Give up"
        onConfirm={() => {
          setConfirmingGiveUp(false)
          giveUp()
        }}
        onCancel={() => setConfirmingGiveUp(false)}
      />
      <ConfirmDialog
        open={confirmingClear}
        message="Clear the drawing?"
        confirmLabel="Clear"
        onConfirm={() => {
          setConfirmingClear(false)
          clear()
        }}
        onCancel={() => setConfirmingClear(false)}
      />
    </div>
  )
}

// Whether the media `query` matches, kept up to date.
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

// How far to scale `content` down for it to fit in the height of `screen` (never up), along with
// its unscaled height; always 1 unless `enabled`. Scaling doesn't change the layout size that's
// measured, so it can't feed back into itself.
function useFitHeight(screen, content, enabled) {
  const [fit, setFit] = useState({ scale: 1, height: 0 })
  useEffect(() => {
    function update() {
      const height = content.current.offsetHeight
      const scale = enabled ? Math.min(1, screen.current.clientHeight / height) : 1
      setFit(f => (f.scale === scale && f.height === height ? f : { scale, height }))
    }
    const observer = new ResizeObserver(update)
    observer.observe(screen.current)
    observer.observe(content.current)
    return () => observer.disconnect()
  }, [screen, content, enabled])
  return fit
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
// Named like the gauge's marks.
const GRAPH_LABELS = { [-1]: 'ICY', [-0.5]: 'COLD', 0: 'MEH', 0.5: 'WARM', 1: 'HOT!' }
// guage.svg's gradient, cold to hot.
const GRAPH_GRADIENT = ['#0013FF', '#DBDBDB', '#FF0000']

// guage.svg's viewBox.
const GAUGE = { x: -581, y: 345, width: 755.9, height: 392 }
// Where the arrow's tip lands at -1, 0 and +1, in guage.svg's coordinates: the middle of the
// coloured band's left end, its top, and its right end.
const GAUGE_TARGETS = { [-1]: [-492.05, 684.43], 0: [-207.6, 455.75], 1: [76.8, 676.3] }
// arrow.svg's viewBox size, its tip, and the centre and outer radius of the ring at its base.
const ARROW = { width: 52.9, height: 307.2, tip: [31.1, 0], base: [21.49, 286.51], baseRadius: 20.75 }

const angleTo = (from, to) => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

// The centre of the circle through three points.
function circumcentre([ax, ay], [bx, by], [cx, cy]) {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  const a = ax * ax + ay * ay
  const b = bx * bx + by * by
  const c = cx * cx + cy * cy
  return [(a * (by - cy) + b * (cy - ay) + c * (ay - by)) / d, (a * (cx - bx) + b * (ax - cx) + c * (bx - ax)) / d]
}

// The arrow pivots on its base from the one point that's the same distance from all three targets,
// and is scaled so its tip reaches them.
const PIVOT = circumcentre(GAUGE_TARGETS[-1], GAUGE_TARGETS[0], GAUGE_TARGETS[1])
const ARROW_SCALE = distance(PIVOT, GAUGE_TARGETS[0]) / distance(ARROW.base, ARROW.tip)
// How far to turn the arrow from upright to point at each target (it doesn't quite point straight
// up as drawn).
const ARROW_ANGLE = angleTo(ARROW.base, ARROW.tip)
const TURN = Object.fromEntries(Object.entries(GAUGE_TARGETS).map(([score, target]) => [score, angleTo(PIVOT, target) - ARROW_ANGLE]))
// The view runs down from the top of the gauge to the bottom of the arrow's base, or the bottom of
// the gauge if that's lower, so neither is cut off.
const GAUGE_VIEW_HEIGHT = Math.max(GAUGE.height, PIVOT[1] + ARROW.baseRadius * ARROW_SCALE - GAUGE.y)
const GAUGE_HEIGHT = (CANVAS_SIZE * GAUGE_VIEW_HEIGHT) / GAUGE.width

// The arrow's turn for a score, straight between -1, 0 and +1.
function gaugeTurn(score) {
  const s = Math.max(-1, Math.min(1, score))
  return s < 0 ? TURN[0] + (TURN[0] - TURN[-1]) * s : TURN[0] + (TURN[1] - TURN[0]) * s
}

// The hot/cold gauge, with its arrow pointing at `score` (resting on 0 until there is one). The
// view's origin is the pivot, so the arrow turns about it.
function Gauge({ score }) {
  return (
    <svg
      viewBox={`${GAUGE.x - PIVOT[0]} ${GAUGE.y - PIVOT[1]} ${GAUGE.width} ${GAUGE_VIEW_HEIGHT}`}
      width={CANVAS_SIZE}
      height={GAUGE_HEIGHT}
      role="img"
      aria-label={score === undefined ? 'No score yet' : `Score ${formatScore(score)}`}
    >
      <image href={gaugeUrl} x={GAUGE.x - PIVOT[0]} y={GAUGE.y - PIVOT[1]} width={GAUGE.width} height={GAUGE.height} />
      <g style={{ transform: `rotate(${gaugeTurn(score ?? 0)}deg)`, transformOrigin: '0 0', transition: 'transform 400ms ease-out' }}>
        <image
          href={arrowUrl}
          width={ARROW.width}
          height={ARROW.height}
          transform={`scale(${ARROW_SCALE}) translate(${-ARROW.base[0]} ${-ARROW.base[1]})`}
        />
      </g>
    </svg>
  )
}

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
  if (!loaded) return <div className="h-14" />
  if (pattern === null) {
    return (
      <div className="flex items-end gap-3 h-14 text-[45px] leading-none">
        <span className="w-72 h-full border-b-2" />
        <span>(?)</span>
      </div>
    )
  }
  // Sized in ems so that a long word shrinks to fit across the canvas rather than wrapping or
  // running off the screen. Widths are in ems of the 45px text: letter slots 0.8, spaces 0.53,
  // punctuation 0.71, the gap 0.27, and about 0.5 for each character of the length label.
  const width = [...pattern].reduce((sum, char) => sum + (char === ' ' ? 0.53 : !isLetter(char) && char !== '_' ? 0.71 : 0.8), 0)
    + 0.27 + lengthLabel(pattern).length * 0.5
  const fontSize = Math.min(45, CANVAS_SIZE / width)
  return (
    <div className="flex items-end gap-[0.27em] h-14 leading-none" style={{ fontSize }}>
      <div className="flex h-full items-end">
        {[...pattern].map((char, i) => {
          if (char === ' ') return <span key={i} className="w-[0.53em]" />
          if (!isLetter(char) && char !== '_') return <span key={i} className="w-[0.71em] text-center">{char}</span>
          return <span key={i} className="w-[0.71em] mx-[0.045em] text-center border-b-2">{char === '_' ? '' : char}</span>
        })}
      </div>
      <span className="whitespace-nowrap">{lengthLabel(pattern)}</span>
    </div>
  )
}

// Buttons shrink a little while pressed, and
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

const TOOL_BUTTON = `relative size-20 [@media(hover:hover)_and_(pointer:fine)]:size-10 border flex items-center justify-center overflow-hidden`

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

// An "are you sure" popup. A native modal <dialog> handles focus, Escape and blocking the page for
// both mouse and touch; tapping the backdrop cancels too.
function ConfirmDialog({ open, message, confirmLabel, onConfirm, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="m-auto max-w-[calc(100vw-2rem)] border-2 border-black bg-white text-black p-6 backdrop:bg-black/40"
      style={{ fontFamily: FONT }}
      onCancel={e => {
        e.preventDefault()
        onCancel()
      }}
      // A click that lands on the <dialog> itself rather than its contents is on the backdrop.
      onClick={e => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <p className="text-4xl text-center mb-6">{message}</p>
      <div className="flex gap-4 justify-center">
        <PressButton className="border-2 px-4 py-1 text-3xl min-w-28" autoFocus onClick={onCancel}>Cancel</PressButton>
        <PressButton className="border-2 border-red-600 bg-red-500/20 px-4 py-1 text-3xl min-w-28" onClick={onConfirm}>{confirmLabel}</PressButton>
      </div>
    </dialog>
  )
}

function HowToPlay({ open, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] border-2 border-black bg-white text-black p-6 backdrop:bg-black/40"
      style={{ fontFamily: FONT }}
      onCancel={e => {
        e.preventDefault()
        onClose()
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <img src={titleUrl} alt="Draw The Thing" draggable={false} className="w-full mb-4" />
      <div className="flex flex-col gap-3 text-2xl leading-tight text-center mb-6">
        <p className="text-3xl">Goal: Uncover the <span className="underline">secret word</span> via drawing</p>
        {/* Hot and cold in the gauge's own red and blue. */}
        <p>
          You'll be told how close (<span className="text-[#FF0000]">hot</span>) or far away (
          <span className="text-[#0013FF]">cold</span>) you are after every brush stroke
        </p>
        <p>The category is there to get you started</p>
        <p>The hotter you get, the more information will be revealed</p>
        <p>Reveal the full word to win!</p>
      </div>
      <div className="flex justify-center">
        <PressButton className="border-2 px-4 py-1 text-3xl min-w-28" autoFocus onClick={onClose}>Let's go!</PressButton>
      </div>
    </dialog>
  )
}

export default DrawTheThing
