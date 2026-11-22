// Landmark painters for the cathedral, windmill, fountain, market stalls and bandstand.
// Each uses the same pixel-art treatment, two-tone lighting and `at` frame as the houses.
import type { Building } from '../data/buildings';
import {
  fillPixelPolygon as fillPolygon,
  fillPixelRect,
  paintPixelCourses,
  strokePixelLine as strokeLine,
  strokePixelPolygon,
} from '../render/pixelArt';
import { mix } from '../render/terrainPalette';
import type { MaterialName } from '../themes';
import { type Origin, at } from './geometry';
import type { BuildingPalette } from './palette';
import { box } from './painter';
import { cone, cylinder, ellipseRadii } from './solids';
import type { ScreenPoint } from '../render/projection';

export const SPECIAL_KINDS: readonly string[] = ['windmill', 'fountain', 'stall', 'bandstand', 'cathedral'];

export function specialHeight(b: Building): number {
  switch (b.kind) {
    case 'windmill': return 80;
    case 'bandstand': return 38;
    case 'stall': return 24;
    case 'cathedral': return 184;
    default: return 22;
  }
}

type ChurchWall = 'south' | 'east';

function archPoints(
  point: (u: number, z: number) => ScreenPoint,
  centre: number,
  bottom: number,
  half: number,
  height: number,
): ScreenPoint[] {
  const rise = Math.min(height * 0.45, Math.max(height * 0.28, half * 18));
  const spring = bottom + height - rise;
  const points = [point(centre - half, bottom), point(centre - half, spring)];
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const curve = 1 - Math.pow(1 - t, 0.68);
    points.push(point(centre - half * (1 - t), spring + rise * curve));
  }
  for (let i = 5; i >= 0; i--) {
    const t = i / 6;
    const curve = 1 - Math.pow(1 - t, 0.68);
    points.push(point(centre + half * (1 - t), spring + rise * curve));
  }
  points.push(point(centre + half, bottom));
  return points;
}

function paintChurchArch(
  ctx: CanvasRenderingContext2D,
  point: (u: number, z: number) => ScreenPoint,
  centre: number,
  bottom: number,
  half: number,
  height: number,
  frame: string,
  interior: string,
): void {
  fillPolygon(ctx, archPoints(point, centre, bottom, half + 0.06, height + 2.5), frame);
  fillPolygon(ctx, archPoints(point, centre, bottom + 1, half, height - 1), interior);
}

function paintStainedWindow(
  ctx: CanvasRenderingContext2D,
  point: (u: number, z: number) => ScreenPoint,
  centre: number,
  bottom: number,
  half: number,
  height: number,
  pal: BuildingPalette,
): void {
  const glass = mix(pal.glass.shade, pal.m.roofBlue.dark, 0.3);
  paintChurchArch(ctx, point, centre, bottom, half, height, pal.m.wallStone.light, glass);
  const panelTop = bottom + height * 0.57;
  const paneEdges = [
    centre - half * 0.7,
    centre - half * 0.24,
    centre + half * 0.24,
    centre + half * 0.7,
  ];
  const panes = [pal.m.roofRed.lit, pal.m.roofBlue.light, pal.m.gold.lit];
  for (let i = 0; i < panes.length; i++) {
    fillPolygon(ctx, [
      point(paneEdges[i]!, bottom + 2),
      point(paneEdges[i + 1]!, bottom + 2),
      point(paneEdges[i + 1]!, panelTop),
      point(paneEdges[i]!, panelTop),
    ], panes[i]!);
  }
  fillPolygon(ctx, [
    point(centre - half * 0.56, panelTop),
    point(centre + half * 0.56, panelTop),
    point(centre, bottom + height - 2),
  ], pal.m.roofBlue.lit);
  for (const edge of paneEdges.slice(1, -1)) {
    strokeLine(ctx, point(edge, bottom + 2), point(edge, panelTop), pal.m.wallStone.light);
  }
  strokeLine(ctx, point(centre, panelTop), point(centre, bottom + height - 2), pal.m.wallStone.light);
  strokeLine(ctx, point(centre - half * 0.72, panelTop), point(centre + half * 0.72, panelTop), pal.white);
}

