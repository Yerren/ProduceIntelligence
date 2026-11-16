import { useId } from 'react'

// Score after each submission, as a line over horizontal gridlines at `levels` (lowest first, which
// also set the y range). `points` holds a score per submission, undefined while it's pending.
// `labels` names each level (defaults to the level itself). `sketchy` roughens the line so it looks
// hand drawn. With `gradient` (colours spread evenly from the lowest level to the highest), the line
// shades by height instead of being `color`.
function ScoreGraph({ points, width, height, levels, labels = level => level, padLeft, fontSize, fontFamily, color, gradient, sketchy = false, className = '' }) {
  const id = useId()
  const pad = { left: padLeft, right: 8, top: 12, bottom: 12 }
  const min = levels[0]
  const max = levels.at(-1)
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  // Trailing points still awaiting a score take no room, so the graph only moves once a score arrives.
  const span = points.findLastIndex(score => score !== undefined)
  const x = i => pad.left + (span > 0 ? (i / span) * plotWidth : 0)
  const y = score => pad.top + ((max - score) / (max - min)) * plotHeight
  // Pending (or failed) points are skipped; the line joins the scores we have.
  const known = points.flatMap((score, i) => (score === undefined ? [] : [[x(i), y(score)]]))
  const polyPoints = known.map(p => p.join(',')).join(' ')

  // Two passes with differently seeded wobble, like a line gone over twice in pencil. The filter
  // region is the whole graph in user space, since a flat line's bounding box has no height.
  const roughId = seed => `${id}-rough-${seed}`
  const rough = seed => (sketchy ? `url(#${roughId(seed)})` : undefined)
  const gradientId = `${id}-gradient`
  const stroke = gradient ? `url(#${gradientId})` : color

  return (
    <svg width={width} height={height} overflow="visible" className={`text-current ${className}`}>
      <defs>
        {sketchy &&
          [1, 2].map(seed => (
            <filter key={seed} id={roughId(seed)} filterUnits="userSpaceOnUse" x={-20} y={-20} width={width + 40} height={height + 40}>
              <feTurbulence type="fractalNoise" baseFrequency={0.04} numOctaves={2} seed={seed} />
              <feDisplacementMap in="SourceGraphic" scale={seed === 1 ? 5 : 7} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          ))}
        {/* In user space, so the colour follows the score rather than the line's own extent. */}
        {gradient && (
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={y(min)} y2={y(max)}>
            {gradient.map((stop, i) => (
              <stop key={i} offset={i / (gradient.length - 1)} stopColor={stop} />
            ))}
          </linearGradient>
        )}
      </defs>
      {levels.map(level => (
        <g key={level}>
          <line x1={pad.left} x2={width - pad.right} y1={y(level)} y2={y(level)} stroke="currentColor" strokeOpacity={0.15} />
          <text x={pad.left - 6} y={y(level)} textAnchor="end" dominantBaseline="middle" fontSize={fontSize} fontFamily={fontFamily} fill="currentColor" fillOpacity={0.6}>{labels(level)}</text>
        </g>
      ))}
      {sketchy ? (
        <>
          <polyline points={polyPoints} fill="none" stroke={stroke} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" filter={rough(1)} />
          <polyline points={polyPoints} fill="none" stroke={stroke} strokeWidth={2.5} strokeOpacity={0.7} strokeLinejoin="round" strokeLinecap="round" filter={rough(2)} />
        </>
      ) : (
        <polyline points={polyPoints} fill="none" stroke={stroke} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default ScoreGraph
