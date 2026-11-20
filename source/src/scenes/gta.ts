// Scene 1: game night. Two players, a TV showing the GTA VI title, PS5 and Xbox on the shelf.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotZ, m4scale } from '../geo';
import { C } from '../palette';
import type { Ctx } from '../world';
import { T, patch } from './common';
import { fitText, roundRect, FONT } from './text';

export function buildGta(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.86, 0.8, 0.9], [0.62, 0.55, 0.72], 6, 6, 11);
  const RM = m4mul(T(at.x, Y, at.z + 0.3), m4scale(1.5, 1.5, 1.5));
  const L = (x: number, y: number, z: number): M4 => m4mul(RM, T(x, y, z));
  const mul = m4mul;
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4;

  // room shell
  {
    const g = new GeoBuilder();
    g.box(5, 0.14, 4, C.floor, L(0, 0.07, 0.4));
    g.box(5, 1.9, 0.16, C.wall, L(0, 0.95, -1.62));
    g.box(0.16, 1.9, 4, C.wallSide, L(-2.5, 0.95, 0.4));
    g.box(5, 0.12, 0.05, C.wallSide, L(0, 0.2, -1.5));
    ctx.addObj(g, I);
  }
  { // rug
    const g = new GeoBuilder();
    g.disc(1.15, 20, C.rug, L(0, 0.16, 2.05));
    g.disc(0.8, 20, [0.65, 0.79, 0.83], L(0, 0.165, 2.05));
    ctx.addObj(g, I);
  }
  { // TV, stand, glowing screen
    const g = new GeoBuilder();
    g.box(2.0, 0.3, 0.5, [0.4, 0.28, 0.2], L(0, 0.29, -1.28));
    g.box(0.1, 0.12, 0.3, [0.2, 0.2, 0.22], L(0, 0.5, -1.3));
    g.box(1.9, 1.08, 0.09, [0.16, 0.17, 0.2], L(0, 1.1, -1.3));
    ctx.addObj(g, I);
    const s = new GeoBuilder();
    s.box(1.74, 0.94, 0.03, C.screen, L(0, 1.1, -1.245));
    ctx.addObj(s, I, { anim: 'screen', glow: 0.35, glowCol: [0.45, 0.7, 1.0] });
  }
  // the TV shows the game's title
  const tvTex = ctx.makeTex(512, 256, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2a1450'); bg.addColorStop(0.55, '#e0467c'); bg.addColorStop(1, '#ff9a3c');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(w / 2, h * 0.62, 70, Math.PI, 0); c.fill();
    c.fillStyle = '#2a1450';
    c.fillRect(0, h * 0.78, w, h);
    const tg = c.createLinearGradient(0, h * 0.15, 0, h * 0.6);
    tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#ffc1e0');
    fitText(c, 'GTA VI', w / 2, h * 0.38, w * 0.8, 120, 900, tg);
    fitText(c, 'VICE CITY', w / 2, h * 0.88, w * 0.6, 34, 800, '#ffd36b');
  });
  ctx.addDecal({ tex: tvTex, model: L(0, 1.1, -1.22), w: 1.74, h: 0.94, glow: 0.4 });

  // consoles on the shelf next to the TV: PS5 (white) and Xbox (black), each labelled
  {
    const g = new GeoBuilder();
    g.box(0.16, 0.62, 0.34, [0.96, 0.96, 0.98], L(1.45, 0.77, -1.28));
    g.box(0.08, 0.5, 0.3, [0.2, 0.22, 0.3], L(1.45, 0.77, -1.28));
    g.box(0.26, 0.44, 0.26, [0.1, 0.1, 0.12], L(-1.45, 0.67, -1.28));
    g.cyl(0.07, 0.07, 0.01, 12, [0.4, 0.85, 0.35], L(-1.45, 0.89, -1.28));
    g.box(0.9, 0.08, 0.5, [0.4, 0.28, 0.2], L(1.45, 0.4, -1.28));
    g.box(0.9, 0.08, 0.5, [0.4, 0.28, 0.2], L(-1.45, 0.4, -1.28));
    ctx.addObj(g, I);
  }
  const label = (text: string, sub: string, bg: string) => ctx.makeTex(256, 128, (c, w, h) => {
    roundRect(c, 4, 4, w - 8, h - 8, 28); c.fillStyle = bg; c.fill();
    fitText(c, text, w / 2, sub ? h * 0.38 : h / 2, w - 36, 64, 900, '#fff');
    if (sub) fitText(c, sub, w / 2, h * 0.74, w - 36, 28, 700, 'rgba(255,255,255,.9)');
  });
  ctx.addDecal({ tex: label('PS5', '', '#1d4fd8'), model: L(1.45, 1.38, -1.2), w: 0.5, h: 0.25, billboard: true });
  ctx.addDecal({ tex: label('XBOX', 'Series X|S', '#2a7d2a'), model: L(-1.45, 1.38, -1.2), w: 0.6, h: 0.3, billboard: true });

  // couch
  {
    const g = new GeoBuilder();
    g.box(2.3, 0.42, 0.95, C.couch, L(0, 0.35, 0.85));
    g.box(2.3, 0.55, 0.28, C.couchDark, L(0, 0.62, 1.27));
    g.box(0.28, 0.62, 0.95, C.couchDark, L(-1.15, 0.45, 0.85));
    g.box(0.28, 0.62, 0.95, C.couchDark, L(1.15, 0.45, 0.85));
    g.box(0.95, 0.16, 0.8, C.couchDark, L(-0.55, 0.6, 0.8));
    g.box(0.95, 0.16, 0.8, C.couchDark, L(0.55, 0.6, 0.8));
    ctx.addObj(g, I);
  }
  function figure(x: number, z: number, skin: V3, shirt: V3, phase: number) {
    const g = new GeoBuilder();
    const S = 1.35;
    const M = mul(L(x, 0, z), m4scale(S, S, S));
    const F = (px: number, py: number, pz: number) => mul(M, T(px, py, pz));
    g.cyl(0.17, 0.15, 0.42, 10, shirt, F(0, 0.36, 0));
    g.sphere(0.17, 12, 8, skin, F(0, 0.92, 0));
    g.sphere(0.175, 12, 8, [0.2, 0.14, 0.1], mul(F(0, 1.0, 0.04), m4scale(1, 0.55, 1)));
    g.box(0.13, 0.11, 0.4, C.pants, F(-0.1, 0.19, -0.24));
    g.box(0.13, 0.11, 0.4, C.pants, F(0.1, 0.19, -0.24));
    g.box(0.12, 0.1, 0.26, C.pants, F(-0.1, 0.16, -0.5));
    g.box(0.12, 0.1, 0.26, C.pants, F(0.1, 0.16, -0.5));
    g.box(0.09, 0.09, 0.34, shirt, mul(F(-0.2, 0.58, -0.16), m4rotX(-0.5)));
    g.box(0.09, 0.09, 0.34, shirt, mul(F(0.2, 0.58, -0.16), m4rotX(-0.5)));
    g.box(0.24, 0.07, 0.13, [0.15, 0.15, 0.18], F(0, 0.52, -0.36));
    return ctx.addObj(g, I, { anim: 'bob', phase, amp: 0.035 * 1.5, glow: 0.06, glowCol: [0.4, 1, 0.6] });
  }
  figure(-0.7, 1.95, C.skin, C.shirtA, 0);
  figure(0.7, 1.95, C.skin2, C.shirtB, Math.PI * 0.7);
  { // coffee table, pizza, cola
    const g = new GeoBuilder();
    g.box(1.3, 0.07, 0.65, [0.55, 0.4, 0.28], L(0, 0.38, -0.45));
    for (const [dx, dz] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]] as [number, number][]) {
      g.box(0.07, 0.36, 0.07, [0.45, 0.32, 0.22], L(dx, 0.18, -0.45 + dz));
    }
    g.box(0.55, 0.05, 0.55, [0.92, 0.75, 0.5], L(-0.25, 0.45, -0.45));
    g.box(0.55, 0.02, 0.55, [0.95, 0.8, 0.55], mul(L(-0.25, 0.5, -0.72), m4rotX(-0.35)));
    g.cyl(0.05, 0.05, 0.16, 10, [0.85, 0.2, 0.2], L(0.32, 0.42, -0.55));
    g.cyl(0.05, 0.05, 0.16, 10, [0.85, 0.2, 0.2], mul(L(0.48, 0.47, -0.35), m4rotZ(1.4)));
    ctx.addObj(g, I);
  }
  { // lamp and plant
    const g = new GeoBuilder();
    g.cyl(0.03, 0.03, 1.5, 8, [0.3, 0.3, 0.32], L(2.0, 0.14, -0.55));
    g.cyl(0.16, 0.26, 0.34, 10, C.lampGlow, L(2.0, 1.32, -0.55));
    ctx.addObj(g, I, { glow: 0.5, glowCol: C.lampGlow });
    const p = new GeoBuilder();
    p.cyl(0.16, 0.13, 0.24, 10, C.pot, L(-2.0, 0.14, -0.55));
    p.sphere(0.22, 10, 7, C.plant, L(-2.0, 0.55, -0.55));
    p.sphere(0.15, 10, 7, C.plant, L(-1.9, 0.75, -0.5));
    ctx.addObj(p, I);
  }

  // big readable title sign standing behind the flat
  const sign = ctx.makeTex(1024, 256, (c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 40);
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2a1450'); g.addColorStop(1, '#8a1f6a');
    c.fillStyle = g; c.fill();
    c.lineWidth = 8; c.strokeStyle = '#ffb347'; c.stroke();
    const tg = c.createLinearGradient(0, 30, 0, 170);
    tg.addColorStop(0, '#fff'); tg.addColorStop(1, '#ff9ad0');
    fitText(c, 'GTA VI IS OUT', w / 2, 98, w - 120, 150, 900, tg);
    fitText(c, 'NOW AVAILABLE ON PS5 AND XBOX SERIES X|S', w / 2, 205, w - 100, 44, 800, '#ffd36b');
  });
  {
    const g = new GeoBuilder();
    g.cyl(0.08, 0.08, 4.0, 8, [0.4, 0.38, 0.42], T(at.x - 3.0, Y, at.z - 3.5));
    g.cyl(0.08, 0.08, 4.0, 8, [0.4, 0.38, 0.42], T(at.x + 3.0, Y, at.z - 3.5));
    ctx.addObj(g, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as M4);
  }
  ctx.addDecal({ tex: sign, model: T(at.x, Y + 5.2, at.z - 3.45), w: 8.4, h: 2.1, billboard: true });
  void FONT;
}