function rosePoints(
  point: (u: number, z: number) => ScreenPoint,
  centre: number,
  height: number,
  radiusU: number,
  radiusZ: number,
): ScreenPoint[] {
  return Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return point(centre + Math.cos(angle) * radiusU, height + Math.sin(angle) * radiusZ);
  });
}

function paintRoseWindow(
  ctx: CanvasRenderingContext2D,
  point: (u: number, z: number) => ScreenPoint,
  centre: number,
  height: number,
  pal: BuildingPalette,
): void {
  const outer = rosePoints(point, centre, height, 0.86, 10.2);
  const glass = rosePoints(point, centre, height, 0.68, 8.2);
  fillPolygon(ctx, outer, pal.m.wallStone.dark);
  fillPolygon(ctx, rosePoints(point, centre, height, 0.77, 9.2), pal.m.wallStone.light);
  fillPolygon(ctx, glass, pal.m.roofBlue.dark);

  const colours = [pal.m.roofRed.lit, pal.m.gold.lit, pal.m.roofBlue.light, pal.glass.lit];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    const middle = (a0 + a1) / 2;
    fillPolygon(ctx, [
      point(centre + Math.cos(a0) * 0.15, height + Math.sin(a0) * 1.8),
      point(centre + Math.cos(middle) * 0.39, height + Math.sin(middle) * 4.7),
      point(centre + Math.cos(middle) * 0.59, height + Math.sin(middle) * 7.0),
      point(centre + Math.cos(a1) * 0.39, height + Math.sin(a1) * 4.7),
    ], colours[i % colours.length]!);
  }
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    strokeLine(
      ctx,
      point(centre, height),
      point(centre + Math.cos(angle) * 0.68, height + Math.sin(angle) * 8.2),
      pal.m.wallStone.light,
    );
  }
  strokePixelPolygon(ctx, rosePoints(point, centre, height, 0.54, 6.6), pal.m.wallStone.light);
  fillPolygon(ctx, rosePoints(point, centre, height, 0.17, 2.1), pal.m.gold.light);
  strokePixelPolygon(ctx, outer, pal.m.wallStone.light);
}

function paintGothicButtress(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  centreX: number,
  centreY: number,
  width: number,
  depth: number,
  wallTop: number,
  stone: BuildingPalette['m'][MaterialName],
): void {
  box(ctx, o, centreX - width / 2, centreY - depth / 2, centreX + width / 2, centreY + depth / 2, 0, 8, stone, stone.light);
  box(ctx, o, centreX - width * 0.31, centreY - depth * 0.31, centreX + width * 0.31, centreY + depth * 0.31, 8, wallTop - 2, stone);
  box(ctx, o, centreX - width * 0.55, centreY - depth * 0.55, centreX + width * 0.55, centreY + depth * 0.55, wallTop - 2, wallTop + 4, stone, stone.light);
  box(ctx, o, centreX - width * 0.26, centreY - depth * 0.26, centreX + width * 0.26, centreY + depth * 0.26, wallTop + 4, wallTop + 10, stone);
}

function paintFlyingButtress(
  ctx: CanvasRenderingContext2D,
  point: (u: number, z: number) => ScreenPoint,
  centre: number,
  bottom: number,
  half: number,
  height: number,
  stone: BuildingPalette['m'][MaterialName],
): void {
  fillPolygon(ctx, archPoints(point, centre, bottom, half, height), stone.light);
  fillPolygon(ctx, archPoints(point, centre, bottom + 2, half - 0.14, height - 4), stone.shade);
  strokePixelPolygon(ctx, archPoints(point, centre, bottom, half, height), stone.dark);
}

