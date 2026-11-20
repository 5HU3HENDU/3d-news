// Shared building blocks for the newer scenes: a headline banner on two poles and a small walking person.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotZ, m4scale } from '../geo';
import { C } from '../palette';
import type { Ctx } from '../world';
import { T } from './common';
import { fitText, roundRect } from './text';

export const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4;

// A big readable headline board standing behind a scene, like the ones on the first four scenes.
export function banner(
  ctx: Ctx, at: { x: number; z: number }, Y: number, title: string, sub: string,
  c0: string, c1: string, edge: string, subCol: string, back = 4.6,
) {
  const tex = ctx.makeTex(1024, 256, (c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 40);
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    c.fillStyle = g; c.fill();
    c.lineWidth = 8; c.strokeStyle = edge; c.stroke();
    fitText(c, title, w / 2, 94, w - 90, 100, 900, '#ffffff');
    fitText(c, sub, w / 2, 190, w - 100, 46, 800, subCol);
  });
  const g = new GeoBuilder();
  g.cyl(0.08, 0.08, 3.9, 8, [0.4, 0.4, 0.44], T(at.x - 3.3, Y, at.z - back));
  g.cyl(0.08, 0.08, 3.9, 8, [0.4, 0.4, 0.44], T(at.x + 3.3, Y, at.z - back));
  ctx.addObj(g, IDENT);
  ctx.addDecal({ tex, model: T(at.x, Y + 4.9, at.z - back + 0.05), w: 7.6, h: 1.9, billboard: true });
}

// A small person at the origin, facing +z, for the 'walk' animation or a gentle bob.
export function personGeo(skin: V3, shirt: V3, opts: { hair?: V3; tray?: boolean; paper?: boolean; grey?: boolean; scale?: number } = {}) {
  const g = new GeoBuilder();
  const s = opts.scale ?? 1;
  const M = m4scale(s, s, s);
  const P = (x: number, y: number, z: number) => m4mul(M, T(x, y, z));
  g.cyl(0.15, 0.13, 0.4, 9, shirt, P(0, 0.5, 0));
  g.sphere(0.15, 10, 7, skin, P(0, 1.02, 0));
  g.sphere(0.15, 10, 7, opts.grey ? [0.85, 0.85, 0.88] : (opts.hair ?? [0.2, 0.14, 0.1]), m4mul(P(0, 1.1, 0.02), m4scale(1, 0.5, 1)));
  g.box(0.11, 0.4, 0.11, C.pants, P(-0.08, 0.2, 0));
  g.box(0.11, 0.4, 0.11, C.pants, P(0.08, 0.2, 0.02));
  if (opts.tray) {
    g.box(0.08, 0.3, 0.08, shirt, m4mul(P(-0.2, 0.72, 0.12), m4rotX(-0.9)));
    g.box(0.08, 0.3, 0.08, shirt, m4mul(P(0.2, 0.72, 0.12), m4rotX(-0.9)));
    g.box(0.5, 0.03, 0.34, [0.8, 0.8, 0.84], P(0, 0.82, 0.32));
    g.cyl(0.05, 0.04, 0.1, 8, [0.95, 0.95, 0.9], P(-0.1, 0.84, 0.32));
    g.cyl(0.05, 0.04, 0.1, 8, [0.9, 0.35, 0.3], P(0.1, 0.84, 0.32));
  } else if (opts.paper) {
    g.box(0.08, 0.3, 0.08, shirt, m4mul(P(-0.2, 0.72, 0.1), m4rotX(-0.8)));
    g.box(0.08, 0.3, 0.08, shirt, m4mul(P(0.2, 0.72, 0.1), m4rotX(-0.8)));
    g.box(0.3, 0.02, 0.38, [0.97, 0.97, 0.95], m4mul(P(0, 0.78, 0.3), m4rotX(0.25)));
  } else {
    g.box(0.08, 0.32, 0.08, shirt, m4mul(P(-0.22, 0.72, 0), m4rotZ(0.25)));
    g.box(0.08, 0.32, 0.08, shirt, m4mul(P(0.22, 0.72, 0), m4rotZ(-0.25)));
  }
  return g;
}
