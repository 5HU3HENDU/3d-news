import { GeoBuilder, M4, V3, m4mul, m4translate } from '../geo';
import type { Ctx } from '../world';

export const T = m4translate;

// A flat coloured plinth the scene stands on, so each story has its own patch of the canvas.
export function tile(ctx: Ctx, cx: number, cz: number, color: V3, edge: V3, w = 19, d = 16): number {
  const g = new GeoBuilder();
  g.box(w + 0.5, 0.1, d + 0.5, edge, T(cx, ctx.TOP + 0.05, cz));
  g.box(w, 0.14, d, color, T(cx, ctx.TOP + 0.07, cz));
  ctx.addObj(g, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4);
  return ctx.TOP + 0.14;
}
export const mul = m4mul;
