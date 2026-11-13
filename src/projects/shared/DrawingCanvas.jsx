import { ReactSketchCanvas } from 'react-sketch-canvas'
import { CANVAS_SIZE, svgCursor } from './drawing.js'
import eraserSvg from './assets/eraser.svg?raw'
import pencilSvg from './assets/pencil.svg?raw'

// Hotspots: the pencil's tip and the middle of the eraser's rubbing edge.
const PENCIL_CURSOR = svgCursor(pencilSvg, 80.1, 87, 32, [5, 86], 'crosshair')
const ERASER_CURSOR = svgCursor(eraserSvg, 77.3, 79.6, 32, [18, 74], 'crosshair')

// The square drawing area, with a pencil (or eraser) cursor. `ref` is the ReactSketchCanvas handle.
function DrawingCanvas({ ref, erasing, strokeColor = '#000000', onStroke }) {
  return (
    <div style={{ cursor: erasing ? ERASER_CURSOR : PENCIL_CURSOR }}>
      <ReactSketchCanvas
        ref={ref}
        width={`${CANVAS_SIZE}px`}
        height={`${CANVAS_SIZE}px`}
        canvasColor="#ffffff"
        strokeColor={strokeColor}
        strokeWidth={4}
        eraserWidth={16}
        onStroke={onStroke}
      />
    </div>
  )
}

export default DrawingCanvas
