// Shared by the Fun Zone drawing games.
import { useEffect } from 'react'

// The drawing is this many px square, on screen and when sent to be rated.
export const CANVAS_SIZE = 512

// The Illustrator SVGs only have a viewBox, and browsers won't draw an SVG to a canvas or use it
// as a cursor without an intrinsic size, so give it one.
export function sizeSvg(svg, width, height) {
  return svg.replace('<svg ', `<svg width="${width}" height="${height}" `)
}

// A CSS cursor from an icon SVG of size viewW x viewH, drawn `width` px wide and rotated `degrees`
// clockwise, with the hotspot at `hot` (viewBox units).
export function svgCursor(svg, viewW, viewH, width, [hotX, hotY], fallback, degrees = 0) {
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

// Sends a canvas export (a PNG data URL) to the worker at `url` and returns its JSON reply.
export async function postDrawing(url, dataUrl, headers = {}) {
  const image = await (await fetch(dataUrl)).blob()
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/png', ...headers }, body: image })
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`)
  return await res.json()
}

// Phones lay the page out `width` px wide and scale it down to fit the screen, rather than clipping
// the drawing row. index.html's viewport is shared with the rest of the site, so it's only swapped
// while the page using this is up.
export function useFixedPageWidth(width) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta.content
    meta.content = `width=${width}, user-scalable=no`
    return () => { meta.content = original }
  }, [width])
}
