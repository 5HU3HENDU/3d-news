// Scene 6: four cheetah cubs born at Kuno. A mother cheetah on dry grass, four cubs trotting round her,
// an acacia, a Kuno sign and a counter board for India's 62 cheetahs.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotY, m4rotZ, m4scale } from '../geo';
import type { Ctx } from '../world';
import { T, patch, seeded } from './common';
import { IDENT as I, banner } from './kit';
import { fitText, roundRect } from './text';

const FUR: V3 = [0.93, 0.76, 0.36], BELLY: V3 = [0.99, 0.91, 0.72], SPOT: V3 = [0.2, 0.14, 0.1];

// A cheetah at the origin, facing +x. s scales the whole animal.
function cheetahGeo(s: number, seed: number) {
  const g = new GeoBuilder();
  const P = (x: number, y: number, z: number): M4 => m4mul(m4scale(s, s, s), T(x, y, z));
  g.box(1.1, 0.4, 0.46, FUR, P(0, 0.8, 0));
  g.sphere(0.3, 10, 7, FUR, m4mul(P(-0.55, 0.8, 0), m4scale(s * 1, s * 1, s * 1)));
  g.box(0.5, 0.46, 0.42, FUR, P(0.45, 0.84, 0));
  g.box(0.9, 0.12, 0.34, BELLY, P(0, 0.62, 0));
  g.box(0.3, 0.55, 0.26, FUR, m4mul(P(0.8, 1.05, 0), m4rotZ(-0.45)));
  g.sphere(0.2, 10, 7, FUR, P(1.02, 1.28, 0));
  g.box(0.22, 0.13, 0.16, BELLY, P(1.22, 1.2, 0));
  g.sphere(0.04, 6, 4, SPOT, P(1.33, 1.24, 0));
  g.sphere(0.07, 6, 4, FUR, P(0.95, 1.46, 0.12));
  g.sphere(0.07, 6, 4, FUR, P(0.95, 1.46, -0.12));
  g.box(0.025, 0.14, 0.02, SPOT, P(1.17, 1.15, 0.07));
  g.box(0.025, 0.14, 0.02, SPOT, P(1.17, 1.15, -0.07));
  for (const [lx, lz] of [[-0.45, 0.17], [-0.45, -0.17], [0.5, 0.17], [0.5, -0.17]] as [number, number][]) {
    g.box(0.13, 0.62, 0.13, FUR, P(lx, 0.31, lz));
    g.box(0.18, 0.06, 0.15, SPOT, P(lx + 0.03, 0.03, lz));
  }
  // tail: three segments sweeping back and up, dark tip
  g.box(0.5, 0.1, 0.1, FUR, m4mul(P(-0.95, 0.9, 0), m4rotZ(0.28)));
  g.box(0.5, 0.1, 0.1, FUR, m4mul(P(-1.4, 1.02, 0), m4rotZ(0.1)));
  g.box(0.14, 0.11, 0.11, SPOT, P(-1.7, 1.04, 0));
  const rnd = seeded(seed);
  for (let i = 0; i < 16; i++) {
    const x = -0.5 + rnd() * 1.15, z = (rnd() * 2 - 1) * 0.2;
    g.sphere(0.045, 5, 4, SPOT, m4mul(P(x, 1.0 + (Math.abs(z) < 0.1 ? 0 : -0.05), z), m4scale(s, s * 0.5, s)));
  }
  return g;
}

