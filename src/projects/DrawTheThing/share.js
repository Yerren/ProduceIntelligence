import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import { CANVAS_SIZE } from '../shared/drawing.js'

// A polaroid: the drawing in a cream frame, with a deeper strip underneath for the word in capitals.
const BORDER = 36
const CAPTION_HEIGHT = 110
export const WIDTH = CANVAS_SIZE + 2 * BORDER
export const HEIGHT = BORDER + CANVAS_SIZE + CAPTION_HEIGHT
const FRAME_COLOR = '#fbf8f1'
const FONT = '"Delicious Handrawn"'
// The replay runs at 10 frames a second, then holds on the finished drawing.
const FRAME_MS = 100
const HOLD_MS = 1000

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

// Draws one frame: `src` is a canvas image, or null for a blank canvas.
async function drawFrame(ctx, src, word) {
  ctx.fillStyle = FRAME_COLOR
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 8
  ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(BORDER, BORDER, CANVAS_SIZE, CANVAS_SIZE)
  if (src) ctx.drawImage(await loadImage(src), BORDER, BORDER, CANVAS_SIZE, CANVAS_SIZE)
  ctx.lineWidth = 6
  ctx.strokeRect(BORDER - 3, BORDER - 3, CANVAS_SIZE + 6, CANVAS_SIZE + 6)
  const text = word.toUpperCase()
  // Shrinks long words to fit across the strip.
  let size = 64
  ctx.font = `${size}px ${FONT}`
  const fit = (CANVAS_SIZE - 16) / ctx.measureText(text).width
  if (fit < 1) {
    size = Math.floor(size * fit)
    ctx.font = `${size}px ${FONT}`
  }
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, WIDTH / 2, BORDER + CANVAS_SIZE + CAPTION_HEIGHT / 2)
}

function makeCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  return [canvas, canvas.getContext('2d', { willReadFrequently: true })]
}

async function fontReady() {
  await document.fonts.load(`64px ${FONT}`)
}

// A PNG of the finished drawing with the word underneath.
export async function shareImage(final, word) {
  await fontReady()
  const [canvas, ctx] = makeCanvas()
  await drawFrame(ctx, final, word)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  return new File([blob], 'draw-the-thing.png', { type: 'image/png' })
}

// A GIF stepping through every image in `frames` (strokes, undos and clears in order), holding on
// the last one.
export async function shareGif(frames, word) {
  await fontReady()
  const [, ctx] = makeCanvas()
  const gif = GIFEncoder()
  for (const [i, src] of frames.entries()) {
    await drawFrame(ctx, src, word)
    const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT)
    const palette = quantize(data, 16)
    gif.writeFrame(applyPalette(data, palette), WIDTH, HEIGHT, {
      palette,
      delay: i === frames.length - 1 ? HOLD_MS : FRAME_MS,
    })
  }
  gif.finish()
  return new File([gif.bytes()], 'draw-the-thing.gif', { type: 'image/gif' })
}
