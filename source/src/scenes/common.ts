import { GeoBuilder, M4, V3, m4mul, m4translate } from '../geo';
import type { Ctx } from '../world';

export const T = m4translate;
export const mul = m4mul;

// Seeded pseudo-random for stable blob outlines.
export function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// Blobby rounded outline (star-shaped, safe for prism fans): n vertices, radii jittered.
export function blobOutline(rx: number, rz: number, seed: number, n = 13, jitter = 0.12): [number, number][] {
  const rnd = seeded(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = 1 + (rnd() * 2 - 1) * jitter;
    pts.push([Math.cos(a) * rx * j, Math.sin(a) * rz * j]);
  }
  return pts;
}

// An organic patch of ground the scene stands on, so each story has its own spot on the meadow.
export function patch(ctx: Ctx, cx: number, cz: number, color: V3, edge: V3, rx: number, rz: number, seed: number): number {
  const g = new GeoBuilder();
  // One outline, scaled for the rim: two independently wiggled outlines would
  // cross each other and z-fight where the walls intersect.
  const out = blobOutline(rx, rz, seed);
  const rim = out.map(([x, z]) => [x * 1.05, z * 1.05] as [number, number]);
  g.prism(rim, 0.1, edge, T(cx, ctx.TOP, cz));
  g.prism(out, 0.14, color, T(cx, ctx.TOP, cz));
  ctx.addObj(g, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4);
  return ctx.TOP + 0.14;
}
