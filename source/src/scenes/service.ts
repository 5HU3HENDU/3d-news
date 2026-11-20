// Scene 8: restaurant service charge stays optional. A small restaurant, a waiter, diners, and a big bill
// that says the service charge is the customer's choice.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotY } from '../geo';
import type { Ctx } from '../world';
import { T, patch } from './common';
import { IDENT as I, bannerEx, personGeo } from './kit';
import { FONT, fitText, roundRect } from './text';

export function buildService(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.98, 0.9, 0.78], [0.86, 0.66, 0.46], 5.4, 5.2, 61);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);
  const cream: V3 = [0.99, 0.94, 0.84], red: V3 = [0.86, 0.26, 0.24];

  // the restaurant
  {
    const g = new GeoBuilder();
    g.box(5.2, 0.16, 3.0, [0.8, 0.74, 0.66], X(-0.2, 0.08, -2.0));
    g.box(4.6, 2.3, 2.4, cream, X(-0.2, 1.3, -2.0));
    g.box(5.0, 0.55, 2.7, [0.96, 0.88, 0.7], X(-0.2, 2.72, -2.0));
    g.box(5.1, 0.1, 2.8, [0.55, 0.3, 0.22], X(-0.2, 3.04, -2.0));
    g.box(0.95, 1.5, 0.1, [0.4, 0.27, 0.2], X(-0.2, 0.91, -0.78));
    g.box(1.0, 0.8, 0.08, [0.75, 0.88, 0.95], X(-1.9, 1.5, -0.78));
    g.box(1.0, 0.8, 0.08, [0.75, 0.88, 0.95], X(1.5, 1.5, -0.78));
    // striped awning, sloping out over the door
    for (let i = 0; i < 8; i++) {
      g.box(0.62, 0.06, 0.9, i % 2 ? [0.98, 0.97, 0.94] : red, m4mul(X(-2.2 + i * 0.62, 2.12, -0.42), m4rotX(-0.28)));
    }
    ctx.addObj(g, I);
  }
  const frieze = ctx.makeTex(1024, 128, (c, w, h) => {
    fitText(c, 'RESTAURANT', w / 2, h / 2 + 2, w - 60, 100, 900, '#5a2a1e');
  });
  ctx.addDecal({ tex: frieze, model: X(-0.2, 2.72, -0.64), w: 3.4, h: 0.42 });

  // two tables with chairs and diners
  const table = (x: number, z: number, withBill: boolean) => {
    const g = new GeoBuilder();
    g.cyl(0.75, 0.75, 0.07, 16, [0.95, 0.9, 0.82], X(x, 0.78, z));
    g.cyl(0.08, 0.08, 0.78, 8, [0.4, 0.3, 0.24], X(x, 0, z));
    g.cyl(0.4, 0.4, 0.04, 12, [0.4, 0.3, 0.24], X(x, 0, z));
    g.cyl(0.2, 0.17, 0.05, 10, [0.97, 0.97, 0.97], X(x - 0.25, 0.85, z + 0.1));
    g.cyl(0.2, 0.17, 0.05, 10, [0.97, 0.97, 0.97], X(x + 0.25, 0.85, z - 0.1));
    if (withBill) g.box(0.34, 0.02, 0.44, [1, 1, 0.97], m4mul(X(x, 0.86, z - 0.15), m4rotY(0.5)));
    for (const [cx, cz] of [[-1.0, 0], [1.0, 0]] as [number, number][]) {
      g.box(0.46, 0.06, 0.46, [0.6, 0.35, 0.25], X(x + cx, 0.46, z + cz));
      g.box(0.07, 0.4, 0.07, [0.45, 0.28, 0.2], X(x + cx - 0.18, 0.2, z + cz - 0.18));
      g.box(0.07, 0.4, 0.07, [0.45, 0.28, 0.2], X(x + cx + 0.18, 0.2, z + cz + 0.18));
      g.box(0.07, 0.4, 0.07, [0.45, 0.28, 0.2], X(x + cx - 0.18, 0.2, z + cz + 0.18));
      g.box(0.07, 0.4, 0.07, [0.45, 0.28, 0.2], X(x + cx + 0.18, 0.2, z + cz - 0.18));
      g.box(0.06, 0.5, 0.46, [0.6, 0.35, 0.25], X(x + cx + Math.sign(cx) * 0.22, 0.75, z + cz));
    }
    ctx.addObj(g, I);
    ([[-1.0, Math.PI / 2], [1.0, -Math.PI / 2]] as [number, number][]).forEach(([dx, rot], i) => {
      const p = personGeo(i ? [0.72, 0.5, 0.36] : [0.92, 0.72, 0.56], i ? [0.3, 0.6, 0.45] : [0.85, 0.65, 0.2], { scale: 0.85 });
      ctx.addObj(p, m4mul(X(x + dx, 0.22, z), m4rotY(rot)), { anim: 'bob', phase: x + i, amp: 0.02 });
    });
  };
  table(-1.9, 1.9, true);
  table(1.1, 2.3, false);

  // the bill: a big receipt on a stand
  const bill = ctx.makeTex(512, 640, (c, w, h) => {
    const t = performance.now() / 1000;
    c.fillStyle = '#fffdf6'; c.fillRect(8, 8, w - 16, h - 16);
    c.strokeStyle = '#d9d2bd'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
    fitText(c, 'BILL', w / 2, 66, w - 80, 78, 900, '#3a3328');
    c.strokeStyle = '#bbb'; c.setLineDash([10, 8]); c.lineWidth = 3;
    c.beginPath(); c.moveTo(40, 116); c.lineTo(w - 40, 116); c.stroke(); c.setLineDash([]);
    c.font = `700 44px ${FONT}`; c.fillStyle = '#4a4438'; c.textBaseline = 'middle';
    c.textAlign = 'left'; c.fillText('Food, drinks', 44, 168);
    c.fillText('Taxes', 44, 232);
    c.fillStyle = '#8a8578'; c.font = `900 46px ${FONT}`;
    c.fillText('Service charge', 44, 312);
    { // crossed out: it cannot be added automatically
      const tw = c.measureText('Service charge').width;
      c.strokeStyle = '#d43a2a'; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(38, 312); c.lineTo(50 + tw, 312); c.stroke();
    }
    roundRect(c, 30, 344, w - 60, 142, 22); c.fillStyle = '#e4f6ea'; c.fill();
    fitText(c, 'YOUR CHOICE', w / 2, 398, w - 80, 70, 900, '#14602f');
    fitText(c, 'NOT AUTOMATIC', w / 2, 456, w - 90, 44, 800, '#14602f');
    const s = 1 + 0.05 * Math.sin(t * 3);
    c.save(); c.translate(w / 2, 552); c.scale(s, s);
    c.fillStyle = '#2bb35e'; c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 13; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-23, 2); c.lineTo(-6, 20); c.lineTo(25, -18); c.stroke();
    c.restore();
  });
  {
    const g = new GeoBuilder();
    g.cyl(0.06, 0.06, 1.0, 7, [0.45, 0.4, 0.38], X(3.7, 0, 1.0));
    ctx.addObj(g, I);
  }
  ctx.addDecal({ tex: bill, model: X(3.7, 2.45, 1.0), w: 2.5, h: 3.1, billboard: true });
  let last = 0;
  ctx.onFrame((t) => { if (t - last > 0.1) { last = t; bill.redraw(); } });

  // a waiter carrying a tray from the door to the first table and back
  ctx.addObj(personGeo([0.72, 0.5, 0.36], [0.95, 0.95, 0.95], { tray: true }), I, {
    update: (t) => {
      const u = (t * 0.07) % 1;
      const k = u < 0.5 ? u * 2 : 2 - u * 2;
      const e = k * k * (3 - 2 * k);
      const fx = -0.2, fz = -0.2, tx = -1.9, tz = 1.0;
      const x = fx + (tx - fx) * e, z = fz + (tz - fz) * e;
      const dir = u < 0.5 ? 1 : -1;
      const hd = Math.atan2((tx - fx) * dir, (tz - fz) * dir);
      return m4mul(X(x, Math.abs(Math.sin(t * 8)) * 0.03, z), m4rotY(hd));
    },
  });

  bannerEx(ctx, at, Y, ['Service Charges', 'Not compulsory', 'You can ask to remove'], '#5a2018', '#c2562f', '#ffeccf', '#ffd9a8');
}
