// Scene 5: EPFO board eases PF withdrawals. A small EPFO office, two number boards, a piggy bank taking
// coins and a pot with a tap for the Systematic Withdrawal Plan, with pensioners walking up to the door.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotZ, m4scale } from '../geo';
import type { Ctx } from '../world';
import { T, patch } from './common';
import { IDENT as I, banner, personGeo } from './kit';
import { fitText, roundRect } from './text';

export function buildEpfo(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.97, 0.92, 0.74], [0.82, 0.7, 0.45], 5.3, 5.1, 31);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);
  const gold: V3 = [0.96, 0.78, 0.22];

  // the office
  {
    const g = new GeoBuilder();
    g.box(5.4, 0.18, 3.0, [0.82, 0.8, 0.74], X(0, 0.09, -2.2));
    g.box(4.7, 2.3, 2.4, [0.98, 0.94, 0.84], X(0, 1.33, -2.2));
    g.box(5.1, 0.3, 2.8, [0.2, 0.42, 0.74], X(0, 2.62, -2.2));
    g.box(1.0, 1.45, 0.1, [0.4, 0.27, 0.2], X(0, 0.9, -0.98));
    g.box(0.8, 0.75, 0.08, [0.72, 0.88, 0.96], X(-1.65, 1.5, -0.98));
    g.box(0.8, 0.75, 0.08, [0.72, 0.88, 0.96], X(1.65, 1.5, -0.98));
    g.box(1.4, 0.12, 0.7, [0.86, 0.84, 0.78], X(0, 0.24, -0.7));
    ctx.addObj(g, I);
  }
  const frieze = ctx.makeTex(512, 128, (c, w, h) => {
    roundRect(c, 4, 4, w - 8, h - 8, 22); c.fillStyle = '#1d4f9c'; c.fill();
    fitText(c, 'EPFO', w / 2, h / 2 + 2, w - 60, 92, 900, '#ffffff');
  });
  ctx.addDecal({ tex: frieze, model: X(0, 2.08, -0.97), w: 1.9, h: 0.5 });

  // two boards with the numbers from the release
  const board = (x: number, top: string, mid: string, low: string, bg: string) => {
    const tex = ctx.makeTex(512, 384, (c, w, h) => {
      roundRect(c, 6, 6, w - 12, h - 12, 34); c.fillStyle = bg; c.fill();
      c.lineWidth = 8; c.strokeStyle = '#ffffff'; c.stroke();
      fitText(c, top, w / 2, 70, w - 50, 40, 800, '#e8f6ec');
      fitText(c, mid, w / 2, 190, w - 40, 110, 900, '#ffffff');
      fitText(c, low, w / 2, 312, w - 50, 40, 800, '#ffe9a8');
    });
    const g = new GeoBuilder();
    g.cyl(0.06, 0.06, 1.2, 7, [0.45, 0.4, 0.38], X(x, 0, 0.5));
    ctx.addObj(g, I);
    ctx.addDecal({ tex, model: X(x, 1.95, 0.5), w: 2.3, h: 1.72, billboard: true });
  };
  board(-3.9, 'MINIMUM BALANCE KEPT', '25% to 10%', 'BOARD APPROVED', '#1f7a4d');
  board(3.9, 'WAIT FOR FINAL WITHDRAWAL', '12 to 2', 'MONTHS', '#8a4fb0');

  // piggy bank on the left, coins dropping into its slot
  {
    const pink: V3 = [0.96, 0.64, 0.72], dark: V3 = [0.78, 0.4, 0.5];
    const P = (x: number, y: number, z: number) => X(-1.8 + x, y, 2.3 + z);
    const g = new GeoBuilder();
    g.sphere(0.85, 14, 9, pink, m4mul(P(0, 1.0, 0), m4scale(1.25, 1, 1)));
    g.cyl(0.3, 0.3, 0.3, 10, dark, m4mul(P(1.1, 1.0, 0), m4rotZ(-Math.PI / 2)));
    g.sphere(0.12, 8, 5, [0.5, 0.2, 0.3], P(1.43, 1.08, 0.1));
    g.sphere(0.12, 8, 5, [0.5, 0.2, 0.3], P(1.43, 1.08, -0.1));
    g.cyl(0.2, 0.0, 0.32, 6, dark, m4mul(P(0.65, 1.8, 0.45), m4rotX(0.3)));
    g.cyl(0.2, 0.0, 0.32, 6, dark, m4mul(P(0.65, 1.8, -0.45), m4rotX(-0.3)));
    for (const [lx, lz] of [[-0.6, 0.4], [-0.6, -0.4], [0.6, 0.4], [0.6, -0.4]] as [number, number][]) g.cyl(0.17, 0.15, 0.4, 8, pink, P(lx, 0, lz));
    g.box(0.5, 0.04, 0.1, [0.3, 0.12, 0.2], P(0, 1.87, 0));
    ctx.addObj(g, I, { anim: 'bob', phase: 1, amp: 0.02 });
  }
  for (let k = 0; k < 3; k++) {
    const g = new GeoBuilder();
    g.cyl(0.2, 0.2, 0.06, 14, gold, m4rotX(Math.PI / 2));
    ctx.addObj(g, I, {
      update: (t) => {
        const u = ((t * 0.36 + k / 3) % 1);
        if (u > 0.82) return T(0, -90, 0);
        return m4mul(T(at.x - 1.8, Y + 3.6 - u / 0.82 * 1.75, at.z + 2.3), m4rotX(Math.PI / 2 + t * 2.5 + k));
      },
    });
  }

  // pension pot with a tap on the right: payouts come out in instalments, not all at once
  {
    const P = (x: number, y: number, z: number) => X(1.5 + x, y, 2.1 + z);
    const g = new GeoBuilder();
    g.cyl(0.85, 0.8, 0.2, 14, [0.5, 0.45, 0.4], P(0, 0, 0));
    g.cyl(0.8, 0.95, 1.3, 14, gold, P(0, 0.2, 0));
    g.cyl(1.0, 1.0, 0.14, 14, [0.82, 0.62, 0.15], P(0, 1.5, 0));
    g.cyl(0.05, 0.05, 0.4, 7, [0.45, 0.45, 0.5], m4mul(P(0, 0.9, 0.92), m4rotX(Math.PI / 2)));
    g.box(0.1, 0.16, 0.1, [0.85, 0.2, 0.2], P(0, 1.02, 1.0));
    ctx.addObj(g, I);
    const tex = ctx.makeTex(512, 160, (c, w, h) => {
      roundRect(c, 4, 4, w - 8, h - 8, 26); c.fillStyle = '#fff4cf'; c.fill();
      c.lineWidth = 6; c.strokeStyle = '#a77a14'; c.stroke();
      fitText(c, 'SWP PAYOUTS', w / 2, h * 0.4, w - 50, 70, 900, '#5a3d08');
      fitText(c, 'in instalments', w / 2, h * 0.78, w - 60, 38, 700, '#7a5a1c');
    });
    ctx.addDecal({ tex, model: P(0, 2.35, 0), w: 1.9, h: 0.6, billboard: true });
  }
  for (let k = 0; k < 3; k++) {
    const g = new GeoBuilder();
    g.cyl(0.18, 0.18, 0.06, 14, gold, m4rotX(Math.PI / 2));
    ctx.addObj(g, I, {
      update: (t) => {
        const u = ((t * 0.3 + k / 3) % 1);
        if (u > 0.9) return T(0, -90, 0);
        const v = u / 0.9;
        return m4mul(T(at.x + 1.5, Y + 1.0 + 0.7 * v - 1.55 * v * v, at.z + 3.1 + 0.95 * v), m4rotX(0.4 + t * 3 + k));
      },
    });
  }
  { // coins collected beside the tap
    const g = new GeoBuilder();
    for (let i = 0; i < 4; i++) g.cyl(0.2, 0.2, 0.06, 12, gold, X(1.5, 0.04 + i * 0.07, 4.15));
    ctx.addObj(g, I);
  }

  // pensioners walking to the office door
  const from: V3 = [at.x - 0.8, Y, at.z + 3.9], to: V3 = [at.x - 0.2, Y, at.z + 0.2];
  ([[[0.92, 0.72, 0.56], [0.85, 0.5, 0.3]], [[0.72, 0.5, 0.36], [0.4, 0.55, 0.8]], [[0.92, 0.72, 0.56], [0.7, 0.45, 0.6]]] as [V3, V3][]).forEach(([sk, sh], i) => {
    ctx.addObj(personGeo(sk, sh, { grey: true }), I, {
      anim: 'walk', phase: i / 3, amp: 0.05,
      walkPath: { from: [from[0] + i * 0.7, from[1], from[2]], to: [to[0] + i * 0.55, to[1], to[2]], speed: 0.04 },
    });
  });

  banner(ctx, at, Y, 'EPFO EASES PF WITHDRAWALS', 'BOARD APPROVED THURSDAY 19 NOV', '#12365e', '#2c6aa8', '#e8f2fb', '#bfe0ff');
}
