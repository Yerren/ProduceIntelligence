import gaugeUrl from './assets/guage.svg'
import arrowUrl from './assets/arrow.svg'

// The hot/cold gauge, in its own module so the Just For Fun page can show it without loading the game.

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
// Height over width of the gauge's view.
export const GAUGE_ASPECT = GAUGE_VIEW_HEIGHT / GAUGE.width

// The arrow's turn for a score, straight between -1, 0 and +1.
function gaugeTurn(score) {
  const s = Math.max(-1, Math.min(1, score))
  return s < 0 ? TURN[0] + (TURN[0] - TURN[-1]) * s : TURN[0] + (TURN[1] - TURN[0]) * s
}

// The hot/cold gauge, with its arrow pointing at `score` (resting on 0 until there is one). The
// view's origin is the pivot, so the arrow turns about it.
function Gauge({ score, width, height, label, className }) {
  return (
    <svg
      viewBox={`${GAUGE.x - PIVOT[0]} ${GAUGE.y - PIVOT[1]} ${GAUGE.width} ${GAUGE_VIEW_HEIGHT}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={label}
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

export default Gauge
