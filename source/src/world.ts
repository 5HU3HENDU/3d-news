// Miniature news world engine: one flat canvas, four 3D miniature scenes, a slow camera tour.
// Plain WebGL, no dependencies. Scenes live in ./scenes and draw through the Ctx below.
import {
  GeoBuilder, M4, V3, m4ident, m4invert, m4lookAt, m4mul, m4normalMat, m4perspective,
  m4rotY, m4scale, m4translate, norm3, sub3,
} from './geo';
import { C } from './palette';
import type { SceneId } from './data';
import { buildGta } from './scenes/gta';
import { buildCyclone } from './scenes/cyclone';
import { buildCricket } from './scenes/cricket';
import { buildMarket } from './scenes/market';

export type { SceneId };
export interface WorldHandle {
  dispose(): void;
  flyTo(id: SceneId): void;
  setHold(hold: boolean): void;
}
export interface WorldEvents {
  onPick(id: SceneId): void;
  onFocus(id: SceneId): void;
}

export type AnimKind = 'static' | 'bob' | 'spin' | 'screen' | 'sway' | 'walk';
export interface Obj {
  buf: WebGLBuffer;
  count: number;
  base: M4;
  anim: AnimKind;
  phase: number;
  amp: number;
  glow: number;
  glowCol: V3;
  wave: number;
  update?: (t: number) => M4 | void;
  walkPath?: { from: V3; to: V3; speed: number };
}
export interface Tex {
  tex: WebGLTexture;
  w: number;
  h: number;
  ctx: CanvasRenderingContext2D;
  redraw(): void;
}
export interface DecalOpts {
  tex: Tex;
  model: M4;          // places the unit quad's centre; scale is applied separately
  w: number;
  h: number;
  billboard?: boolean; // turns about its own vertical axis to face the camera
  glow?: number;
}
export interface Ctx {
  TOP: number;
  addObj(g: GeoBuilder, base: M4, opts?: Partial<Obj>): Obj;
  makeTex(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): Tex;
  addDecal(o: DecalOpts): void;
  onFrame(fn: (t: number) => void): void;
}

// Scene centres on the flat canvas (x, z), and the hit radius used for taps.
export const SPOTS: Record<SceneId, { x: number; z: number }> = {
  gta: { x: -14, z: -14 },
  cyclone: { x: 14, z: -14 },
  cricket: { x: 14, z: 14 },
  market: { x: -14, z: 14 },
};
export const TOUR: SceneId[] = ['gta', 'cyclone', 'cricket', 'market'];
const TOP = 1.2;

