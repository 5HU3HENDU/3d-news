// Scene 2: Cyclone Akvan at the Odisha coast near Gopalpur (landfall 7:30 to 8:30 AM, 20 Nov).
// Water shown: heavy rain, rough sea, and small puddles on low ground only. No flooded homes or streets.
import { GeoBuilder, M4, V3, m4invert, m4mul, m4rotX, m4rotY, m4rotZ, m4scale } from '../geo';
import { C } from '../palette';
import type { Ctx } from '../world';
import { T, patch } from './common';
import { fitText, roundRect } from './text';

const FONT5: Record<string, string[]> = {
  O: ['111', '101', '101', '101', '111'],
  D: ['110', '101', '101', '101', '110'],
  I: ['111', '010', '010', '010', '111'],
  S: ['111', '100', '111', '001', '111'],
  H: ['101', '101', '111', '101', '101'],
  A: ['010', '101', '111', '101', '101'],
};

export function buildCyclone(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.78, 0.9, 0.93], [0.52, 0.7, 0.78], 11, 8, 12);
  const dx = at.x - 4.8, dz = at.z - 1.0;       // scene was designed around local (4.8, 1.0)
  const TT = (x: number, y: number, z: number) => T(x + dx, y, z + dz);
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4;
  const mix3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  // grass underlay, sand beach, sea with a foam edge
  {
    const g = new GeoBuilder();
    g.disc(4.6, 30, C.sand, TT(3.0, Y + 0.04, 0.8));
    ctx.addObj(g, I);
    const f = new GeoBuilder();
    f.disc(4.5, 30, C.seaFoam, TT(10.0, Y + 0.08, 0.8));
    ctx.addObj(f, I);
    const s = new GeoBuilder();
    const seg = 24, rings = 5, R = 4.1;
    for (let ri = 0; ri < rings; ri++) {
      const r0 = (ri / rings) * R, r1 = ((ri + 1) / rings) * R;
      for (let si = 0; si < seg; si++) {
        const a0 = (si / seg) * Math.PI * 2, a1 = ((si + 1) / seg) * Math.PI * 2;
        s.quad(
          [Math.cos(a0) * r0, 0, Math.sin(a0) * r0], [Math.cos(a1) * r0, 0, Math.sin(a1) * r0],
          [Math.cos(a1) * r1, 0, Math.sin(a1) * r1], [Math.cos(a0) * r1, 0, Math.sin(a0) * r1],
          [0.2, 0.55, 0.68],
        );
      }
    }
    ctx.addObj(s, TT(10.0, Y + 0.14, 0.8), { wave: 0.03 });
  }
  // small puddles of rainwater on low ground (Chief Secretary: low-lying areas filled with rainwater)
  {
    const g = new GeoBuilder();
    const puddles: [number, number, number][] = [[-3.4, -0.3, 0.8], [-2.6, 1.9, 0.55], [-4.1, 2.5, 0.45], [-1.1, -1.6, 0.5], [-3.0, -1.4, 0.4]];
    for (const [x, z, r] of puddles) g.disc(r, 16, [0.5, 0.74, 0.86], TT(x, Y + 0.06, z));
    ctx.addObj(g, I, { wave: 0.01 });
  }
  // ODISHA block letters, bounced by the wind
  {
    const word = 'ODISHA';
    const cell = 0.32, depth = 0.6, gap = 0.26;
    const letterW = 3 * cell;
    const totalW = word.length * letterW + (word.length - 1) * gap;
    let x0 = 2.6 - totalW / 2;
    for (let li = 0; li < word.length; li++) {
      const rows = FONT5[word[li]];
      const g = new GeoBuilder();
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
        if (rows[r][c] === '1') {
          g.box(cell * 0.96, cell * 0.96, depth, li === 0 ? C.letterO : C.letter,
            TT(x0 + c * cell + cell / 2, Y + 0.02 + (4 - r) * cell + cell / 2, 2.9));
        }
      }
      const home = TT(x0 + 1.5 * cell, Y + 0.02 + 2.5 * cell, 2.9);
      const inv = m4invert(home);
      const idx = li;
      ctx.addObj(g, home, {
        update: (t) => {
          const P = 9, lt = (t % P) / P;
          const s = 0.28 + idx * 0.06, dur = 0.3;
          let dy = 0, ddx = 0, rz = Math.sin(t * 2 + idx * 0.8) * 0.03;
          if (lt > s && lt < s + dur) {
            const p = (lt - s) / dur;
            dy = Math.sin(p * Math.PI) * 0.55; ddx = Math.sin(p * Math.PI) * 0.35;
            rz = Math.sin(p * Math.PI * 2) * 0.55;
          }
          return m4mul(T(ddx, dy, 0), m4mul(home, m4mul(m4rotZ(rz), inv)));
        },
      });
      x0 += letterW + gap;
    }
  }
  // the cyclone at the coast
  {
    const g = new GeoBuilder();
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const r = 0.4 + t * 1.9, y = 0.45 + t * 3.2;
      g.cyl(r, r + 0.28, 0.26, 18, mix3(C.cloud, [0.62, 0.66, 0.72], t * 0.9), T(0, y, 0), true, false);
    }
    for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 7; i++) {
      const t = i / 6, ang = arm * (Math.PI * 2 / 3) + t * 2.2, r = 0.5 + t * 2.0, y = 0.55 + t * 3.1, s = 0.16 + t * 0.3;
      g.sphere(0.5, 8, 6, mix3(C.cloud, [0.6, 0.64, 0.7], t * 0.8), m4mul(T(Math.cos(ang) * r, y, Math.sin(ang) * r), m4scale(s * 1.7, s * 0.7, s * 1.7)));
    }
    ctx.addObj(g, TT(7.0, Y + 0.1, -0.2), { anim: 'spin', amp: 0.8 });
  }
  // rain: four layers of streaks falling and looping
  for (let layer = 0; layer < 4; layer++) {
    const g = new GeoBuilder();
    let seed = 7 + layer * 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 34; i++) {
      const x = -1.5 + rnd() * 12.5, z = -3.2 + rnd() * 7.4, y = rnd() * 6.5;
      g.box(0.025, 0.45, 0.025, [0.78, 0.9, 0.98], m4mul(TT(x, Y + y, z), m4rotZ(0.18)));
    }
    const sp = 5.5 + layer * 0.9, ph = layer * 1.7, H = 6.5;
    const base = I;
    ctx.addObj(g, base, { update: (t) => T(0, -(((t * sp + ph) % H)) + 0.6, 0) });
  }
  // palm trees bending in the wind
  const palm = (x: number, z: number, lean: number) => {
    const g = new GeoBuilder();
    let px = 0;
    for (let i = 0; i < 4; i++) {
      g.cyl(0.09 - i * 0.012, 0.08 - i * 0.012, 0.5, 7, C.trunk, m4mul(TT(x + px, Y + i * 0.42, z), m4rotZ(lean * 0.12 * i)));
      px += lean * 0.09;
    }
    const topX = x + px, topY = Y + 4 * 0.42 + 0.05;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.box(0.95, 0.05, 0.22, C.palm, m4mul(TT(topX, topY, z), m4mul(m4rotY(a), m4mul(T(0.42, 0.05, 0), m4rotZ(-0.45)))));
    }
    g.sphere(0.12, 8, 6, C.trunk, TT(topX, topY, z));
    ctx.addObj(g, I, { anim: 'sway', phase: x * 1.7, amp: 0.06 });
  };
  palm(0.2, -1.4, 1.2);
  palm(4.6, -2.6, 1.4);
  palm(8.2, 3.2, 0.9);
  // shelter, flag, signpost
  {
    const g = new GeoBuilder();
    g.box(1.8, 1.0, 1.3, C.hut, TT(-2.2, Y + 0.5, -3.0));
    g.cyl(1.25, 0.06, 0.7, 4, C.roof, m4mul(TT(-2.2, Y + 1.0, -3.0), m4rotY(Math.PI / 4)));
    g.box(0.4, 0.65, 0.05, [0.35, 0.22, 0.16], TT(-2.2, Y + 0.325, -2.34));
    g.cyl(0.02, 0.02, 1.0, 6, [0.4, 0.4, 0.42], TT(-2.2, Y + 1.5, -3.0));
    g.box(0.34, 0.2, 0.02, C.roof, TT(-2.02, Y + 2.3, -3.0));
    g.cyl(0.035, 0.035, 1.0, 7, [0.45, 0.35, 0.25], TT(0.4, Y, -0.6));
    g.box(0.6, 0.22, 0.05, C.sign, TT(0.4, Y + 0.85, -0.6));
    g.prism([[0, 0.11], [-0.22, 0], [0, -0.11]], 0.05, C.roof, TT(0.12, Y + 0.74, -0.6));
    ctx.addObj(g, I);
  }
  // evacuees walking to the shelter
  const walker = (skin: V3, shirt: V3) => {
    const g = new GeoBuilder();
    g.cyl(0.15, 0.13, 0.4, 9, shirt, T(0, 0.5, 0));
    g.sphere(0.15, 10, 7, skin, T(0, 1.02, 0));
    g.sphere(0.15, 10, 7, [0.2, 0.14, 0.1], m4mul(T(0, 1.1, 0.02), m4scale(1, 0.5, 1)));
    g.box(0.11, 0.4, 0.11, C.pants, T(-0.08, 0.2, 0));
    g.box(0.11, 0.4, 0.11, C.pants, T(0.08, 0.2, 0.02));
    g.box(0.08, 0.32, 0.08, shirt, m4mul(T(-0.22, 0.72, 0), m4rotZ(0.25)));
    g.box(0.08, 0.32, 0.08, shirt, m4mul(T(0.22, 0.72, 0), m4rotZ(-0.25)));
    return g;
  };
  const from: V3 = [3.0 + dx, Y, 1.5 + dz], to: V3 = [-2.0 + dx, Y, -2.2 + dz];
  ([[C.skin, [0.85, 0.5, 0.3]], [C.skin2, [0.4, 0.6, 0.8]], [C.skin, [0.7, 0.45, 0.65]], [C.skin2, [0.9, 0.8, 0.3]]] as [V3, V3][]).forEach(([sk, sh], i) => {
    ctx.addObj(walker(sk, sh), I, { anim: 'walk', phase: i / 4, amp: 0.05, walkPath: { from, to, speed: 0.045 } });
  });
  void m4rotX;

  // GOPALPUR signboard on the beach
  const gop = ctx.makeTex(512, 128, (c, w, h) => {
    roundRect(c, 4, 4, w - 8, h - 8, 22); c.fillStyle = '#f7ecd0'; c.fill();
    c.lineWidth = 6; c.strokeStyle = '#7a4b2a'; c.stroke();
    fitText(c, 'GOPALPUR', w / 2, h / 2, w - 50, 80, 900, '#4a2b18');
  });
  {
    const g = new GeoBuilder();
    g.cyl(0.05, 0.05, 1.3, 7, [0.45, 0.35, 0.25], TT(1.2, Y, 0.1));
    g.cyl(0.05, 0.05, 1.3, 7, [0.45, 0.35, 0.25], TT(3.2, Y, 0.1));
    ctx.addObj(g, I);
  }
  ctx.addDecal({ tex: gop, model: TT(2.2, Y + 1.35, 0.1), w: 2.4, h: 0.6, billboard: true });

  // headline banner
  const banner = ctx.makeTex(1024, 256, (c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 40);
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#16334d'); g.addColorStop(1, '#3b6f93');
    c.fillStyle = g; c.fill();
    c.lineWidth = 8; c.strokeStyle = '#e8f4fb'; c.stroke();
    fitText(c, 'CYCLONE AKVAN HITS ODISHA', w / 2, 92, w - 90, 104, 900, '#ffffff');
    fitText(c, 'LANDFALL NEAR GOPALPUR, 7:30 TO 8:30 AM TODAY', w / 2, 187, w - 100, 46, 800, '#bfe3f5');
  });
  {
    const g = new GeoBuilder();
    g.cyl(0.08, 0.08, 3.8, 8, [0.4, 0.42, 0.46], T(at.x - 3.6, Y, at.z - 5.4));
    g.cyl(0.08, 0.08, 3.8, 8, [0.4, 0.42, 0.46], T(at.x + 3.6, Y, at.z - 5.4));
    ctx.addObj(g, I);
  }
  ctx.addDecal({ tex: banner, model: T(at.x, Y + 5.0, at.z - 5.35), w: 8.4, h: 2.1, billboard: true });
}
