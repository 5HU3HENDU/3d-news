// Scene 3: India vs New Zealand, 1st Test at the Basin Reserve, Wellington. Day 2 stumps score.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotY, m4rotZ, m4scale } from '../geo';
import { C } from '../palette';
import type { Ctx } from '../world';
import { CRICKET } from '../data';
import { T, patch } from './common';
import { fitText, roundRect, FONT } from './text';

export function buildCricket(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.74, 0.88, 0.62], [0.5, 0.7, 0.4], 9, 9, 13);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4;
  // outfield mow stripes: concentric rings at ONE height. The old nested discs
  // sat 0.005 apart and z-fought on 16-bit phone depth buffers ("grass flicker").
  {
    const g = new GeoBuilder();
    const sx = 1.32, y = 0.02, cz = 0.6, seg = 48;
    const bands: [number, number, V3][] = [
      [0, 2.7, [0.52, 0.78, 0.42]],
      [2.7, 3.8, [0.45, 0.72, 0.36]],
      [3.8, 5.0, [0.52, 0.78, 0.42]],
      [5.0, 6.2, [0.45, 0.72, 0.36]],
    ];
    for (const [r0, r1, col] of bands) {
      for (let si = 0; si < seg; si++) {
        const a0 = (si / seg) * Math.PI * 2, a1 = ((si + 1) / seg) * Math.PI * 2;
        const p = (a: number, r: number): V3 => [at.x + Math.cos(a) * r * sx, Y + y, at.z + cz + Math.sin(a) * r];
        g.quad(p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1), col);
      }
    }
    ctx.addObj(g, I);
  }
  {
    const g = new GeoBuilder();
    g.box(7.4, 0.03, 1.15, [0.86, 0.76, 0.52], X(0, 0.04, 0.6));
    for (const sx of [-3.0, 3.0]) {
      g.box(0.05, 0.035, 1.5, [0.98, 0.98, 0.95], X(sx - Math.sign(sx) * 0.25, 0.06, 0.6));
      g.box(1.15, 0.035, 0.05, [0.98, 0.98, 0.95], X(sx - Math.sign(sx) * 0.25, 0.06, 0.6 + 0.55));
      g.box(1.15, 0.035, 0.05, [0.98, 0.98, 0.95], X(sx - Math.sign(sx) * 0.25, 0.06, 0.6 - 0.55));
      for (const sz of [-0.09, 0, 0.09]) g.cyl(0.028, 0.028, 0.86, 8, [0.95, 0.9, 0.7], X(sx, 0.05, 0.6 + sz));
      g.box(0.04, 0.03, 0.12, [0.9, 0.85, 0.6], X(sx, 0.93, 0.6 - 0.045));
      g.box(0.04, 0.03, 0.12, [0.9, 0.85, 0.6], X(sx, 0.93, 0.6 + 0.045));
    }
    // boundary rope: small posts around the oval
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      g.box(0.12, 0.1, 0.12, [0.98, 0.98, 0.95], X(Math.cos(a) * 6.2 * 1.32, 0.08, 0.6 + Math.sin(a) * 6.2));
    }
    ctx.addObj(g, I);
  }

  // players: facing +z in local space, then rotated
  function person(x: number, z: number, rot: number, cap: V3, trim: V3, opts: { bat?: boolean; armsUp?: boolean; phase?: number; skin?: V3 } = {}) {
    const g = new GeoBuilder();
    const skin = opts.skin || C.skin;
    const M = m4mul(X(x, 0, z), m4rotY(rot));
    const F = (px: number, py: number, pz: number) => m4mul(M, T(px, py, pz));
    const white: V3 = [0.97, 0.97, 0.95];
    g.box(0.12, 0.48, 0.12, white, F(-0.08, 0.24, 0));
    g.box(0.12, 0.48, 0.12, white, F(0.08, 0.24, 0));
    g.cyl(0.19, 0.16, 0.5, 10, white, F(0, 0.46, 0));
    g.box(0.38, 0.06, 0.2, trim, F(0, 0.92, 0));
    g.sphere(0.16, 12, 8, skin, F(0, 1.12, 0));
    g.sphere(0.17, 12, 8, cap, m4mul(F(0, 1.2, 0.02), m4scale(1, 0.62, 1)));
    g.box(0.18, 0.03, 0.12, cap, F(0, 1.2, 0.17));
    if (opts.armsUp) {
      g.box(0.08, 0.4, 0.08, white, m4mul(F(-0.2, 0.95, 0.05), m4rotZ(-0.35)));
      g.box(0.08, 0.4, 0.08, white, m4mul(F(0.2, 0.95, 0.05), m4rotZ(0.35)));
    } else {
      g.box(0.08, 0.34, 0.08, white, m4mul(F(-0.22, 0.7, 0.05), m4rotX(-0.5)));
      g.box(0.08, 0.34, 0.08, white, m4mul(F(0.22, 0.7, 0.05), m4rotX(-0.5)));
    }
    if (opts.bat) {
      g.box(0.1, 0.78, 0.05, [0.9, 0.75, 0.5], m4mul(F(0.12, 0.35, 0.3), m4rotX(0.25)));
    }
    ctx.addObj(g, I, { anim: 'bob', phase: opts.phase || 0, amp: 0.025 });
  }
  const blue: V3 = [0.12, 0.3, 0.75], black: V3 = [0.1, 0.1, 0.12];
  // India: striker at the right-hand stumps (facing the bowler on the left), non-striker at the bowler's end
  person(2.6, 0.6, -Math.PI / 2, blue, blue, { bat: true });
  person(-3.4, 1.6, Math.PI / 2, blue, blue, { phase: 1.3, skin: C.skin2 });
  // New Zealand: bowler, keeper, slips, outfield
  person(-1.9, 0.6, Math.PI / 2, black, black, { armsUp: true, phase: 0.4 });
  person(4.0, 0.6, -Math.PI / 2, black, black, { phase: 2.1, skin: C.skin2 });
  person(4.3, -0.9, -Math.PI / 2, black, black, { phase: 0.9 });
  person(1.2, -3.4, 0, black, black, { phase: 1.6 });
  person(-1.6, 4.6, Math.PI, black, black, { phase: 2.7, skin: C.skin2 });
  person(5.8, 3.6, -2.4, black, black, { phase: 0.2 });
  person(-5.5, -1.6, 1.4, black, black, { phase: 3.1 });

  // the ball, bowled over and over
  {
    const g = new GeoBuilder();
    g.sphere(0.09, 10, 7, [0.8, 0.12, 0.12]);
    ctx.addObj(g, I, {
      update: (t) => {
        const P = 3.4, u = (t % P) / P;
        if (u > 0.78) return T(0, -50, 0); // out of sight between deliveries
        const k = u / 0.78;
        const x = -1.9 + (2.5 + 1.9) * k;
        const bounce = 0.7 * (1 - k) * Math.abs(Math.sin(k * Math.PI * 1.5));
        return T(at.x + x, Y + 0.3 + bounce, at.z + 0.6);
      },
    });
  }

  // crowd stand along the back, little coloured spectators who bob
  {
    const g = new GeoBuilder();
    for (let r = 0; r < 3; r++) g.box(16.4, 0.55, 0.6, [0.38 + r * 0.04, 0.4 + r * 0.04, 0.46 + r * 0.04], X(0, 0.28 + r * 0.55, -6.3 - r * 0.55));
    ctx.addObj(g, I);
    const cols: V3[] = [[0.9, 0.3, 0.3], [0.2, 0.4, 0.85], [0.95, 0.8, 0.25], [0.97, 0.97, 0.95], [0.15, 0.15, 0.18], [0.35, 0.7, 0.4]];
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let part = 0; part < 2; part++) {
      const f = new GeoBuilder();
      for (let r = 0; r < 3; r++) for (let i = 0; i < 24; i++) {
        if ((i + part) % 2) continue;
        f.sphere(0.18, 7, 5, cols[Math.floor(rnd() * cols.length)], X(-7.6 + i * 0.66, 0.78 + r * 0.55, -6.3 - r * 0.55));
      }
      ctx.addObj(f, I, { anim: 'bob', phase: part * 1.9, amp: 0.07 });
    }
  }

  // scoreboard: fixed day 2 stumps numbers
  const board = ctx.makeTex(1024, 512, (c, w, h) => {
    roundRect(c, 8, 8, w - 16, h - 16, 40);
    c.fillStyle = '#10241a'; c.fill();
    c.lineWidth = 10; c.strokeStyle = '#e9d9a6'; c.stroke();
    fitText(c, 'INDIA  vs  NEW ZEALAND', w / 2, 78, w - 80, 80, 900, '#ffffff');
    fitText(c, '1st Test, Day 2 stumps  |  Basin Reserve, Wellington', w / 2, 142, w - 80, 38, 700, '#bfe8c9');
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(60, 175, w - 120, 3);
    // rows
    c.textBaseline = 'middle';
    c.font = `900 80px ${FONT}`;
    c.textAlign = 'left'; c.fillStyle = '#e8e8ea'; c.fillText('NZ', 70, 245);
    c.textAlign = 'right'; c.fillStyle = '#ffd24a'; c.fillText(`${CRICKET.nz} all out`, w - 70, 245);
    c.textAlign = 'left'; c.fillStyle = '#6fa8ff'; c.fillText('IND', 70, 345);
    c.textAlign = 'right'; c.fillStyle = '#ffd24a'; c.fillText(CRICKET.ind, w - 70, 345);
    fitText(c, `India trail by ${CRICKET.trail} runs`, w / 2, 418, w - 100, 40, 800, '#ffffff');
    fitText(c, 'Jaiswal 85  |  Rahul 52*  |  Padikkal 16*', w / 2, 466, w - 100, 32, 700, '#bfe8c9');
  });
  {
    const g = new GeoBuilder();
    g.cyl(0.09, 0.09, 2.4, 8, [0.4, 0.42, 0.46], X(-3.6, 0, -7.9));
    g.cyl(0.09, 0.09, 2.4, 8, [0.4, 0.42, 0.46], X(3.6, 0, -7.9));
    ctx.addObj(g, I);
  }
  ctx.addDecal({ tex: board, model: X(0, 4.6, -7.9), w: 8.2, h: 4.1, billboard: true });
}