function paintFacadeTower(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  centreX: number,
  frontY: number,
  width: number,
  depth: number,
  shaftTop: number,
  spireTop: number,
  pal: BuildingPalette,
): void {
  const stone = pal.m.wallStone;
  const slate = pal.m.roofSlate;
  const x0 = centreX - width / 2;
  const x1 = centreX + width / 2;
  const backY = frontY - depth;
  const base = 28;
  const south = (u: number, z: number) => at(o, u, frontY, z);
  const east = (u: number, z: number) => at(o, x1, u, z);

  box(ctx, o, x0, backY, x1, frontY, base, shaftTop, stone, stone.light);
  paintPixelCourses(ctx, [
    south(x0, base), south(x1, base), south(x1, shaftTop), south(x0, shaftTop),
  ], 7, 12, { line: stone.shade, joint: stone.dark });
  paintPixelCourses(ctx, [
    east(backY, base), east(frontY, base), east(frontY, shaftTop), east(backY, shaftTop),
  ], 7, 12, { line: stone.dark, joint: stone.shade });

  const towerCentre = (x0 + x1) / 2;
  paintStainedWindow(ctx, south, towerCentre, 34, 0.2, 23, pal);
  for (const offset of [-0.24, 0.24]) {
    const centre = towerCentre + offset;
    paintChurchArch(ctx, south, centre, 67, 0.14, 23, stone.light, pal.outline);
    for (const z of [73, 78, 83]) {
      strokeLine(ctx, south(centre - 0.1, z), south(centre + 0.1, z), stone.shade);
    }
  }
  for (const z of [34, 61, shaftTop - 4]) {
    strokeLine(ctx, south(x0 + 0.08, z), south(x1 - 0.08, z), stone.light);
  }
  for (const x of [x0 + 0.08, x1 - 0.08]) {
    strokeLine(ctx, south(x, base), south(x, shaftTop), stone.light);
  }

  const crown = shaftTop + 5;
  for (const x of [x0 + 0.18, towerCentre, x1 - 0.18]) {
    box(ctx, o, x - 0.1, frontY - 0.04, x + 0.1, frontY + 0.01, shaftTop, crown, stone, stone.light);
  }
  for (const y of [backY + 0.18, (backY + frontY) / 2, frontY - 0.18]) {
    box(ctx, o, x1 - 0.04, y - 0.1, x1 + 0.01, y + 0.1, shaftTop, crown, stone, stone.light);
  }

  const sw = at(o, x0, frontY, crown);
  const se = at(o, x1, frontY, crown);
  const ne = at(o, x1, backY, crown);
  const nw = at(o, x0, backY, crown);
  const apex = at(o, towerCentre, (backY + frontY) / 2, spireTop);
  const faces = [[sw, se, apex], [se, ne, apex], [ne, nw, apex], [nw, sw, apex]];
  for (const face of faces) {
    fillPolygon(ctx, face, face === faces[0] || face === faces[3] ? slate.lit : slate.shade);
    strokePixelPolygon(ctx, face, slate.dark);
  }
  strokeLine(ctx, sw, apex, slate.light);
  strokeLine(ctx, apex, { sx: apex.sx, sy: apex.sy - 12 }, pal.m.gold.lit);
  strokeLine(
    ctx,
    { sx: apex.sx - 4, sy: apex.sy - 7 },
    { sx: apex.sx + 4, sy: apex.sy - 7 },
    pal.m.gold.lit,
  );
}

