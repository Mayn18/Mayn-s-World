import type { Bounds } from './bounds';

export const MAX_TERRAIN_CACHE_BYTES = 64 * 1024 * 1024;

export interface CacheResolution {
  scale: number;
  width: number;
  height: number;
  bytes: number;
}

export function cacheResolution(
  bounds: Bounds,
  maxViewScale: number,
  devicePixelRatio: number,
): CacheResolution {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const requestedScale = Math.max(
    1,
    Number.isFinite(maxViewScale) && maxViewScale > 0 ? maxViewScale * dpr : 1,
  );
  const baseWidth = Math.max(1, Math.ceil(bounds.width));
  const baseHeight = Math.max(1, Math.ceil(bounds.height));
  const maxScale = Math.sqrt(
    (MAX_TERRAIN_CACHE_BYTES * 0.99) / (baseWidth * baseHeight * 4),
  );
  const tierScale = 2 ** Math.ceil(Math.log2(requestedScale));
  const scale = Math.max(1, Math.min(tierScale, maxScale));
  const width = Math.max(1, Math.ceil(bounds.width * scale));
  const height = Math.max(1, Math.ceil(bounds.height * scale));

  return { scale, width, height, bytes: width * height * 4 };
}
