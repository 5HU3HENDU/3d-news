// Scene 5: EPFO approves easier PF withdrawals. A small EPFO office with a queue of people
// waiting outside the entrance, and two boards: the new minimum balance and the unannounced
// start date. (The old piggy bank and SWP pot were removed in review.)
import { GeoBuilder, M4, V3 } from '../geo';
import type { Ctx } from '../world';
import { T, patch } from './common';
import { IDENT as I, bannerEx, personGeo } from './kit';
import { fitText, roundRect } from './text';

export function buildEpfo(ctx: Ctx, at: { x: number; z: number }) {
  const Y = patch(ctx, at.x, at.z, [0.97, 0.92, 0.74], [0.82, 0.7, 0.45], 5.3, 5.1, 31);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);

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

  // two boards: the new minimum balance, and the start date that is not announced
  const board = (x: number, top: string, mid: string, low: string, bg: string) => {
    const tex = ctx.makeTex(512, 384, (c, w, h) => {
      roundRect(c, 6, 6, w - 12, h - 12, 34); c.fillStyle = bg; c.fill();
      c.lineWidth = 8; c.strokeStyle = '#ffffff'; c.stroke();
      fitText(c, top, w / 2, 66, w - 40, 42, 800, '#e8f6ec');
      fitText(c, mid, w / 2, 190, w - 36, 108, 900, '#ffffff');
      fitText(c, low, w / 2, 314, w - 40, 44, 800, '#ffe9a8');
    });
    const g = new GeoBuilder();
    g.cyl(0.06, 0.06, 1.2, 7, [0.45, 0.4, 0.38], X(x, 0, 0.5));
    ctx.addObj(g, I);
    ctx.addDecal({ tex, model: X(x, 1.95, 0.5), w: 2.5, h: 1.88, billboard: true, glow: 0.1 });
  };
  board(-3.9, 'MINIMUM BALANCE', '25% → 10%', 'BOARD APPROVED', '#1f7a4d');
  board(3.9, '', 'START DATE', 'AWAITED', '#8a4fb0');

  // the queue outside the entrance: a line of people waiting their turn
  const queueSpots: [number, number][] = [[-0.2, 0.4], [-0.75, 1.15], [-1.3, 1.9], [-1.85, 2.65], [-2.4, 3.4], [-2.95, 4.15]];
  const shirts: V3[] = [[0.85, 0.5, 0.3], [0.4, 0.55, 0.8], [0.7, 0.45, 0.6], [0.45, 0.65, 0.45], [0.8, 0.7, 0.3], [0.55, 0.5, 0.75]];
  const skins: V3[] = [[0.92, 0.72, 0.56], [0.72, 0.5, 0.36], [0.85, 0.62, 0.45]];
  queueSpots.forEach(([qx, qz], i) => {
    ctx.addObj(personGeo(skins[i % skins.length], shirts[i % shirts.length], { grey: i % 3 === 0 }), X(qx, 0, qz), { anim: 'bob', phase: i * 0.9, amp: 0.015 });
  });
  { // a rope line along the queue
    const g = new GeoBuilder();
    for (const [qx, qz] of queueSpots) g.cyl(0.03, 0.03, 0.85, 6, [0.5, 0.42, 0.35], X(qx + 0.45, 0, qz));
    g.box(0.05, 0.05, 4.6, [0.75, 0.25, 0.2], X(-1.35, 0.8, 2.3));
    ctx.addObj(g, I);
  }

  bannerEx(ctx, at, Y, ['EPFO approves easier PF withdrawals', 'Minimum balance: 25% → 10%', 'Start date not announced'], '#12365e', '#2c6aa8', '#e8f2fb', '#bfe0ff');
}
