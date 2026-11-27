export const ACTOR_RENDER_ZOOM = 1.55;

// These thresholds consume the camera's zoom factor, not its fitted screen scale.
export function actorsVisible(cameraZoom: number): boolean {
  return cameraZoom >= ACTOR_RENDER_ZOOM;
}

export function fireflyCount(available: number, cameraZoom: number): number {
  const limit = cameraZoom < 1.35 ? 4 : cameraZoom < 2 ? 12 : available;
  return Math.min(available, limit);
}

export function waterTileEffectVisible(x: number, y: number, cameraZoom: number): boolean {
  if (cameraZoom >= 2.25) return true;
  const cadence = cameraZoom < 1.5 ? 3 : 2;
  return (x * 17 + y * 31) % cadence === 0;
}
