// Score after each submission, as a line over horizontal gridlines at `levels` (lowest first, which
// also set the y range). `points` holds a score per submission, undefined while it's pending.
function ScoreGraph({ points, width, height, levels, padLeft, fontSize, fontFamily, color, className = '' }) {
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

  return (
    <svg width={width} height={height} overflow="visible" className={`text-current ${className}`}>
      {levels.map(level => (
        <g key={level}>
          <line x1={pad.left} x2={width - pad.right} y1={y(level)} y2={y(level)} stroke="currentColor" strokeOpacity={0.15} />
          <text x={pad.left - 6} y={y(level)} textAnchor="end" dominantBaseline="middle" fontSize={fontSize} fontFamily={fontFamily} fill="currentColor" fillOpacity={0.6}>{level}</text>
        </g>
      ))}
      <polyline points={known.map(p => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default ScoreGraph
