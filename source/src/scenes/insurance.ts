// Scene 7: IRDAI plans clearer health-insurance claims. A small claims hall with a wall screen showing the
// PLANNED claim tracker (pre-authorisation, discharge, settlement), and two tables for the two working groups.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotY } from '../geo';
import type { Ctx } from '../world';
import { T, patch } from './common';
import { IDENT as I, banner, personGeo } from './kit';
import { FONT, fitText, roundRect } from './text';

export function buildInsurance(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.88, 0.94, 0.97], [0.6, 0.74, 0.84], 5.4, 5.2, 51);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);
  const white: V3 = [0.97, 0.97, 0.98];

  // the hall
  {
    const g = new GeoBuilder();
    g.box(5.6, 0.16, 3.0, [0.78, 0.8, 0.84], X(0, 0.08, -2.0));
    g.box(5.0, 2.6, 2.5, white, X(0, 1.46, -2.0));
    g.box(5.4, 0.28, 2.9, [0.25, 0.55, 0.62], X(0, 2.9, -2.0));
    g.box(0.9, 1.4, 0.1, [0.3, 0.55, 0.65], X(-1.9, 0.86, -0.73));
    ctx.addObj(g, I);
    // red cross above the door
    const c = new GeoBuilder();
    c.box(0.2, 0.6, 0.06, [0.88, 0.2, 0.22], X(-1.9, 2.1, -0.72));
    c.box(0.6, 0.2, 0.06, [0.88, 0.2, 0.22], X(-1.9, 2.1, -0.72));
    ctx.addObj(c, I);
  }

  // wall screen: the PLANNED claim tracker, a dot slides along the three steps
  const screen = ctx.makeTex(1024, 512, (c, w, h) => {
    const t = performance.now() / 1000;
    roundRect(c, 6, 6, w - 12, h - 12, 34);
    c.fillStyle = '#0d2236'; c.fill();
    c.lineWidth = 8; c.strokeStyle = '#7fd0d8'; c.stroke();
    fitText(c, 'CLAIM TRACKER', w / 2, 62, w - 80, 66, 900, '#ffffff');
    roundRect(c, w / 2 - 250, 104, 500, 56, 28); c.fillStyle = '#ffb347'; c.fill();
    fitText(c, 'PLANNED, NOT LIVE YET', w / 2, 133, 460, 36, 900, '#3a2400');
    const xs = [150, 512, 874], y = 262;
    const names = ['PRE-AUTH', 'DISCHARGE', 'SETTLEMENT'];
    c.lineWidth = 10; c.strokeStyle = '#3a5a78'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(xs[0], y); c.lineTo(xs[2], y); c.stroke();
    const k = (t * 0.22) % 1;
    const px = xs[0] + (xs[2] - xs[0]) * k;
    c.strokeStyle = '#4fe3a0';
    c.beginPath(); c.moveTo(xs[0], y); c.lineTo(px, y); c.stroke();
    xs.forEach((x, i) => {
      const done = px >= x - 1;
      c.fillStyle = done ? '#4fe3a0' : '#27415c';
      c.beginPath(); c.arc(x, y, 30, 0, Math.PI * 2); c.fill();
      c.lineWidth = 6; c.strokeStyle = '#cfeaf0'; c.stroke();
      c.fillStyle = done ? '#06361f' : '#9fb7cc'; c.font = `900 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(i + 1), x, y + 2);
      fitText(c, names[i], x, y + 70, 300, 46, 900, '#cfe3f0');
    });
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(px, y, 12, 0, Math.PI * 2); c.fill();
    fitText(c, 'ALSO PLANNED: STANDARD REJECTION REASONS', w / 2, 400, w - 70, 38, 800, '#ffd36b');
    fitText(c, 'IRDAI CHAIRMAN, THU 19 NOV', w / 2, 456, w - 70, 32, 700, '#8fa9bf');
  });
  ctx.addDecal({ tex: screen, model: X(0.65, 1.55, -0.72), w: 3.5, h: 1.75, glow: 0.35 });
  let last = 0;
  ctx.onFrame((t) => { if (t - last > 0.12) { last = t; screen.redraw(); } });

  // two working-group tables, each with a placard
  const table = (x: number, z: number, label: string, tint: string, skins: [V3, V3], phase: number) => {
    const g = new GeoBuilder();
    g.cyl(0.9, 0.9, 0.08, 16, [0.62, 0.45, 0.3], X(x, 0.72, z));
    g.cyl(0.1, 0.1, 0.72, 8, [0.45, 0.32, 0.22], X(x, 0, z));
    g.box(0.5, 0.02, 0.36, white, m4mul(X(x - 0.2, 0.82, z + 0.1), m4rotY(0.3)));
    g.box(0.5, 0.02, 0.36, [0.85, 0.93, 0.98], m4mul(X(x + 0.3, 0.82, z - 0.15), m4rotY(-0.4)));
    ctx.addObj(g, I);
    const tex = ctx.makeTex(512, 192, (c, w, h) => {
      roundRect(c, 4, 4, w - 8, h - 8, 26); c.fillStyle = tint; c.fill();
      c.lineWidth = 6; c.strokeStyle = '#ffffff'; c.stroke();
      fitText(c, label.split('|')[0], w / 2, h * 0.3, w - 40, 64, 900, '#ffffff');
      fitText(c, label.split('|')[1], w / 2, h * 0.7, w - 30, 46, 800, '#eaf6ff');
    });
    ctx.addDecal({ tex, model: X(x, 2.25, z), w: 2.5, h: 0.94, billboard: true });
    const p = new GeoBuilder();
    p.cyl(0.04, 0.04, 1.0, 6, [0.45, 0.45, 0.5], X(x, 0.75, z));
    ctx.addObj(p, I);
    ([[-0.95, 0], [0.95, Math.PI]] as [number, number][]).forEach(([dx, rot], i) => {
      const f = personGeo(skins[i], i ? [0.3, 0.55, 0.85] : [0.9, 0.45, 0.4], { paper: true });
      ctx.addObj(f, m4mul(X(x + dx * 0.9, 0, z), m4rotY(rot + Math.PI / 2 * (dx > 0 ? -1 : 1) * 1)), { anim: 'bob', phase: phase + i, amp: 0.02 });
    });
  };
  table(-1.9, 2.0, 'GROUP 1|LIVE CLAIM VISIBILITY', '#1f7a8c', [[0.92, 0.72, 0.56], [0.72, 0.5, 0.36]], 0);
  table(2.2, 2.2, 'GROUP 2|COMMON CLAIM MEASURES', '#7a4fb0', [[0.72, 0.5, 0.36], [0.92, 0.72, 0.56]], 1.3);

  // papers drifting from the tables up to the hall
  for (let k = 0; k < 3; k++) {
    const g = new GeoBuilder();
    g.box(0.34, 0.02, 0.44, white);
    const fx = k % 2 ? 2.2 : -1.9, fz = k % 2 ? 2.2 : 2.0;
    ctx.addObj(g, I, {
      update: (t) => {
        const u = (t * 0.17 + k / 3) % 1;
        const x = fx + (-0.6 - fx) * u, z = fz + (-0.6 - fz) * u;
        return m4mul(X(x, 1.2 + Math.sin(u * Math.PI) * 0.9, z), m4mul(m4rotY(t * 1.7 + k), m4rotX(0.4)));
      },
    });
  }

  banner(ctx, at, Y, 'CLEARER HEALTH CLAIMS PLANNED', 'IRDAI WORKING GROUPS DUE IN ABOUT 10 DAYS', '#0e3b46', '#2b8795', '#dff5f7', '#bff0f2');
}