function paintCathedral(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallCream;
  const slate = pal.m.roofSlate;
  const wood = pal.m.doorWood;
  const { w, d } = b;
  const wallTop = 30;

  box(ctx, o, 0.08, 0.1, w - 0.08, d - 0.1, 0, wallTop, stone, stone.light);

  const southWall = (u: number, z: number) => at(o, u, d - 0.1, z);
  const eastWall = (u: number, z: number) => at(o, w - 0.08, u, z);
  const southFace = [southWall(0.08, 2), southWall(w - 0.08, 2), southWall(w - 0.08, wallTop), southWall(0.08, wallTop)];
  const eastFace = [eastWall(0.1, 2), eastWall(d - 0.1, 2), eastWall(d - 0.1, wallTop), eastWall(0.1, wallTop)];
  paintPixelCourses(ctx, southFace, 6, 12, { line: stone.shade, joint: stone.dark });
  paintPixelCourses(ctx, eastFace, 8, 14, { line: stone.dark, joint: stone.shade });

  for (const centre of [1.35, 3.75, 6.15]) {
    paintFlyingButtress(ctx, eastWall, centre, 7, 0.56, 22, stone);
    paintGothicButtress(ctx, o, w - 0.2, centre, 0.34, 0.42, wallTop, stone);
  }
  for (const centre of [2.5, 4.85, 7.05]) {
    paintStainedWindow(ctx, eastWall, centre, 4, 0.28, 22, pal);
  }

  const ridgeX = w / 2;
  const roofPeak = wallTop + 17;
  fillPolygon(ctx, [
    at(o, 0.08, d - 0.1, wallTop),
    at(o, w - 0.08, d - 0.1, wallTop),
    at(o, ridgeX, d - 0.1, roofPeak),
  ], stone.shade);
  const westEaveBack = at(o, 0.04, 0.05, wallTop);
  const eastEaveBack = at(o, w - 0.04, 0.05, wallTop);
  const westEaveFront = at(o, 0.04, d - 0.05, wallTop);
  const eastEaveFront = at(o, w - 0.04, d - 0.05, wallTop);
  const ridgeBack = at(o, ridgeX, 0.05, roofPeak);
  const ridgeFront = at(o, ridgeX, d - 0.05, roofPeak);
  const westRoof = [westEaveBack, ridgeBack, ridgeFront, westEaveFront];
  const eastRoof = [ridgeBack, eastEaveBack, eastEaveFront, ridgeFront];
  fillPolygon(ctx, westRoof, slate.lit);
  fillPolygon(ctx, eastRoof, slate.shade);
  paintPixelCourses(ctx, westRoof, 12, 8, { line: slate.dark, joint: slate.shade });
  paintPixelCourses(ctx, eastRoof, 12, 8, { line: slate.dark, joint: slate.light });
  strokePixelPolygon(ctx, westRoof, slate.dark);
  strokePixelPolygon(ctx, eastRoof, slate.dark);
  strokeLine(ctx, ridgeBack, ridgeFront, slate.light);
  paintRoseWindow(ctx, southWall, ridgeX, wallTop + 7, pal);

  for (const centre of [0.75, 4.25]) {
    paintFacadeTower(ctx, o, centre, d - 0.1, 1.2, 1.35, 102, centre < ridgeX ? 162 : 148, pal);
  }

  for (const centre of [1.55, 3.45]) {
    paintStainedWindow(ctx, southWall, centre, 25, 0.14, 13, pal);
  }

  const doorCentre = w / 2;
  for (const [centre, half, height] of [
    [doorCentre - 0.95, 0.2, 17],
    [doorCentre, 0.42, 23],
    [doorCentre + 0.95, 0.2, 17],
  ]) {
    paintChurchArch(ctx, southWall, centre, 0, half, height, stone.light, wood.dark);
    strokePixelPolygon(ctx, archPoints(southWall, centre, 0, half + 0.12, height + 2), stone.dark);
    const panel = southWall(centre, height * 0.45);
    strokeLine(ctx, southWall(centre, 2), southWall(centre, height - 4), wood.lit);
    fillPixelRect(ctx, panel.sx + 1, panel.sy - 3, 2, 2, pal.m.gold.lit);
  }
  box(ctx, o, doorCentre - 1.08, d - 0.1, doorCentre + 1.08, d + 0.16, 0, 4, stone, stone.light);
  box(ctx, o, doorCentre - 0.92, d + 0.16, doorCentre + 0.92, d + 0.38, 0, 3, stone, stone.light);
  box(ctx, o, doorCentre - 0.76, d + 0.38, doorCentre + 0.76, d + 0.6, 0, 2, stone, stone.light);
  box(ctx, o, doorCentre - 0.6, d + 0.6, doorCentre + 0.6, d + 0.82, 0, 1, stone, stone.light);
  for (const offset of [-1.35, 1.35]) {
    const lamp = at(o, doorCentre + offset, d + 1.1, 0);
    fillPixelRect(ctx, lamp.sx - 1, lamp.sy - 10, 2, 10, pal.m.iron.lit);
    fillPixelRect(ctx, lamp.sx - 2, lamp.sy - 12, 4, 3, pal.m.gold.lit);
  }
}