// ---------- shaders ----------
const VERT = `
attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol;
uniform mat4 uProj, uView, uModel; uniform mat3 uNrm;
uniform float uTime, uWave;
varying vec3 vNrm; varying vec3 vCol; varying float vFog;
uniform vec3 uEye; uniform float uFogNear, uFogFar;
void main() {
  vec3 p = aPos;
  if (uWave > 0.0) {
    p.y += (sin(p.x * 1.4 + uTime * 1.7) + cos(p.z * 1.9 + uTime * 1.3)) * 0.5 * uWave;
  }
  vec4 w = uModel * vec4(p, 1.0);
  vNrm = normalize(uNrm * aNrm);
  vCol = aCol;
  float d = distance(w.xyz, uEye);
  vFog = smoothstep(uFogNear, uFogFar, d);
  gl_Position = uProj * uView * w;
}`;
const FRAG = `
precision mediump float;
varying vec3 vNrm; varying vec3 vCol; varying float vFog;
uniform vec3 uFogCol; uniform float uGlow; uniform vec3 uGlowCol;
void main() {
  vec3 n = normalize(vNrm);
  vec3 sun = normalize(vec3(-0.45, 0.85, 0.3));
  float diff = max(dot(n, sun), 0.0);
  float hemi = 0.55 + 0.45 * n.y;
  vec3 col = vCol * (0.42 * hemi + 0.62 * diff);
  col += uGlow * uGlowCol;
  col = mix(col, uFogCol, vFog * 0.9);
  gl_FragColor = vec4(col, 1.0);
}`;
const DVERT = `
attribute vec2 aPos; attribute vec2 aUv;
uniform mat4 uProj, uView, uModel;
uniform vec3 uEye; uniform float uFogNear, uFogFar;
varying vec2 vUv; varying float vFog;
void main() {
  vec4 w = uModel * vec4(aPos, 0.0, 1.0);
  vUv = aUv;
  vFog = smoothstep(uFogNear, uFogFar, distance(w.xyz, uEye));
  gl_Position = uProj * uView * w;
}`;
const DFRAG = `
precision mediump float;
varying vec2 vUv; varying float vFog;
uniform sampler2D uTex; uniform vec3 uFogCol; uniform float uGlow;
void main() {
  vec4 c = texture2D(uTex, vUv);
  if (c.a < 0.02) discard;
  vec3 col = c.rgb + uGlow * 0.15;
  col = mix(col, uFogCol, vFog * 0.7);
  gl_FragColor = vec4(col, c.a);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}
function program(gl: WebGLRenderingContext, v: string, f: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, v));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, f));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  return p;
}

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------- the world ----------
export function mountWorld(canvas: HTMLCanvasElement, ev: WorldEvents): WorldHandle {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: true }) as WebGLRenderingContext | null;
  if (!gl) return { dispose() {}, flyTo() {}, setHold() {} };

  const prog = program(gl, VERT, FRAG);
  const dprog = program(gl, DVERT, DFRAG);
  const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
  gl.useProgram(prog);
  const uProj = U(prog, 'uProj'), uView = U(prog, 'uView'), uModel = U(prog, 'uModel'), uNrm = U(prog, 'uNrm'),
    uTime = U(prog, 'uTime'), uWave = U(prog, 'uWave'), uEye = U(prog, 'uEye'), uFogNear = U(prog, 'uFogNear'),
    uFogFar = U(prog, 'uFogFar'), uFogCol = U(prog, 'uFogCol'), uGlow = U(prog, 'uGlow'), uGlowCol = U(prog, 'uGlowCol');
  const aPos = gl.getAttribLocation(prog, 'aPos'), aNrm = gl.getAttribLocation(prog, 'aNrm'), aCol = gl.getAttribLocation(prog, 'aCol');
  const dU = {
    proj: U(dprog, 'uProj'), view: U(dprog, 'uView'), model: U(dprog, 'uModel'), eye: U(dprog, 'uEye'),
    fogNear: U(dprog, 'uFogNear'), fogFar: U(dprog, 'uFogFar'), fogCol: U(dprog, 'uFogCol'),
    tex: U(dprog, 'uTex'), glow: U(dprog, 'uGlow'),
  };
  const daPos = gl.getAttribLocation(dprog, 'aPos'), daUv = gl.getAttribLocation(dprog, 'aUv');
  gl.enable(gl.DEPTH_TEST);

  const objs: Obj[] = [];
  const frameHooks: ((t: number) => void)[] = [];
  const decals: { o: DecalOpts; S: M4 }[] = [];
  const texes: Tex[] = [];

  const quadBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, 0.5, 0.5, 1, 1,
    -0.5, -0.5, 0, 0, 0.5, 0.5, 1, 1, -0.5, 0.5, 0, 1,
  ]), gl.STATIC_DRAW);

  const ctx: Ctx = {
    TOP,
    addObj(g, base, opts) {
      const inter = new Float32Array(g.pos.length * 3);
      for (let i = 0, j = 0; i < g.pos.length / 3; i++) {
        inter[j++] = g.pos[i * 3]; inter[j++] = g.pos[i * 3 + 1]; inter[j++] = g.pos[i * 3 + 2];
        inter[j++] = g.nrm[i * 3]; inter[j++] = g.nrm[i * 3 + 1]; inter[j++] = g.nrm[i * 3 + 2];
        inter[j++] = g.col[i * 3]; inter[j++] = g.col[i * 3 + 1]; inter[j++] = g.col[i * 3 + 2];
      }
      const buf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, inter, gl.STATIC_DRAW);
      const o: Obj = {
        buf, count: g.pos.length / 3, base, anim: 'static', phase: 0, amp: 0,
        glow: 0, glowCol: [1, 1, 1], wave: 0, ...opts,
      };
      objs.push(o);
      return o;
    },
    makeTex(w, h, draw) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const c2 = cv.getContext('2d')!;
      const tex = gl.createTexture()!;
      const pow2 = (n: number) => (n & (n - 1)) === 0;
      const t: Tex = {
        tex, w, h, ctx: c2,
        redraw() {
          c2.clearRect(0, 0, w, h);
          draw(c2, w, h);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
          if (pow2(w) && pow2(h)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          }
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        },
      };
      t.redraw();
      texes.push(t);
      return t;
    },
    addDecal(o) { decals.push({ o, S: m4scale(o.w, o.h, 1) }); },
    onFrame(fn) { frameHooks.push(fn); },
  };

  // ---------- the flat canvas ----------
  {
    const g = new GeoBuilder();
    // soil slab under the whole board, so it reads as a floating flat canvas
    g.box(74, 2.2, 62, C.soil, m4translate(0, TOP - 1.1 - 0.12, 0));
    g.box(74.6, 0.3, 62.6, [0.45, 0.31, 0.21], m4translate(0, TOP - 0.3, 0));
    // paper-like top surface
    g.box(73, 0.06, 61, [0.93, 0.91, 0.84], m4translate(0, TOP - 0.03, 0));
    ctx.addObj(g, m4ident());
  }
  // soft shadows of clouds drifting is overkill; a few clouds float above the canvas
  const cloudSpots: [number, number, number, number][] = [
    [-30, 10, -26, 1.5], [0, 11, -4, 1.4], [3, 12, -27, 1.8], [-3, 11, 28, 1.5], [33, 10, -2, 1.2], [-33, 10.5, 2, 1.3],
  ];
  for (const [x, y, z, s] of cloudSpots) {
    const g = new GeoBuilder();
    g.sphere(0.75, 10, 6, C.cloud, m4mul(m4translate(0, 0, 0), m4scale(1.5, 0.75, 1)));
    g.sphere(0.55, 10, 6, C.cloud, m4mul(m4translate(0.95, 0.1, 0.15), m4scale(1.2, 0.7, 1)));
    g.sphere(0.5, 10, 6, C.cloud, m4mul(m4translate(-0.9, 0.05, -0.1), m4scale(1.1, 0.65, 1)));
    ctx.addObj(g, m4mul(m4translate(x, y, z), m4scale(s, s, s)), { anim: 'bob', phase: x, amp: 0.3 });
  }

  buildGta(ctx, SPOTS.gta);
  buildCyclone(ctx, SPOTS.cyclone);
  buildCricket(ctx, SPOTS.cricket);
  buildMarket(ctx, SPOTS.market);

  // ---------- per-frame model matrix ----------
  const T = m4translate;
  function modelFor(o: Obj, t: number): M4 {
    if (o.update) { const r = o.update(t); if (r) return r; }
    let m = o.base;
    switch (o.anim) {
      case 'bob':
        m = m4mul(T(0, Math.sin(t * 2.1 + o.phase) * o.amp, 0), o.base);
        break;
      case 'spin':
        m = m4mul(o.base, m4rotY(t * 1.4 * (o.amp || 1)));
        break;
      case 'screen': {
        o.glow = 0.5 + 0.18 * Math.sin(t * 11) + 0.08 * Math.sin(t * 5.7);
        const k = (Math.sin(t * 0.7) + 1) / 2;
        o.glowCol = [0.35 + 0.4 * k, 0.55 + 0.2 * Math.sin(t * 0.9), 0.95 - 0.35 * k];
        break;
      }
      case 'sway':
        m = m4mul(T(Math.sin(t * 1.4 + o.phase) * 0.07, Math.sin(t * 1.05 + o.phase) * 0.03, 0), o.base);
        break;
      case 'walk': {
        const wp = o.walkPath!;
        const u = (t * wp.speed + o.phase) % 1;
        const px = wp.from[0] + (wp.to[0] - wp.from[0]) * u;
        const pz = wp.from[2] + (wp.to[2] - wp.from[2]) * u;
        const heading = Math.atan2(wp.to[0] - wp.from[0], wp.to[2] - wp.from[2]);
        m = m4mul(T(px, wp.from[1] + Math.abs(Math.sin(t * 9 + o.phase * 20)) * 0.04, pz), m4rotY(heading));
        break;
      }
    }
    return m;
  }

  // ---------- camera and tour ----------
  const CLOSE = 21, FAR = 70;
  const close = (id: SceneId) => ({ x: SPOTS[id].x, z: SPOTS[id].z + 0.6 });
  const azimFor = (_i: number) => 0;
  // displayed camera and its targets (user drags change the targets)
  let tx = close('gta').x, tz = close('gta').z; const ty = TOP + 2.4;
  let azim = azimFor(0), polar = 0.86, dist = CLOSE;
  let tAzim = azim, tPolar = polar, tDist = dist;
  let tTx = tx, tTz = tz;
  let lastTouch = -1e9;
  let hold = false;
  let idx = 0;
  type Phase = { kind: 'dwell' | 'travel'; t0: number; dur: number; from: { x: number; z: number; d: number; az: number; po: number }; to?: { x: number; z: number; az: number }; };
  let phase: Phase = { kind: 'dwell', t0: -1, dur: 9, from: { x: tx, z: tz, d: CLOSE, az: azim, po: polar } };
  let phaseInit = false;
  let focusSent: SceneId | null = null;

  function startTravel(now: number, next: number) {
    idx = next;
    const to = close(TOUR[next]);
    phase = {
      kind: 'travel', t0: now, dur: 6.5,
      from: { x: tTx, z: tTz, d: tDist, az: tAzim, po: tPolar },
      to: { x: to.x, z: to.z, az: azimFor(next) },
    };
  }
  function tourStep(now: number) {
    if (!phaseInit) { phase.t0 = now; phaseInit = true; }
    const u = (now - phase.t0) / 1000 / phase.dur;
    if (phase.kind === 'dwell') {
      // tiny drift so the dwell never looks frozen
      tAzim = azimFor(idx) + Math.sin(now / 2600) * 0.03;
      if (u >= 1) startTravel(now, (idx + 1) % TOUR.length);
      return;
    }
    const k = Math.min(1, u), e = ease(k);
    const f = phase.from, to = phase.to!;
    tTx = mix(f.x, to.x, e); tTz = mix(f.z, to.z, e);
    const base = mix(f.d, CLOSE, e);
    const bump = Math.max(0, FAR - (f.d + CLOSE) / 2) * Math.sin(Math.PI * k);
    tDist = base + bump;
    tPolar = mix(f.po, 0.86, e) - 0.12 * Math.sin(Math.PI * k);
    tAzim = mix(f.az, to.az, e);
    if (k >= 1) phase = { kind: 'dwell', t0: now, dur: 9, from: { x: tTx, z: tTz, d: CLOSE, az: tAzim, po: tPolar } };
  }
  function resumeFrom(now: number) {
    // after the user lets go: glide to the next scene from wherever the camera is
    startTravel(now, (nearestIdx() + 1) % TOUR.length);
  }
  function nearestIdx() {
    let best = 0, bd = 1e9;
    TOUR.forEach((id, i) => {
      const d = Math.hypot(SPOTS[id].x - tTx, SPOTS[id].z - tTz);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  let userActive = false;
  function touched() { lastTouch = performance.now(); userActive = true; }

  // ---------- input ----------
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt = 0, downX = 0, downY = 0, moved = false, pinchD = 0, sawPointer = -1e9;
  function down(x: number, y: number, id: number, isPointer: boolean) {
    if (isPointer) sawPointer = performance.now();
    pointers.set(id, { x, y });
    touched();
    if (pointers.size === 1) { downAt = performance.now(); downX = x; downY = y; moved = false; }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchD = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function move(x: number, y: number, id: number, isPointer: boolean) {
    if (isPointer) sawPointer = performance.now();
    const p = pointers.get(id);
    if (!p) return;
    if (pointers.size === 1) {
      const dx = x - p.x, dy = y - p.y;
      if (Math.hypot(x - downX, y - downY) > 7) { moved = true; touched(); }
      if (moved) {
        // drag pans over the flat canvas, relative to the current view direction
        const s = dist * 0.0021;
        const ca = Math.cos(tAzim), sa = Math.sin(tAzim);
        tTx -= (dx * ca + dy * sa * 1.2) * s;
        tTz -= (-dx * sa + dy * ca * 1.2) * s;
        tTx = Math.max(-34, Math.min(34, tTx)); tTz = Math.max(-30, Math.min(30, tTz));
      }
    } else if (pointers.size === 2) {
      p.x = x; p.y = y;
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchD > 0) tDist = Math.min(70, Math.max(7, tDist * (pinchD / d)));
      pinchD = d;
      moved = true; touched();
    }
    p.x = x; p.y = y;
  }
  function up(x: number, y: number, id: number, isPointer: boolean) {
    if (isPointer) sawPointer = performance.now();
    pointers.delete(id);
    lastTouch = performance.now();
    if (!moved && performance.now() - downAt < 450 && pointers.size === 0) pick(x, y);
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    touched();
    tDist = Math.min(70, Math.max(7, tDist * Math.exp(e.deltaY * 0.0012)));
  }
  const pd = (e: PointerEvent) => { try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ } down(e.clientX, e.clientY, e.pointerId, true); };
  const pm = (e: PointerEvent) => move(e.clientX, e.clientY, e.pointerId, true);
  const pu = (e: PointerEvent) => up(e.clientX, e.clientY, e.pointerId, true);
  const md = (e: MouseEvent) => { if (performance.now() - sawPointer > 600) down(e.clientX, e.clientY, -1, false); };
  const mm = (e: MouseEvent) => { if (performance.now() - sawPointer > 600) move(e.clientX, e.clientY, -1, false); };
  const mu = (e: MouseEvent) => { if (performance.now() - sawPointer > 600) up(e.clientX, e.clientY, -1, false); };
  canvas.addEventListener('pointerdown', pd);
  canvas.addEventListener('pointermove', pm);
  canvas.addEventListener('pointerup', pu);
  canvas.addEventListener('pointercancel', pu);
  canvas.addEventListener('mousedown', md);
  canvas.addEventListener('mousemove', mm);
  canvas.addEventListener('mouseup', mu);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // ---------- picking: each scene owns a box on the flat canvas ----------
  let curProj = m4ident(), curView = m4ident();
  function unproject(inv: M4, nx: number, ny: number, nz: number): V3 {
    const x = inv[0] * nx + inv[4] * ny + inv[8] * nz + inv[12];
    const y = inv[1] * nx + inv[5] * ny + inv[9] * nz + inv[13];
    const z = inv[2] * nx + inv[6] * ny + inv[10] * nz + inv[14];
    const w = inv[3] * nx + inv[7] * ny + inv[11] * nz + inv[15];
    return [x / w, y / w, z / w];
  }
  function pick(cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((cy - r.top) / r.height) * 2;
    const inv = m4invert(m4mul(curProj, curView));
    const o = unproject(inv, nx, ny, -1), f = unproject(inv, nx, ny, 1);
    const dir = norm3(sub3(f, o));
    // hit the plane a little above the canvas surface (scene height), then take the nearest tile
    const planeY = TOP + 1.2;
    if (Math.abs(dir[1]) < 1e-5) return;
    const t = (planeY - o[1]) / dir[1];
    if (t <= 0) return;
    const hx = o[0] + dir[0] * t, hz = o[2] + dir[2] * t;
    let best: SceneId | null = null, bd = 1e9;
    for (const id of TOUR) {
      const dx = Math.abs(hx - SPOTS[id].x), dz = Math.abs(hz - SPOTS[id].z);
      if (dx < 9.5 && dz < 8) {
        const d = dx / 9.5 + dz / 8;
        if (d < bd) { bd = d; best = id; }
      }
    }
    if (best) ev.onPick(best);
  }

  // ---------- render ----------
  let raf = 0, disposed = false;
  const t0 = performance.now();
  let prev = t0;
  function frame(now: number) {
    if (disposed) return;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    // tour control
    const idle = now - lastTouch > 9000 && !hold && pointers.size === 0;
    if (userActive && idle) { userActive = false; resumeFrom(now); }
    if (!userActive && !hold) tourStep(now);
    else if (hold && !userActive) phase.t0 += dt * 1000; // panel open: freeze the tour where it is
    const nid = TOUR[nearestIdx()];
    if (nid !== focusSent) { focusSent = nid; ev.onFocus(nid); }

    const k = Math.min(1, dt * 7);
    const kt = Math.min(1, dt * 5);
    azim += (tAzim - azim) * k;
    polar += (tPolar - polar) * k;
    dist += (tDist - dist) * kt;
    tx += (tTx - tx) * kt;
    tz += (tTz - tz) * kt;

    for (const h of frameHooks) h(t);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl!.viewport(0, 0, w, h);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);

    const aspect = w / Math.max(1, h);
    const fit = Math.min(1, (aspect + 0.35) / 1.65);
    const useDist = dist / Math.max(0.05, fit);
    const eye: V3 = [
      tx + useDist * Math.sin(polar) * Math.sin(azim),
      ty + useDist * Math.cos(polar),
      tz + useDist * Math.sin(polar) * Math.cos(azim),
    ];
    curProj = m4perspective(0.72, aspect, 1, 600);
    curView = m4lookAt(eye, [tx, ty, tz], [0, 1, 0]);
    const fogK = useDist / 17;
    const fogNear = 24 * fogK, fogFar = 60 * fogK;
    const fogCol = [0.9, 0.95, 0.97];

    gl!.useProgram(prog);
    gl!.enable(gl!.CULL_FACE);
    gl!.disable(gl!.BLEND);
    gl!.uniformMatrix4fv(uProj, false, curProj);
    gl!.uniformMatrix4fv(uView, false, curView);
    gl!.uniform1f(uTime, t);
    gl!.uniform3fv(uEye, eye);
    gl!.uniform1f(uFogNear, fogNear);
    gl!.uniform1f(uFogFar, fogFar);
    gl!.uniform3fv(uFogCol, fogCol);
    for (const o of objs) {
      const m = modelFor(o, t);
      gl!.uniformMatrix4fv(uModel, false, m);
      gl!.uniformMatrix3fv(uNrm, false, m4normalMat(m));
      gl!.uniform1f(uWave, o.wave);
      gl!.uniform1f(uGlow, o.glow);
      gl!.uniform3fv(uGlowCol, o.glowCol);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, o.buf);
      gl!.enableVertexAttribArray(aPos);
      gl!.enableVertexAttribArray(aNrm);
      gl!.enableVertexAttribArray(aCol);
      gl!.vertexAttribPointer(aPos, 3, gl!.FLOAT, false, 36, 0);
      gl!.vertexAttribPointer(aNrm, 3, gl!.FLOAT, false, 36, 12);
      gl!.vertexAttribPointer(aCol, 3, gl!.FLOAT, false, 36, 24);
      gl!.drawArrays(gl!.TRIANGLES, 0, o.count);
    }

    // decals (text and displays) after the solids
    gl!.useProgram(dprog);
    gl!.disable(gl!.CULL_FACE);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.uniformMatrix4fv(dU.proj, false, curProj);
    gl!.uniformMatrix4fv(dU.view, false, curView);
    gl!.uniform3fv(dU.eye, eye);
    gl!.uniform1f(dU.fogNear, fogNear);
    gl!.uniform1f(dU.fogFar, fogFar);
    gl!.uniform3fv(dU.fogCol, fogCol);
    gl!.uniform1i(dU.tex, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quadBuf);
    for (let a = 0; a < 3; a++) gl!.disableVertexAttribArray(a);
    gl!.enableVertexAttribArray(daPos);
    gl!.enableVertexAttribArray(daUv);
    gl!.vertexAttribPointer(daPos, 2, gl!.FLOAT, false, 16, 0);
    gl!.vertexAttribPointer(daUv, 2, gl!.FLOAT, false, 16, 8);
    for (const { o, S } of decals) {
      const m = o.billboard
        ? m4mul(o.model, m4mul(m4rotY(azim), S))
        : m4mul(o.model, S);
      gl!.uniformMatrix4fv(dU.model, false, m);
      gl!.uniform1f(dU.glow, o.glow || 0);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, o.tex.tex);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // internal test hook for automated checks
  (window as unknown as Record<string, unknown>).__nw = {
    cam: () => ({ tx, tz, dist, polar, azim, idx, userActive, hold }),
  };

  return {
    flyTo(id) {
      const i = TOUR.indexOf(id);
      touched();
      lastTouch = performance.now() - 8000; // resume the tour shortly after arriving
      startTravel(performance.now(), i);
      userActive = false;
    },
    setHold(h) { hold = h; if (!h) lastTouch = performance.now() - 4000; },
    dispose() {
      delete (window as unknown as Record<string, unknown>).__nw;
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointermove', pm);
      canvas.removeEventListener('pointerup', pu);
      canvas.removeEventListener('pointercancel', pu);
      canvas.removeEventListener('mousedown', md);
      canvas.removeEventListener('mousemove', mm);
      canvas.removeEventListener('mouseup', mu);
      canvas.removeEventListener('wheel', onWheel);
      gl!.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