export function buildCheetah(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.9, 0.82, 0.52], [0.72, 0.62, 0.36], 5.4, 5.2, 41);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);

  // mother, resting with a gentle breathing bob
  ctx.addObj(cheetahGeo(1.5, 7), m4mul(X(-0.9, 0, 0.6), m4rotY(-0.5)), { anim: 'bob', phase: 0.4, amp: 0.02 });

  // four cubs trotting in little circles around her
  const cubCols = [0, 1, 2, 3];
  cubCols.forEach((i) => {
    const cx = -0.9 + (i % 2 ? 0.6 : -0.3), cz = 0.6 + (i < 2 ? 1.9 : 2.5), r = 0.8 + (i % 3) * 0.25;
    const sp = 0.5 + i * 0.07, ph = i * 1.7, dir = i % 2 ? 1 : -1;
    ctx.addObj(cheetahGeo(0.7, 20 + i), I, {
      update: (t) => {
        const a = t * sp * dir + ph;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.7;
        const dx = -Math.sin(a) * r * dir, dz = Math.cos(a) * r * 0.7 * dir;
        return m4mul(X(x, Math.abs(Math.sin(t * 7 + ph)) * 0.04, z), m4rotY(Math.atan2(-dz, dx)));
      },
    });
  });

  // acacia
  {
    const g = new GeoBuilder();
    const trunk: V3 = [0.45, 0.32, 0.22];
    g.cyl(0.18, 0.12, 2.1, 8, trunk, X(2.9, 0, -1.4));
    g.cyl(0.1, 0.07, 0.9, 7, trunk, m4mul(X(3.0, 1.9, -1.4), m4rotZ(-0.6)));
    g.cyl(0.1, 0.07, 0.9, 7, trunk, m4mul(X(2.8, 1.9, -1.4), m4rotZ(0.6)));
    const leaf: V3 = [0.42, 0.62, 0.3];
    g.sphere(1.1, 10, 6, leaf, m4mul(X(2.9, 2.75, -1.4), m4scale(1.7, 0.4, 1.3)));
    g.sphere(0.8, 10, 6, [0.36, 0.56, 0.27], m4mul(X(3.7, 2.45, -1.2), m4scale(1.4, 0.35, 1.1)));
    g.sphere(0.8, 10, 6, [0.36, 0.56, 0.27], m4mul(X(2.0, 2.4, -1.5), m4scale(1.4, 0.35, 1.1)));
    ctx.addObj(g, I, { anim: 'sway', phase: 3, amp: 0.03 });
  }
  // rocks and grass tufts
  {
    const g = new GeoBuilder();
    g.sphere(0.5, 8, 5, [0.62, 0.58, 0.54], m4mul(X(-3.3, 0.2, -1.2), m4scale(1.4, 0.8, 1)));
    g.sphere(0.35, 8, 5, [0.58, 0.54, 0.5], m4mul(X(-2.7, 0.12, -1.8), m4scale(1.2, 0.7, 1)));
    ctx.addObj(g, I);
    const t = new GeoBuilder();
    const rnd = seeded(77);
    for (let i = 0; i < 22; i++) {
      const a = rnd() * 6.28, r = 1.5 + rnd() * 3.2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
      t.cyl(0.07, 0.0, 0.4 + rnd() * 0.25, 5, [0.78, 0.7, 0.34], X(x, 0, z));
    }
    ctx.addObj(t, I, { anim: 'sway', phase: 5, amp: 0.05 });
  }

  // Kuno signpost and the counter board
  const sign = ctx.makeTex(512, 128, (c, w, h) => {
    roundRect(c, 4, 4, w - 8, h - 8, 20); c.fillStyle = '#6b4a2b'; c.fill();
    c.lineWidth = 6; c.strokeStyle = '#3f2a16'; c.stroke();
    fitText(c, 'KUNO NATIONAL PARK', w / 2, h / 2, w - 40, 56, 900, '#fbe9c8');
  });
  {
    const g = new GeoBuilder();
    g.cyl(0.06, 0.06, 1.0, 7, [0.4, 0.28, 0.18], X(-2.7, 0, 3.4));
    g.cyl(0.06, 0.06, 1.0, 7, [0.4, 0.28, 0.18], X(-1.3, 0, 3.4));
    ctx.addObj(g, I);
  }
  ctx.addDecal({ tex: sign, model: X(-2.0, 0.95, 3.4), w: 1.8, h: 0.5, billboard: true });
  const count = ctx.makeTex(512, 384, (c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 34); c.fillStyle = '#2f5d34'; c.fill();
    c.lineWidth = 8; c.strokeStyle = '#fbe9c8'; c.stroke();
    fitText(c, 'CHEETAHS IN INDIA', w / 2, 70, w - 40, 44, 800, '#e5f3df');
    fitText(c, '62', w / 2, 200, w - 40, 190, 900, '#ffd36b');
    fitText(c, '43 BORN HERE', w / 2, 320, w - 50, 42, 800, '#e5f3df');
  });
  {
    const g = new GeoBuilder();
    g.cyl(0.06, 0.06, 1.1, 7, [0.45, 0.4, 0.38], X(3.3, 0, 2.0));
    ctx.addObj(g, I);
  }
  ctx.addDecal({ tex: count, model: X(3.3, 1.95, 2.0), w: 2.1, h: 1.58, billboard: true });
  void m4rotX;

  banner(ctx, at, Y, '4 CHEETAH CUBS BORN AT KUNO', "INDIA'S CHEETAH COUNT IS NOW 62", '#4a3512', '#a8782a', '#fbe9c8', '#ffe2a0');
}
