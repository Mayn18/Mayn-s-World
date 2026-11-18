// A stand-in for a canvas drawing context that records what was drawn, so tests
// can check the painters without a browser. Only the methods the painters use
// exist. Points are recorded after the current translate(), i.e. in picture space.
import type { ScreenPoint } from './projection';

export interface RecordedPolygon {
  colour: string;
  points: ScreenPoint[];
}

export function recordingContext() {
  const polygons: RecordedPolygon[] = [];
  const lines: { colour: string; from: ScreenPoint; to: ScreenPoint }[] = [];
  let fillStyle = '';
  let strokeStyle = '';
  let tx = 0;
  let ty = 0;
  const saved: [number, number][] = [];
  let path: ScreenPoint[] = [];

  const ctx = {
    save() {
      saved.push([tx, ty]);
    },
    restore() {
      [tx, ty] = saved.pop() ?? [0, 0];
    },
    translate(x: number, y: number) {
      tx += x;
      ty += y;
    },
    beginPath() {
      path = [];
    },
    moveTo(x: number, y: number) {
      path.push({ sx: x + tx, sy: y + ty });
    },
    lineTo(x: number, y: number) {
      path.push({ sx: x + tx, sy: y + ty });
    },
    closePath() {},
    clip() {},
    fill() {
      polygons.push({ colour: fillStyle, points: [...path] });
    },
    stroke() {
      if (path.length === 2) lines.push({ colour: strokeStyle, from: path[0]!, to: path[1]! });
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
    get fillStyle() {
      return fillStyle;
    },
    set strokeStyle(value: string) {
      strokeStyle = value;
    },
    get strokeStyle() {
      return strokeStyle;
    },
    lineWidth: 1,
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, polygons, lines };
}
