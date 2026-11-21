// Twelve distinct low-poly illustrations using the existing world geometry and annulus patches.
// Six retained stories revised in review (puc, fog, flights, homestay, cancercost, air) and
// six added after review (antibiotic, signal, voyager, travel, fastag, motor).
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotY, m4rotZ, m4scale } from '../geo';
import type { Ctx } from '../world';
import { patch, T } from './common';
import { IDENT as I, bannerEx, personGeo } from './kit';
import { fitText, roundRect } from './text';
import { polyforkSatellite } from './polyforkSat';

type NewId = 'puc' | 'fog' | 'flights' | 'homestay' | 'cancercost' | 'air' | 'antibiotic' | 'signal' | 'voyager' | 'travel' | 'fastag' | 'motor';

const BANNERS: Record<NewId, string[]> = {
  puc: ['PUC valid for 3 years', 'for BS-VI private cars < 6 years old', 'Start date not verified'],
  fog: ['Winter fog: 20 trains cancelled', 'Selected north India routes · Dec–Feb', 'Check your train before travelling'],
  flights: ['SpiceJet faces widespread cancellations', 'DGCA seeks an explanation', 'Check your flight before leaving'],
  homestay: ['Homestays draw Uttarakhand locals home', 'Tourism creates work in their villages'],
  cancercost: ['Cancer costs beyond insurance', 'Patients paid ~30% from their pockets', 'Plum analysis of 8,102 claims'],
  air: ["Plants can't replace an air purifier", 'HEPA filters trap fine particles,', 'including those in smoke and cooking fumes'],
  antibiotic: ['Common infections are harder to treat', 'ICMR flags antibiotic resistance', "Don't self-medicate with antibiotics"],
  signal: ['Signal adds screenshot protection', 'To limit Gemini, Siri from reading chats', 'iOS 27 + supported Android versions'],
  voyager: ['Voyager 1 is one light-day from Earth', 'Its radio signal takes 24 hours to reach us', 'Travelling through space since 1977'],
  travel: ['Travel insurance pays most for medical bills', 'Nearly ₹80 of every ₹100 paid out', 'Asego analysis of ~11,000 claims'],
  fastag: ['Live within 20 km of a toll?', 'Single-plaza annual pass: ₹1,500–₹3,000', 'Eligible private vehicles · Unlimited trips'],
  motor: ['New car/bike policies from 15 December', 'Passenger liability excludes', 'parents, spouse, children', 'Check personal-accident cover'],
};
const BANNER_COLS: Record<NewId, [string, string, string, string]> = {
  puc: ['#26474c', '#407577', '#e9e9cb', '#dcecd3'],
  fog: ['#3a4650', '#5f7683', '#e6edf2', '#ffe9a8'],
  flights: ['#5c1a14', '#b03a2a', '#ffe9e0', '#ffd9a8'],
  homestay: ['#3d5231', '#6d8a4f', '#f2f6da', '#e4f0b8'],
  cancercost: ['#4a2430', '#8a4658', '#fbe9ee', '#ffd9a8'],
  air: ['#2b3a4a', '#4f6b80', '#e4eef6', '#cfe6ff'],
  antibiotic: ['#0e3b46', '#2b8795', '#dff5f7', '#bff0f2'],
  signal: ['#1b2f6b', '#3b5bd6', '#e3e9ff', '#c9d6ff'],
  voyager: ['#0a0d1f', '#232a4d', '#e8ecff', '#ffd36b'],
  travel: ['#143a5c', '#2e6b9e', '#e0f0fb', '#ffe9a8'],
  fastag: ['#4a3410', '#a8782a', '#fbf0d2', '#ffe2a0'],
  motor: ['#33245c', '#6a4fb0', '#ece5fb', '#d9c9ff'],
};