function ellipseAt(ctx: CanvasRenderingContext2D, o: Origin, cx: number, cy: number, z: number, r: number, colour: string): void {
  const c = at(o, cx, cy, z);
  const { rx, ry } = ellipseRadii(r);
  const points = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { sx: c.sx + Math.cos(angle) * rx, sy: c.sy + Math.sin(angle) * ry };
  });
  fillPolygon(ctx, points, colour);
}

function paintFountain(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const cx = b.w / 2;
  const cy = b.d / 2;
  const stone = pal.m.wallStone;
  const water = pal.glass;
  // Wide low basin: rim, then the water set a little lower inside it.
  cylinder(ctx, o, cx, cy, 1.38, 0, 4, stone);
  ellipseAt(ctx, o, cx, cy, 3.2, 1.2, water.lit);
  ellipseAt(ctx, o, cx, cy, 3.2, 0.72, mix(water.lit, pal.white, 0.2));
  // A central pedestal with a smaller upper bowl, and a spout.
  cylinder(ctx, o, cx, cy, 0.22, 3, 11, stone);
  cylinder(ctx, o, cx, cy, 0.55, 9, 11.5, stone);
  ellipseAt(ctx, o, cx, cy, 11.5, 0.42, water.lit);
  const top = at(o, cx, cy, 11.5);
  ctx.strokeStyle = mix(water.light, pal.white, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(top.sx, top.sy);
  ctx.lineTo(top.sx, top.sy - 8);
  ctx.moveTo(top.sx - 2.4, top.sy - 1);
  ctx.quadraticCurveTo(top.sx - 3, top.sy - 5, top.sx, top.sy - 6);
  ctx.moveTo(top.sx + 2.4, top.sy - 1);
  ctx.quadraticCurveTo(top.sx + 3, top.sy - 5, top.sx, top.sy - 6);
  ctx.stroke();
}

const STALL_AWNINGS: MaterialName[] = ['awnRed', 'awnYellow', 'awnGreen', 'awnRed'];

function paintStall(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const tone = pal.m[STALL_AWNINGS[b.id % STALL_AWNINGS.length]!];
  const wood = pal.m.doorWood;
  const { w, d } = b;
  const x0 = 0.12;
  const x1 = w - 0.12;
  const y0 = 0.12;
  const y1 = d - 0.12;
  // posts at the back corners first, then the counter, then the canopy over everything
  for (const [x, y] of [[x0, y0], [x1, y0]] as const) {
    const p = at(o, x, y, 0);
    fillPixelRect(ctx, p.sx - 1, p.sy - 16, 2, 16, wood.dark);
  }
  box(ctx, o, x0 + 0.05, y0 + 0.35, x1 - 0.05, y1 - 0.05, 0, 5, wood);
  // goods on the counter
  const goods = [pal.m.roofOrange.lit, pal.m.awnGreen.lit, pal.m.awnRed.lit, pal.m.awnYellow.lit];
  for (let i = 0; i < 6; i++) {
    const p = at(o, x0 + 0.3 + (i * (x1 - x0 - 0.6)) / 5, y1 - 0.25, 5);
    fillPixelRect(ctx, p.sx - 1, p.sy - 2, 2, 2, goods[(i + b.id) % goods.length]!);
  }
  const front = (x: number, z: number) => at(o, x, y1 + 0.2, z);
  const back = (x: number, z: number) => at(o, x, y0, z);
  const n = Math.max(4, Math.round((x1 - x0) / 0.2));
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n;
    const c = x0 + ((x1 - x0) * (i + 1)) / n;
    fillPolygon(ctx, [back(a, 17), back(c, 17), front(c, 11), front(a, 11)], i % 2 === 0 ? tone.lit : pal.white);
  }
  const east = at(o, x1, y1 + 0.2, 11);
  fillPolygon(ctx, [back(x1, 17), east, at(o, x1, y1 + 0.2, 10), at(o, x1, y0, 16)], tone.shade);
  strokeLine(ctx, front(x0, 11), front(x1, 11), tone.dark, 1);
}

