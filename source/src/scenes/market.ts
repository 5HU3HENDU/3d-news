// Scene 4: a little stock exchange. Sensex and Nifty on the roof display, green when up, red when down.
// The numbers are the fixed closing levels from data.ts. The chart joins Thursday's close to Friday's close.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotY, m4scale } from '../geo';
import { C } from '../palette';
import type { Ctx } from '../world';
import { MARKET } from '../data';
import { T, patch } from './common';
import { fitText, roundRect, FONT } from './text';

export function buildMarket(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.86, 0.9, 0.95], [0.6, 0.68, 0.8], 6.5, 7, 14);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4;
  const stone: V3 = [0.93, 0.9, 0.84], stoneDark: V3 = [0.84, 0.8, 0.73];
  const up = MARKET.sensex.up && MARKET.nifty.up; // arrows follow the broad market direction
  const down = !MARKET.sensex.up && !MARKET.nifty.up;

  // building
  {
    const g = new GeoBuilder();
    g.box(10, 0.15, 6.2, stoneDark, X(0, 0.075 + 0.0, 0.4));
    g.box(9.2, 0.15, 5.4, stone, X(0, 0.225, 0.1));
    g.box(8.4, 0.15, 4.6, stoneDark, X(0, 0.375, -0.2));
    g.box(7.0, 2.6, 3.4, [0.88, 0.84, 0.76], X(0, 0.45 + 1.3, -0.4));
    g.box(1.2, 1.7, 0.12, [0.25, 0.28, 0.34], X(0, 0.45 + 0.85, 1.32)); // doorway
    for (let i = 0; i < 6; i++) g.cyl(0.22, 0.2, 2.6, 12, stone, X(-3.2 + i * 1.28, 0.45, 1.65));
    g.box(7.8, 0.5, 4.4, stone, X(0, 3.3, -0.2));
    const zf = 2.0, zb = -2.4, w = 3.9, hh = 1.3, y0 = 3.55;
    const P = (x: number, y: number, z: number): V3 => [at.x + x, Y + y, at.z + z];
    const Af = P(-w, y0, zf), Bf = P(w, y0, zf), Pf = P(0, y0 + hh, zf);
    const Ab = P(-w, y0, zb), Bb = P(w, y0, zb), Pb = P(0, y0 + hh, zb);
    g.tri(Af, Bf, Pf, stoneDark);
    g.tri(Ab, Pb, Bb, stoneDark);
    g.quad(Ab, Af, Pf, Pb, [0.8, 0.45, 0.35]);
    g.quad(Pb, Pf, Bf, Bb, [0.8, 0.45, 0.35]);
    // posts that hold the roof display
    g.cyl(0.1, 0.1, 1.05, 8, [0.35, 0.37, 0.42], X(-3.2, 3.55, -0.4));
    g.cyl(0.1, 0.1, 1.05, 8, [0.35, 0.37, 0.42], X(3.2, 3.55, -0.4));
    ctx.addObj(g, I);
  }
  const frieze = ctx.makeTex(1024, 128, (c, w, h) => {
    fitText(c, 'STOCK  EXCHANGE', w / 2, h / 2, w - 80, 86, 900, '#4a4338');
  });
  ctx.addDecal({ tex: frieze, model: X(0, 3.3, 2.03), w: 6.2, h: 0.5 });

  // bull on the left of the steps
  {
    const g = new GeoBuilder();
    const gold: V3 = [0.85, 0.62, 0.2];
    const B = (x: number, y: number, z: number) => X(-5.6 + x, 0.15 + y, 3.3 + z);
    g.box(2.0, 0.25, 1.0, [0.6, 0.58, 0.55], B(0, 0.125, 0));
    g.box(1.5, 0.75, 0.7, gold, B(0, 0.85, 0));
    g.box(0.5, 0.5, 0.55, gold, B(0.45, 1.3, 0));
    g.box(0.5, 0.45, 0.45, gold, B(1.0, 1.0, 0));
    g.cyl(0.07, 0.01, 0.3, 6, [0.97, 0.95, 0.88], m4mul(B(1.12, 1.25, 0.2), m4mul(m4rotX(-0.9), T(0, 0, 0))));
    g.cyl(0.07, 0.01, 0.3, 6, [0.97, 0.95, 0.88], m4mul(B(1.12, 1.25, -0.2), m4rotX(0.9)));
    for (const [lx, lz] of [[-0.55, 0.22], [-0.55, -0.22], [0.5, 0.22], [0.5, -0.22]] as [number, number][]) g.box(0.16, 0.5, 0.16, gold, B(lx, 0.5, lz));
    ctx.addObj(g, I, { anim: 'bob', phase: 0.5, amp: 0.02 });
  }
  // arrows on the roof: up and green today, down and red if the market were down
  const arrowCol: V3 = up ? [0.18, 0.82, 0.4] : down ? [0.92, 0.3, 0.3] : [0.9, 0.75, 0.2];
  const arrow = (x: number, ph: number) => {
    const g = new GeoBuilder();
    g.box(0.5, 1.1, 0.35, arrowCol, T(0, 0.55, 0));
    g.cyl(0.62, 0.0, 0.9, 4, arrowCol, m4mul(T(0, 1.1, 0), m4rotY(Math.PI / 4)));
    const base = down ? m4mul(X(x, 4.7 + 1.9, -0.4), m4rotX(Math.PI)) : X(x, 4.7, -0.4);
    ctx.addObj(g, base, {
      update: (t) => m4mul(T(0, Math.sin(t * 2.2 + ph) * 0.25 * (down ? -1 : 1), 0), base),
    });
  };
  arrow(-5.0, 0); arrow(5.0, 1.6);

  // coins spinning near the steps
  for (let i = 0; i < 3; i++) {
    const g = new GeoBuilder();
    g.cyl(0.3, 0.3, 0.07, 18, [0.95, 0.78, 0.2], m4mul(T(0, 0, -0.035), m4rotX(Math.PI / 2)));
    ctx.addObj(g, X(4.4 + i * 1.1, 1.1 + (i % 2) * 0.3, 3.7), { anim: 'spin', amp: 1.4 + i * 0.3, phase: i });
  }
  // traders walking up to the building
  const walker = (skin: V3, shirt: V3) => {
    const g = new GeoBuilder();
    g.cyl(0.15, 0.13, 0.4, 9, shirt, T(0, 0.5, 0));
    g.sphere(0.15, 10, 7, skin, T(0, 1.02, 0));
    g.sphere(0.15, 10, 7, [0.2, 0.14, 0.1], m4mul(T(0, 1.1, 0.02), m4scale(1, 0.5, 1)));
    g.box(0.11, 0.4, 0.11, C.pants, T(-0.08, 0.2, 0));
    g.box(0.11, 0.4, 0.11, C.pants, T(0.08, 0.2, 0.02));
    g.box(0.34, 0.26, 0.1, [0.25, 0.25, 0.3], T(0.2, 0.62, 0.1)); // briefcase
    return g;
  };
  const from: V3 = [at.x - 2.4, Y, at.z + 7.0], to: V3 = [at.x - 0.6, Y + 0.0, at.z + 3.6];
  ([[C.skin, [0.2, 0.3, 0.5]], [C.skin2, [0.5, 0.2, 0.25]], [C.skin, [0.25, 0.45, 0.35]]] as [V3, V3][]).forEach(([sk, sh], i) => {
    const f: V3 = [from[0] + i * 1.6, from[1], from[2]], t: V3 = [to[0] + i * 1.4, to[1], to[2]];
    ctx.addObj(walker(sk, sh), I, { anim: 'walk', phase: i / 3, amp: 0.05, walkPath: { from: f, to: t, speed: 0.05 } });
  });

  // the roof display: the day's reviewed story leads; exact closing levels and dated status below
  const screen = ctx.makeTex(1024, 512, (c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 36);
    c.fillStyle = '#0b1220'; c.fill();
    c.lineWidth = 8; c.strokeStyle = '#8fb4ff'; c.stroke();
    fitText(c, 'Markets close at 9-month highs', w / 2, 96, w - 60, 84, 900, '#ffffff');
    fitText(c, 'Sensex +898 (+1.08%) · Nifty +286 (+1.12%)', w / 2, 214, w - 50, 62, 800, '#ffd24a');
    fitText(c, "Banks lead Friday's rally", w / 2, 308, w - 50, 62, 800, '#7fd99a');
    c.strokeStyle = 'rgba(143,180,255,.35)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(60, 356); c.lineTo(w - 60, 356); c.stroke();
    fitText(c, `SENSEX ${MARKET.sensex.value} (${MARKET.sensex.points})  ·  NIFTY 50 ${MARKET.nifty.value} (${MARKET.nifty.points})`, w / 2, 404, w - 70, 38, 700, '#9fb0cf');
    fitText(c, `${MARKET.date.toUpperCase()} CLOSE  |  NOT LIVE`, w / 2, 462, w - 70, 34, 800, '#ffd24a');
  });
  const base = X(0, 6.5, -0.4);
  ctx.addDecal({ tex: screen, model: base, w: 7.6, h: 3.8, billboard: true, glow: 0.5 });
}
