// A pixel buffer: the surface all of the town's pixel art is drawn on.
//
// WHY NOT THE CANVAS API?
// Canvas fill and stroke smooth (anti-alias) every diagonal edge, which gives
// soft vector-looking shapes. Pixel art needs every pixel to be one chosen colour
// with hard edges. So the town is drawn by this small software rasteriser into a
// plain array of pixels, then handed to the canvas in one piece. It also means
// the art can be tested in Node, without a browser: a test can look at an exact
// pixel.
//
// A pixel is one 32-bit number, 0xAABBGGRR (little-endian RGBA, which is what
// ImageData uses on every browser), so the whole buffer can be given to ImageData
// with no conversion.

export type Rgba = number;

export function rgba(r: number, g: number, b: number, a = 255): Rgba {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function hex(colour: string): Rgba {
  const m = /^#([0-9a-f]{6})$/i.exec(colour);
  if (!m) throw new Error(`Expected a #rrggbb colour, got "${colour}"`);
  const v = parseInt(m[1]!, 16);
  return rgba((v >> 16) & 255, (v >> 8) & 255, v & 255);
}

export function channels(c: Rgba): [number, number, number, number] {
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];
}

// Blend a toward b by t (0 to 1), opaque result.
export function mixRgba(a: Rgba, b: Rgba, t: number): Rgba {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return rgba(
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab + (bb - ab) * t),
  );
}

export type Shader = Rgba | ((x: number, y: number) => Rgba);

export interface Point {
  x: number;
  y: number;
}

export class PixelBuffer {
  readonly data: Uint32Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint32Array(width * height); // all 0 = transparent
  }

  get(x: number, y: number): Rgba {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.data[y * this.width + x]!;
  }

  // Draws one pixel. A colour with alpha 0 draws nothing; anything else replaces
  // the pixel (pixel art uses no half-transparent pixels except shadows, which
  // use `blend`).
  set(x: number, y: number, c: Rgba): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    if (c >>> 24 === 0) return;
    this.data[y * this.width + x] = c;
  }

  // Darkens or tints what is already there, by `amount` (0 to 1) toward `c`.
  // Used for shadows and light so they keep the texture underneath.
  blend(x: number, y: number, c: Rgba, amount: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const under = this.data[y * this.width + x]!;
    if (under >>> 24 === 0) return;
    this.data[y * this.width + x] = mixRgba(under, c, amount);
  }

  fillRect(x: number, y: number, w: number, h: number, shader: Shader): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.floor(x + w));
    const y1 = Math.min(this.height, Math.floor(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const c = typeof shader === 'number' ? shader : shader(px, py);
        if (c >>> 24 !== 0) this.data[py * this.width + px] = c;
      }
    }
  }

  // Fills any simple polygon. A pixel is inside when its centre is, so two
  // polygons that share an edge never leave a gap or overlap by a pixel.
  fillPolygon(points: readonly Point[], shader: Shader): void {
    const n = points.length;
    if (n < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const y0 = Math.max(0, Math.ceil(minY - 0.5));
    const y1 = Math.min(this.height - 1, Math.ceil(maxY - 0.5) - 1);
    const xs: number[] = [];
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5;
      xs.length = 0;
      for (let i = 0; i < n; i++) {
        const a = points[i]!;
        const b = points[(i + 1) % n]!;
        if ((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)) {
          xs.push(a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.max(0, Math.ceil(xs[i]! - 0.5));
        const xb = Math.min(this.width - 1, Math.ceil(xs[i + 1]! - 0.5) - 1);
        for (let x = xa; x <= xb; x++) {
          const c = typeof shader === 'number' ? shader : shader(x, y);
          if (c >>> 24 !== 0) this.data[y * this.width + x] = c;
        }
      }
    }
  }

  // A one-pixel line (Bresenham), for outlines and mortar and rails.
  line(x0: number, y0: number, x1: number, y1: number, c: Rgba): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // Filled ellipse centred at (cx, cy) with radii rx, ry.
  fillEllipse(cx: number, cy: number, rx: number, ry: number, shader: Shader): void {
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const half = rx * Math.sqrt(1 - dy * dy);
      const xa = Math.ceil(cx - half - 0.5);
      const xb = Math.ceil(cx + half - 0.5) - 1;
      for (let x = xa; x <= xb; x++) {
        const c = typeof shader === 'number' ? shader : shader(x, y);
        this.set(x, y, c);
      }
    }
  }

  // Copies another buffer on top of this one at (x, y), skipping transparent
  // pixels.
  blit(src: PixelBuffer, x: number, y: number): void {
    for (let sy = 0; sy < src.height; sy++) {
      const dy = y + sy;
      if (dy < 0 || dy >= this.height) continue;
      for (let sx = 0; sx < src.width; sx++) {
        const c = src.data[sy * src.width + sx]!;
        if (c >>> 24 === 0) continue;
        const dx = x + sx;
        if (dx < 0 || dx >= this.width) continue;
        this.data[dy * this.width + dx] = c;
      }
    }
  }

  // Draws a 1 px dark outline around every opaque pixel of `src` that touches a
  // transparent pixel (outside only), into this buffer at (x, y). Sprite art uses
  // this to get the consistent dark edge of the reference pixel art.
  outlineOf(src: PixelBuffer, x: number, y: number, c: Rgba): void {
    for (let sy = -1; sy <= src.height; sy++) {
      for (let sx = -1; sx <= src.width; sx++) {
        if (src.get(sx, sy) >>> 24 !== 0) continue;
        if (
          src.get(sx - 1, sy) >>> 24 !== 0 ||
          src.get(sx + 1, sy) >>> 24 !== 0 ||
          src.get(sx, sy - 1) >>> 24 !== 0 ||
          src.get(sx, sy + 1) >>> 24 !== 0
        ) {
          this.set(x + sx, y + sy, c);
        }
      }
    }
  }

  // The pixels in the form ImageData wants. Shares memory with `data`.
  toBytes(): Uint8ClampedArray<ArrayBuffer> {
    return new Uint8ClampedArray(this.data.buffer as ArrayBuffer);
  }
}