function paintBandstand(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const cx = b.w / 2;
  const cy = b.d / 2;
  const stone = pal.m.wallStone;
  cylinder(ctx, o, cx, cy, 0.92, 0, 3.4, stone);
  cylinder(ctx, o, cx, cy, 0.8, 3.4, 4, pal.m.doorWood);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const p = at(o, cx + 0.72 * Math.cos(a), cy + 0.72 * Math.sin(a), 4);
    fillPixelRect(ctx, p.sx - 1, p.sy - 18, 2, 18, i < 3 ? pal.m.wallWhite.shade : pal.m.wallWhite.lit);
  }
  cone(ctx, o, cx, cy, 1.0, 21, 15, pal.m.roofRed);
  const tip = at(o, cx, cy, 36);
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - 5 }, pal.m.gold.lit, 0.9);
}

// A tapering round tower with a cap and four sails on its south-east face.
function paintWindmill(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const cx = b.w / 2;
  const cy = b.d / 2;
  const wall = pal.m.wallCream;
  cylinder(ctx, o, cx, cy, 1.3, 0, 6, pal.m.wallStone);
  cylinder(ctx, o, cx, cy, 1.15, 6, 38, wall);
  cylinder(ctx, o, cx, cy, 0.95, 38, 48, wall);
  cone(ctx, o, cx, cy, 1.08, 48, 15, pal.m.roofBrown);
  // sails radiate from a hub on the viewer's side of the cap
  const hub = at(o, cx + 0.62, cy + 0.62, 42);
  const sail = pal.m.wallWhite;
  const frame = pal.m.doorWood.dark;
  const L = 27;
  for (const a of [0.45, 0.45 + Math.PI / 2]) {
    for (const s of [1, -1]) {
      const dx = Math.cos(a) * L * s;
      const dy = Math.sin(a) * L * s * 0.9;
      const px = -Math.sin(a) * 3.2;
      const py = Math.cos(a) * 3.2;
      fillPolygon(ctx, [{ sx: hub.sx + dx * 0.3 + px * 0.3, sy: hub.sy + dy * 0.3 + py * 0.3 }, { sx: hub.sx + dx + px, sy: hub.sy + dy + py }, { sx: hub.sx + dx, sy: hub.sy + dy }, { sx: hub.sx + dx * 0.3, sy: hub.sy + dy * 0.3 }], s > 0 ? sail.lit : sail.shade);
    }
    strokeLine(ctx, { sx: hub.sx - Math.cos(a) * L, sy: hub.sy - Math.sin(a) * L * 0.9 }, { sx: hub.sx + Math.cos(a) * L, sy: hub.sy + Math.sin(a) * L * 0.9 }, frame, 1.1);
  }
  fillPixelRect(ctx, hub.sx - 2, hub.sy - 2, 4, 4, pal.m.iron.lit);
  // a small door at the foot
  const d = at(o, cx + 0.45, cy + 0.98, 0);
  fillPixelRect(ctx, d.sx - 2, d.sy - 8, 4, 8, pal.m.doorWood.lit);
}

export function paintSpecial(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  switch (b.kind) {
    case 'windmill': return paintWindmill(ctx, o, b, pal);
    case 'fountain': return paintFountain(ctx, o, b, pal);
    case 'stall': return paintStall(ctx, o, b, pal);
    case 'bandstand': return paintBandstand(ctx, o, b, pal);
    case 'cathedral': return paintCathedral(ctx, o, b, pal);
  }
}