export function buildNewStory(ctx: Ctx, at: { x: number; z: number }, id: NewId) {
  const idx = Object.keys(BANNERS).indexOf(id);
  const colors: V3[] = [[.92, .87, .72], [.77, .84, .85], [.82, .87, .92], [.76, .86, .65], [.93, .83, .8], [.81, .88, .77], [.78, .88, .91], [.83, .81, .94], [.91, .85, .71], [.94, .84, .7], [.88, .9, .76], [.85, .8, .9]];
  const base = colors[idx];
  const Y = patch(ctx, at.x, at.z, base, [base[0] * .8, base[1] * .8, base[2] * .8], 5.6, 5.4, 90 + idx);
  const X = (x: number, y: number, z: number): M4 => T(at.x + x, Y + y, at.z + z);
  const g = new GeoBuilder();
  const cream: V3 = [.98, .95, .85], blue: V3 = [.2, .45, .65], red: V3 = [.82, .3, .25], wood: V3 = [.55, .34, .21], dark: V3 = [.2, .24, .29], green: V3 = [.3, .58, .35];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, c: V3) => g.box(w, h, d, c, X(x, y, z));
  const cyl = (x: number, y: number, z: number, r: number, h: number, c: V3) => g.cyl(r, r, h, 10, c, X(x, y, z));
  const sphere = (x: number, y: number, z: number, r: number, c: V3) => g.sphere(r, 10, 6, c, X(x, y, z));
  const text = (x: number, y: number, z: number, title: string, sub = '', w = 3, h = 1.5, bg = '#fff9e9') => {
    const t = ctx.makeTex(768, 384, (c, W, H) => { roundRect(c, 8, 8, W - 16, H - 16, 28); c.fillStyle = bg; c.fill(); c.strokeStyle = '#365064'; c.lineWidth = 8; c.stroke(); fitText(c, title, W / 2, sub ? H * .38 : H * .5, W - 60, 100, 900, '#203448'); if (sub) fitText(c, sub, W / 2, H * .76, W - 60, 58, 800, '#536875'); });
    ctx.addDecal({ tex: t, model: X(x, y, z), w, h, billboard: true, glow: 0.08 });
  };
  const person = (x: number, z: number, c: V3 = blue, scale = 1) => ctx.addObj(personGeo([.76, .53, .37], c, { scale }), X(x, 0, z), { anim: 'bob', phase: x + z, amp: .018 });
  const walker = (x: number, z: number, ex: number, ez: number, c: V3 = blue) => ctx.addObj(personGeo([.91, .69, .5], c), I, { anim: 'walk', phase: .2, walkPath: { from: [at.x + x, Y, at.z + z], to: [at.x + ex, Y, at.z + ez], speed: .035 } });
  const house = (x: number, z: number, s = 1) => { box(x, 1.1 * s, z, 2.6 * s, 2.2 * s, 2.1 * s, cream); g.box(3 * s, .2 * s, 1.55 * s, red, m4mul(X(x, 2.45 * s, z - .48 * s), m4rotX(-.55))); g.box(3 * s, .2 * s, 1.55 * s, red, m4mul(X(x, 2.45 * s, z + .48 * s), m4rotX(.55))); box(x, .7 * s, z + 1.07 * s, .55 * s, 1.4 * s, .08, wood); box(x - .8 * s, 1.4 * s, z + 1.08 * s, .55 * s, .6 * s, .08, [.58, .8, .9]); };
  const plant = (x: number, z: number) => { g.cyl(.35, .5, .7, 9, [.64, .34, .22], X(x, 0, z)); cyl(x, .65, z, .055, 1.2, green); for (let k = 0; k < 5; k++) { const a = k * 2.4; g.sphere(.45, 8, 5, green, m4mul(X(x + Math.cos(a) * .25, 1 + k * .12, z + Math.sin(a) * .25), m4scale(.7, .45, 1.5))); } };

  if (id === 'puc') {
    box(0, .1, -.5, 7, .2, 5.5, [.58, .61, .6]); for (const x of [-3.1, 3.1]) box(x, 1.7, -1, .15, 3.4, 3, blue); box(0, 3.5, -1, 6.6, .3, 3.4, blue);
    const car = new GeoBuilder(); car.box(2.8, .6, 1.4, [.88, .63, .2], T(0, .65, 0)); car.box(1.5, .6, 1.2, [.63, .83, .9], T(0, 1.18, 0)); for (const x of [-.9, .9]) for (const z of [-.7, .7]) car.sphere(.32, 10, 6, dark, T(x, .32, z)); ctx.addObj(car, X(0, 0, .1));
    box(-2.15, 1, .1, .65, 1.9, .65, cream); text(-2.1, 1.75, .5, 'PUC', 'TEST', 1, .8);
    text(2.5, 2.2, 1.6, '3 YEARS', 'BS-VI CARS < 6 YEARS', 2.6, 1.4);
    text(2.5, .95, 1.9, 'START DATE', 'NOT VERIFIED', 2.2, 1, '#fdeaea');
    walker(-.7, 3.4, -1.2, 1.7);
  } else if (id === 'fog') {
    for (const z of [-1.6, -.5]) box(0, .05, z, 9, .1, .1, dark); for (let k = 0; k < 12; k++) box(-4.4 + k * .8, .03, -1.05, .2, .06, 1.5, wood);
    const train = new GeoBuilder();
    train.box(5.7, 1.2, 1.6, [.33, .52, .54], T(0, .75, 0)); train.box(5.9, .16, 1.7, cream, T(0, 1.42, 0));
    for (let k = 0; k < 5; k++) train.box(.65, .45, .04, [.58, .81, .91], T(-2.15 + k * 1.05, 1, .82));
    for (const dx of [-1.85, 1.85]) for (const dz of [-.65, .65]) train.sphere(.25, 10, 6, dark, T(dx, .23, dz));
    ctx.addObj(train, X(-.2, 0, -1.05)); // stationary in the mist
    box(0, .18, 2, 8, .36, 2, cream);
    { // platform board: some cancelled, some listed
      const t = ctx.makeTex(768, 512, (c, W, H) => {
        roundRect(c, 8, 8, W - 16, H - 16, 24); c.fillStyle = '#13202c'; c.fill(); c.strokeStyle = '#7fa3b8'; c.lineWidth = 8; c.stroke();
        fitText(c, 'WINTER FOG', W / 2, 62, W - 60, 66, 900, '#ffd24a');
        const rows: [string, string, string][] = [['AMRITSAR-CHD', 'CANCELLED', '#ff8a7a'], ['FIROZPUR-CHD', 'CANCELLED', '#ff8a7a'], ['DIBRUGARH-CHD', 'CANCELLED', '#ff8a7a'], ['KATRA-KALKA', 'CANCELLED', '#ff8a7a'], ['DELHI-JALANDHAR', 'CURTAILED', '#ffd24a']];
        rows.forEach((r, i) => {
          const y = 140 + i * 72;
          c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = `800 40px "Inter", system-ui, sans-serif`; c.fillStyle = '#dce8f0'; c.fillText(r[0], 34, y);
          c.textAlign = 'right'; c.fillStyle = r[2]; c.fillText(r[1], W - 34, y);
        });
        c.textAlign = 'center';
      });
      const p = new GeoBuilder(); p.cyl(.06, .06, 1.3, 7, [.45, .4, .38], X(1.2, 0, 1.2)); ctx.addObj(p, I);
      ctx.addDecal({ tex: t, model: X(1.2, 2.3, 1.2), w: 3.6, h: 2.4, billboard: true, glow: 0.25 });
    }
    person(-2, 2, red); person(-3, 2.5, green);
    for (let k = 0; k < 3; k++) g.sphere(.6, 10, 5, [.86, .89, .87], m4mul(X(-3 + k * 2.7, 2.3, -2.4), m4scale(1.8, .24, .7)));
  } else if (id === 'flights') {
    // apron, terminal with a SpiceJet-branded counter, and a parked SpiceJet aircraft
    box(0, .12, 0, 9, .24, 7, [.69, .72, .73]);
    box(-2.6, 1.3, -2, 2.4, 2.6, 2.2, [.59, .75, .82]);
    box(-2.6, .7, -.75, 2.6, 1.4, .9, wood);
    text(-2.6, 2.2, -.7, 'SPICEJET', 'CHECK-IN', 2.2, 1, '#fdeaea');
    { // departure board: several cancelled, not all
      const t = ctx.makeTex(768, 448, (c, W, H) => {
        roundRect(c, 8, 8, W - 16, H - 16, 24); c.fillStyle = '#13202c'; c.fill(); c.strokeStyle = '#b87f7f'; c.lineWidth = 8; c.stroke();
        fitText(c, 'DEPARTURES', W / 2, 56, W - 60, 60, 900, '#ffd24a');
        // no invented flight numbers: the source reports over half of SpiceJet flights cancelled, without listing services
        const rows: [string, string][] = [['SPICEJET', 'CANCELLED'], ['SPICEJET', 'CANCELLED'], ['SPICEJET', 'CANCELLED'], ['SPICEJET', 'DELAYED']];
        rows.forEach((r, i) => {
          const y = 132 + i * 62;
          c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = `800 38px "Inter", system-ui, sans-serif`; c.fillStyle = '#dce8f0'; c.fillText(r[0], 34, y);
          c.textAlign = 'right'; c.fillStyle = i < 3 ? '#ff8a7a' : '#ffd24a'; c.fillText(r[1], W - 34, y);
        });
        c.textAlign = 'center';
        fitText(c, 'OVER 50% OF FLIGHTS CANCELLED THIS WEEK', W / 2, H - 34, W - 50, 30, 800, '#ffd24a');
      });
      const p = new GeoBuilder(); p.cyl(.06, .06, 1.4, 7, [.45, .4, .38], X(1.6, 0, -.4)); ctx.addObj(p, I);
      ctx.addDecal({ tex: t, model: X(1.6, 2.45, -.4), w: 3.4, h: 1.98, billboard: true, glow: 0.25 });
    }
    { // the aircraft, parked on the apron: SpiceJet red and white, clearly labelled
      const p = new GeoBuilder();
      p.cyl(.32, .18, 3.4, 12, cream, m4rotZ(Math.PI / 2));                 // fuselage, lying along x
      p.box(.1, .08, 2.6, red, T(0, .1, 0));                                // wings
      p.box(.08, .7, .5, red, T(-1.5, .45, 0));                             // fin
      p.box(.5, .06, .8, red, T(-1.45, .12, 0));                            // tailplane
      for (const dx of [-.9, .9]) p.cyl(.09, .09, .3, 8, dark, m4mul(T(dx, -.42, 0), m4rotX(Math.PI / 2))); // gear
      ctx.addObj(p, X(.6, .75, 2.4));
      const lj = ctx.makeTex(1024, 160, (c, W, H) => { c.fillStyle = '#b03a2a'; c.fillRect(0, 0, W, H); fitText(c, 'SpiceJet', W / 2, H / 2, W - 80, 110, 900, '#ffffff'); });
      ctx.addDecal({ tex: lj, model: X(.6, 1.5, 2.75), w: 2.6, h: .42, billboard: true });
    }
    walker(-.7, 3.6, 0, 1.6); person(-3.4, 1.6, red);
  } else if (id === 'homestay') {
    g.sphere(2.5, 12, 7, [.45, .63, .38], m4mul(X(1.5, .3, -1), m4scale(1.3, .3, 1)));
    house(-1.5, .2, .95); house(2.4, -1, .7);
    text(-1.5, 2.6, 1.45, 'HOMESTAY', '', 1.9, .7, '#f6efcf');
    box(0, .2, 2.8, 5, .12, .6, wood);
    { // tea in the courtyard: low table, kettle, cups
      box(.8, .35, 2.2, .9, .12, .6, wood);
      cyl(.65, .48, 2.1, .09, .14, [.9, .71, .26]);
      cyl(.95, .46, 2.3, .05, .08, cream); cyl(.78, .46, 2.36, .05, .08, cream);
    }
    person(.4, 2.9, green); person(1.5, 2.9, red, .92); // host and a visitor over tea
    plant(3.6, 2.5); walker(-3.2, 3.1, -1, 1.7, red);
    { // region marker on the hillside
      const t = ctx.makeTex(1024, 160, (c, W, H) => { roundRect(c, 6, 6, W - 12, H - 12, 30); c.fillStyle = '#3d5231'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#f2f6da'; c.stroke(); fitText(c, 'UTTARAKHAND', W / 2, H / 2, W - 70, 96, 900, '#f2f6da'); });
      ctx.addDecal({ tex: t, model: X(1.5, 2.6, -2.9), w: 3.4, h: .53, billboard: true });
    }
  } else if (id === 'cancercost') {
    box(-2, 1.4, -1, 2.7, 2.8, 2.4, cream); box(-2, 2, .24, .28, 1.2, .1, red); box(-2, 2, .25, 1.1, .28, .11, red);
    box(1.3, .9, 1.1, 3.8, .18, 2, wood);
    for (let k = 0; k < 3; k++) { box(.2 + k * .8, 1.02, 1.2, .65, .03, 1, cream); cyl(.3 + k * .6, 1.03, 1.7, .16, .09, [.9, .71, .26]); }
    person(-.3, 2.7, green); person(1.8, 2.7, blue);
    { // the split: insurance paid about 70%, families about 30%, in this analysis
      const t = ctx.makeTex(1024, 512, (c, W, H) => {
        roundRect(c, 8, 8, W - 16, H - 16, 28); c.fillStyle = '#fff9f4'; c.fill(); c.strokeStyle = '#6b4452'; c.lineWidth = 8; c.stroke();
        fitText(c, 'WHO PAID THE BILL', W / 2, 64, W - 60, 62, 900, '#4a2430');
        const bx = 70, bw = W - 140, by = 130, bh = 120, w70 = bw * .7;
        c.fillStyle = '#2f7a4d'; roundRect(c, bx, by, w70, bh, 18); c.fill();
        c.fillStyle = '#c25548'; roundRect(c, bx + w70, by, bw - w70, bh, 18); c.fill(); c.fillRect(bx + w70 - 18, by, 18, bh);
        fitText(c, 'INSURANCE ~70%', bx + w70 / 2, by + bh / 2, w70 - 30, 54, 900, '#ffffff');
        fitText(c, 'FAMILY ~30%', bx + w70 + (bw - w70) / 2, by + bh / 2, bw - w70 - 20, 40, 900, '#ffffff');
        fitText(c, 'PLUM CLAIMS STUDY', W / 2, 320, W - 60, 52, 900, '#4a2430');
        fitText(c, '8,102 CLAIMS · ONE ANALYSIS', W / 2, 396, W - 60, 44, 800, '#7a5a64');
        fitText(c, 'NOT ALL POLICIES', W / 2, 458, W - 60, 40, 800, '#7a5a64');
      });
      const p = new GeoBuilder(); p.cyl(.06, .06, 1.3, 7, [.45, .4, .38], X(1.8, 0, -1.2)); ctx.addObj(p, I);
      ctx.addDecal({ tex: t, model: X(1.8, 2.5, -1.2), w: 3.9, h: 1.95, billboard: true, glow: 0.12 });
    }
  } else if (id === 'air') {
    box(0, .1, 0, 8, .2, 7, cream); box(-3.8, 1.7, -1, .16, 3.4, 4, [.82, .75, .63]); box(0, 1.7, -3.3, 7.7, 3.4, .16, [.9, .85, .72]); box(-2.6, 2.1, -3.18, 1.2, 1.2, .08, [.62, .78, .84]);
    box(.2, .85, -.7, 1.1, 1.7, .9, [.94, .94, .91]); // the purifier
    text(.2, 1.25, -.24, 'HEPA', '', .8, .45, '#eef4f8');
    for (let k = 0; k < 6; k++) box(.2, .55 + k * .15, -.22, .75, .035, .025, dark);
    plant(2.3, -1.7); plant(-2.6, 1.5);
    { // a person switching off a smoking incense stick
      person(2.3, 2.5, blue);
      cyl(1.6, .35, 2.1, .16, .06, [.64, .34, .22]);
      g.cyl(.02, .02, .5, 5, [.5, .32, .2], m4mul(X(1.6, .6, 2.1), m4rotZ(.2)));
      for (let k = 0; k < 3; k++) { const q = new GeoBuilder(); q.sphere(.05, 6, 4, [.75, .75, .72], I); ctx.addObj(q, X(1.68 + k * .06, 1.05 + k * .3, 2.12), { anim: 'bob', phase: k, amp: .1 }); }
    }
    // fine particles drift toward the purifier and collect at its filter; none vanish at the plants
    for (let k = 0; k < 7; k++) { const q = new GeoBuilder(); q.sphere(.06, 6, 4, [.54, .57, .56], I); ctx.addObj(q, X(-1 + k * .28, .9 + k % 3 * .35, .3 - k * .12), { anim: 'bob', phase: k, amp: .1 }); }
    text(-2, 3.4, -2.9, 'PLANTS HELP,', 'ONLY A LITTLE', 2.6, 1.1);
  } else if (id === 'antibiotic') {
    // a pharmacy counter: prescription first, antibiotics only when prescribed
    box(0, .1, 0, 8, .2, 6, [.94, .96, .94]);
    box(0, 1.5, -2.2, 5.5, 3, 1.6, cream); box(0, 2.9, -2.2, 5.9, .24, 1.9, [.24, .5, .44]);
    text(0, 2.5, -1.35, 'PHARMACY', '', 2.6, .8, '#e8f6ec');
    box(0, .65, .6, 4.6, 1.3, .9, wood); // counter
    person(.9, -.6, [.24, .5, .44]); // pharmacist behind the counter
    const cust = personGeo([.85, .62, .45], [.75, .45, .3], { paper: true }); ctx.addObj(cust, X(-.7, 0, 2.2), { anim: 'bob', phase: 1, amp: .02 }); // customer shows the prescription first
    for (let k = 0; k < 3; k++) box(-1.5 + k * .5, 1.36, .55, .4, .06, .3, [.95, .87, .5]); // medicine strips on the counter
    text(2.6, 1.9, .9, 'ONLY WHEN', 'PRESCRIBED', 2.2, 1.1, '#e8f6ec');
    { // the resistance diagram: bacteria survive the antibiotic
      const t = ctx.makeTex(768, 448, (c, W, H) => {
        roundRect(c, 8, 8, W - 16, H - 16, 28); c.fillStyle = '#f4fbfa'; c.fill(); c.strokeStyle = '#2b6a72'; c.lineWidth = 8; c.stroke();
        // one big pill, split
        c.fillStyle = '#e8b04a'; roundRect(c, 60, 60, 130, 56, 28); c.fill();
        c.fillStyle = '#d4526a'; roundRect(c, 190, 60, 130, 56, 28); c.fill();
        c.strokeStyle = '#8a6a2a'; c.lineWidth = 5; c.stroke();
        // three bacteria still standing beside it
        for (let k = 0; k < 3; k++) {
          const bx = 420 + k * 105, by = 88;
          c.fillStyle = '#4a8a3d'; c.beginPath(); c.arc(bx, by, 34, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#4a8a3d'; c.lineWidth = 6;
          for (let s = 0; s < 8; s++) { const a = s * Math.PI / 4; c.beginPath(); c.moveTo(bx + Math.cos(a) * 36, by + Math.sin(a) * 36); c.lineTo(bx + Math.cos(a) * 48, by + Math.sin(a) * 48); c.stroke(); }
          c.fillStyle = '#203010'; c.beginPath(); c.arc(bx - 10, by - 8, 5, 0, Math.PI * 2); c.arc(bx + 10, by - 8, 5, 0, Math.PI * 2); c.fill();
        }
        fitText(c, 'RESISTANCE', W / 2, 230, W - 60, 84, 900, '#b03a2a');
        fitText(c, 'SURVIVING BACTERIA', W / 2, 320, W - 60, 50, 800, '#2b6a72');
        fitText(c, 'ICMR REPORT 2025', W / 2, 392, W - 60, 42, 800, '#536875');
      });
      const p = new GeoBuilder(); p.cyl(.06, .06, 1.3, 7, [.45, .4, .38], X(-3, 0, .9)); ctx.addObj(p, I);
      ctx.addDecal({ tex: t, model: X(-3, 2.45, .9), w: 3.4, h: 1.98, billboard: true, glow: 0.1 });
    }
  } else if (id === 'signal') {
    // one Signal phone, a shield over its chat screen, the OS assistant stopped outside
    box(0, .06, 0, 7.5, .12, 6, [.82, .86, .95]);
    box(0, 2.3, -1, 2.2, 4.4, .3, dark); // the phone
    { // chat screen with the SIGNAL label and bubbles
      const t = ctx.makeTex(512, 1024, (c, W, H) => {
        roundRect(c, 6, 6, W - 12, H - 12, 40); c.fillStyle = '#f6f8fc'; c.fill();
        roundRect(c, 40, 34, W - 80, 90, 30); c.fillStyle = '#3b5bd6'; c.fill();
        fitText(c, 'SIGNAL', W / 2, 80, W - 140, 62, 900, '#ffffff');
        const bub = (y: number, left: boolean, ww: number) => { roundRect(c, left ? 44 : W - 44 - ww, y, ww, 76, 26); c.fillStyle = left ? '#e4e9f4' : '#cfe0ff'; c.fill(); };
        bub(190, true, 260); bub(300, false, 220); bub(410, true, 290); bub(520, false, 250);
        c.fillStyle = '#8a94a8'; c.font = `700 38px "Inter", system-ui, sans-serif`; c.textAlign = 'center';
      });
      ctx.addDecal({ tex: t, model: X(0, 2.35, -.83), w: 1.9, h: 3.8 });
    }
    { // the shield in front of the chat screen
      const t = ctx.makeTex(512, 640, (c, W, H) => {
        c.fillStyle = 'rgba(59,91,214,.92)';
        c.beginPath(); c.moveTo(W / 2, 30); c.quadraticCurveTo(W - 30, 90, W - 50, 120); c.lineTo(W - 50, 330);
        c.quadraticCurveTo(W - 50, 520, W / 2, 610); c.quadraticCurveTo(50, 520, 50, 330); c.lineTo(50, 120); c.quadraticCurveTo(30, 90, W / 2, 30); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = 16; c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 26; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(W / 2 - 90, 320); c.lineTo(W / 2 - 20, 400); c.lineTo(W / 2 + 100, 210); c.stroke();
      });
      ctx.addDecal({ tex: t, model: X(0, 2.5, -.5), w: 1.7, h: 2.1, billboard: true, glow: 0.3 });
    }
    { // the little AI robot, stopped at the shield
      const r = new GeoBuilder();
      r.box(.5, .5, .4, [.75, .78, .85], T(0, .45, 0)); r.sphere(.28, 10, 7, [.85, .88, .95], T(0, .85, 0));
      r.cyl(.02, .02, .3, 6, [.6, .63, .7], T(0, 1.1, 0)); r.sphere(.06, 6, 4, [.95, .5, .5], T(0, 1.28, 0));
      r.box(.1, .1, .5, [.75, .78, .85], m4mul(T(.32, .6, -.2), m4rotX(.9))); // arm reaching out
      ctx.addObj(r, X(1.7, 0, 1.1), { anim: 'bob', phase: 2, amp: .03 });
      text(1.7, 2.1, 1.2, 'GEMINI · SIRI', 'STOPPED', 2, 1, '#e3e9ff');
    }
    text(-2.3, 1.5, .6, 'OPT-OUT IN', 'SETTINGS', 1.9, 1);
  } else if (id === 'voyager') {
    // deep space: the probe with its dish, a tiny Earth far behind, a dotted 24-hour path home
    { // a dark starfield backdrop panel
      const t = ctx.makeTex(1024, 640, (c, W, H) => {
        const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#070a1c'); grd.addColorStop(1, '#131a3a');
        c.fillStyle = grd; c.fillRect(0, 0, W, H);
        let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let k = 0; k < 90; k++) { c.fillStyle = `rgba(255,255,255,${.35 + rnd() * .6})`; c.beginPath(); c.arc(rnd() * W, rnd() * H, .8 + rnd() * 2.2, 0, Math.PI * 2); c.fill(); }
        // the dotted signal path, the long way home
        c.strokeStyle = '#ffd36b'; c.lineWidth = 6; c.setLineDash([4, 22]); c.lineCap = 'round';
        c.beginPath(); c.moveTo(140, 470); c.quadraticCurveTo(500, 260, 880, 170); c.stroke(); c.setLineDash([]);
        // tiny Earth at the path's far end
        c.fillStyle = '#3f7ad1'; c.beginPath(); c.arc(900, 160, 26, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#4a9e4a'; c.beginPath(); c.arc(894, 154, 10, 0, Math.PI * 2); c.arc(908, 168, 8, 0, Math.PI * 2); c.fill();
        fitText(c, 'EARTH', 900, 216, 150, 40, 800, '#bcd2ff');
        fitText(c, '24 HOURS ONE WAY', 480, 320, 460, 52, 900, '#ffd36b');
        fitText(c, 'NOT TO SCALE', 480, 384, 300, 34, 700, '#8fa0d0');
        fitText(c, 'VOYAGER 1', 180, 560, 340, 66, 900, '#ffffff');
      });
      ctx.addDecal({ tex: t, model: X(0, 3.1, -2.6), w: 7.2, h: 4.5, glow: 0.12 });
    }
    { // the probe: Polyfork low-poly comm satellite standing in for Voyager 1 (one-story sample)
      const p = new GeoBuilder();
      const S = 3.0; // wingspan in world units; model is normalized, vertically centred below
      polyforkSatellite(p, m4mul(T(0, -0.518, 0), m4scale(S, S, S)));
      const base = X(-1.2, 3.8, 1.0);
      ctx.addObj(p, base, {
        update: (t: number) => m4mul(T(0, Math.sin(t * 2.1) * 0.12, 0), m4mul(base, m4rotY(t * 0.35))),
      });
      const gold = new GeoBuilder(); gold.cyl(.3, .3, .05, 16, [.96, .78, .22], m4rotX(Math.PI / 2));
      ctx.addObj(gold, X(-1.6, 3.1, 1.75), { anim: 'spin', amp: .4 }); // the Golden Record
    }
    sphere(2.9, 4.3, -.8, .32, [.25, .48, .82]); // tiny Earth in the world too
  } else if (id === 'travel') {
    // an airport corner: a traveller, a suitcase, and the payout bar from Asego's data
    box(0, .1, 0, 8, .2, 6, [.88, .9, .94]);
    person(-2.4, 1.4, [.2, .45, .65]);
    box(-1.6, .5, 1.7, .5, .9, .35, [.85, .55, .25]); g.cyl(.02, .02, .6, 6, dark, X(-1.6, 1.1, 1.7));
    { // the payout bar: about ₹80 of every ₹100 went to medical bills
      const t = ctx.makeTex(1024, 576, (c, W, H) => {
        roundRect(c, 8, 8, W - 16, H - 16, 28); c.fillStyle = '#f2f8fc'; c.fill(); c.strokeStyle = '#2e6b9e'; c.lineWidth = 8; c.stroke();
        fitText(c, 'OF EVERY ₹100 PAID OUT', W / 2, 66, W - 60, 60, 900, '#143a5c');
        const bx = 70, bw = W - 140, by = 130, bh = 130, w80 = bw * .8;
        c.fillStyle = '#c25548'; roundRect(c, bx, by, w80, bh, 18); c.fill();
        c.fillStyle = '#8a97a8'; roundRect(c, bx + w80, by, bw - w80, bh, 18); c.fill(); c.fillRect(bx + w80 - 18, by, 18, bh);
        fitText(c, 'MEDICAL BILLS ~₹80', bx + w80 / 2, by + bh / 2, w80 - 30, 56, 900, '#ffffff');
        fitText(c, 'OTHER ~₹20', bx + w80 + (bw - w80) / 2, by + bh / 2, bw - w80 - 14, 34, 900, '#ffffff');
        fitText(c, 'ASEGO CLAIMS DATA', W / 2, 336, W - 60, 54, 900, '#143a5c');
        fitText(c, '~11,000 TRAVEL CLAIMS', W / 2, 412, W - 60, 46, 800, '#4a6a82');
        fitText(c, 'SHARE OF PAYOUTS, NOT COVER', W / 2, 486, W - 60, 42, 800, '#b03a2a');
      });
      const p = new GeoBuilder(); p.cyl(.06, .06, 1.3, 7, [.45, .4, .38], X(1.2, 0, -1.2)); ctx.addObj(p, I);
      ctx.addDecal({ tex: t, model: X(1.2, 2.6, -1.2), w: 4.2, h: 2.36, billboard: true, glow: 0.12 });
    }
    { // a small plane crossing the open sky, clearly side-on
      const p = new GeoBuilder();
      const body: V3 = [.62, .68, .78]; // grey-blue fuselage, visible against sky and patch
      p.cyl(.3, .15, 3, 12, body, m4rotZ(Math.PI / 2)); // fuselage, nose to +x
      p.box(.5, .09, 3.4, red, T(0, .05, 0)); // main wing through the fuselage
      p.box(.09, .7, .55, red, T(-1.35, .45, 0)); // tail fin
      p.box(.45, .06, .9, red, T(-1.3, .14, 0)); // tailplane
      p.sphere(.15, 8, 6, dark, T(1.55, 0, 0)); // nose
      ctx.addObj(p, m4mul(X(-2.4, 3.2, -1.4), m4mul(m4rotY(.55), m4scale(1.35, 1.35, 1.35))), { anim: 'bob', phase: 0, amp: .08 });
    }
  } else if (id === 'fastag') {
    // home on one side, one toll plaza on the other, the local pass lane between them
    box(0, .08, 0, 9, .16, 6.5, [.7, .78, .66]);
    house(-3, -.8, .8);
    text(-3, 2.6, -.3, 'HOME', 'WITHIN 20 KM', 2, 1, '#f6efcf');
    box(1.1, .06, .8, 5.6, .1, 1.7, [.42, .42, .46]); // the road to the plaza
    { // the plaza: booth, barrier arm, marked lane
      box(3.6, 1.1, -.6, 1.3, 2.2, 1.3, cream); box(3.6, 2.35, -.6, 1.6, .3, 1.6, [.24, .5, .44]);
      g.box(2.2, .09, .09, [.9, .3, .25], m4mul(X(2.2, 1.15, .1), m4rotZ(.35))); // raised barrier
      text(3.6, 3.1, -.6, 'TOLL PLAZA', 'ONE PLAZA ONLY', 2.4, 1);
      text(1.6, 1.7, 1.8, 'LOCAL ANNUAL PASS', '₹1,500–₹3,000 / YEAR', 3, 1.1, '#fbf0d2');
    }
    { // a private car passing in the marked lane
      const car = new GeoBuilder(); car.box(2.2, .55, 1.1, [.3, .55, .85], T(0, .55, 0)); car.box(1.2, .5, .95, [.63, .83, .9], T(-.1, 1, 0));
      for (const x of [-.7, .7]) for (const z of [-.55, .55]) car.sphere(.26, 10, 6, dark, T(x, .26, z));
      ctx.addObj(car, X(.9, 0, .8), { anim: 'bob', phase: 1, amp: .015 });
    }
    person(-1.2, 2.6, [.85, .5, .3]);
  } else {
    // motor insurance: the adviser, the family, and the two separate covers
    box(0, .1, 0, 8, .2, 6, [.9, .89, .95]);
    { // the family car
      const car = new GeoBuilder(); car.box(2.6, .6, 1.3, [.75, .3, .3], T(0, .6, 0)); car.box(1.4, .55, 1.1, [.63, .83, .9], T(0, 1.15, 0));
      for (const x of [-.8, .8]) for (const z of [-.6, .6]) car.sphere(.28, 10, 6, dark, T(x, .28, z));
      ctx.addObj(car, X(-2.2, 0, -1.4));
    }
    const adviser = personGeo([.72, .5, .36], [.25, .3, .5], { paper: true }); ctx.addObj(adviser, X(.4, 0, .4), { anim: 'bob', phase: 0, amp: .02 });
    person(1.6, 1.8, [.8, .45, .55]); person(2.5, 1.7, [.3, .55, .5]); person(2, 2.6, [.85, .7, .3], .62); // two adults, one child
    { // the two covers, side by side on a stand; the adviser points at the second
      const t = ctx.makeTex(1024, 512, (c, W, H) => {
        roundRect(c, 8, 8, W - 16, H - 16, 28); c.fillStyle = '#f6f3fc'; c.fill(); c.strokeStyle = '#6a4fb0'; c.lineWidth = 8; c.stroke();
        roundRect(c, 40, 60, 440, 300, 24); c.fillStyle = '#efe9e6'; c.fill(); c.strokeStyle = '#8a8578'; c.lineWidth = 6; c.stroke();
        fitText(c, 'PASSENGER', 260, 130, 400, 54, 900, '#4a4438');
        fitText(c, 'LIABILITY', 260, 196, 400, 54, 900, '#4a4438');
        fitText(c, 'EXCLUDES PARENTS,', 260, 272, 400, 38, 800, '#b03a2a');
        fitText(c, 'SPOUSE, CHILDREN', 260, 312, 400, 38, 800, '#b03a2a');
        roundRect(c, 544, 60, 440, 300, 24); c.fillStyle = '#e4f6ea'; c.fill(); c.strokeStyle = '#2f7a4d'; c.lineWidth = 6; c.stroke();
        fitText(c, 'FAMILY ACCIDENT', 764, 130, 400, 48, 900, '#14602f');
        fitText(c, 'COVER', 764, 192, 400, 54, 900, '#14602f');
        fitText(c, 'ADD THIS ✓', 764, 288, 400, 44, 900, '#1c7c43');
        fitText(c, 'NEW POLICIES FROM 15 DECEMBER', W / 2, 420, W - 60, 54, 900, '#33245c');
        fitText(c, 'IRDAI UNIFORM WORDINGS', W / 2, 478, W - 60, 38, 800, '#6a5a8a');
      });
      const p = new GeoBuilder(); p.cyl(.06, .06, 1.3, 7, [.45, .4, .38], X(1.2, 0, -1.6)); ctx.addObj(p, I);
      ctx.addDecal({ tex: t, model: X(1.2, 2.5, -1.6), w: 4.2, h: 2.1, billboard: true, glow: 0.12 });
    }
  }

  ctx.addObj(g, I);
  const [c0, c1, edge, sub] = BANNER_COLS[id];
  bannerEx(ctx, at, Y, BANNERS[id], c0, c1, edge, sub);
}
