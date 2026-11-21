// Miniature news world engine: one floating meadow, four 3D miniature scenes, a roaming camera.
// Plain WebGL, no dependencies. Scenes live in ./scenes and draw through the Ctx below.
import {
  GeoBuilder, M4, V3, m4ident, m4invert, m4lookAt, m4mul, m4normalMat, m4perspective,
  m4rotX, m4rotY, m4rotZ, m4scale, m4translate, norm3, sub3,
} from './geo';
import { C } from './palette';
import type { SceneId } from './data';
import { blobOutline, seeded } from './scenes/common';
import { buildGta } from './scenes/gta';
import { buildCyclone } from './scenes/cyclone';
import { buildCricket } from './scenes/cricket';
import { buildMarket } from './scenes/market';
import { buildEpfo } from './scenes/epfo';
import { buildCheetah } from './scenes/cheetah';
import { buildService } from './scenes/service';
import { buildNewStory } from './scenes/newStories';

export type { SceneId };
export interface WorldHandle {
  dispose(): void;
  setHold(hold: boolean): void;
}
export interface WorldEvents {
  onPick(id: SceneId): void;
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

// Scene centres on the meadow (x, z), loosely scattered rather than gridded.
// The first four sit in the middle; the newer four sit around the outside, past the outer road.
export const SPOTS: Record<SceneId, { x: number; z: number }> = {
  gta: { x: -19, z: -10 },
  cyclone: { x: 10, z: -13 },
  cricket: { x: 14, z: 11 },
  market: { x: -15, z: 11 },
  epfo: { x: -40, z: 14 },
  cheetah: { x: 6, z: -42 },
  fastag: { x: 45, z: -3 },
  service: { x: -5, z: 44 },
  // eleven stories share the outer ring, evenly spaced
  puc: { x: 75.3, z: 8.8 },
  antibiotic: { x: 58.4, z: 46.2 },
  signal: { x: 22.9, z: 68.9 },
  voyager: { x: -19.9, z: 69.8 },
  fog: { x: -56.4, z: 48.5 },
  flights: { x: -74.9, z: 11.9 },
  homestay: { x: -69.7, z: -28.8 },
  cancercost: { x: -42.4, z: -59.9 },
  travel: { x: -1.4, z: -72.3 },
  air: { x: 39.6, z: -61.6 },
  motor: { x: 68.3, z: -31.5 },
};
export const TOUR: SceneId[] = ['gta', 'cyclone', 'cricket', 'market', 'epfo', 'cheetah', 'service', 'fastag', 'puc', 'antibiotic', 'signal', 'voyager', 'fog', 'flights', 'homestay', 'cancercost', 'travel', 'air', 'motor'];
// Tap target half-extents per scene (x, z).
const PICK_BOX: Record<SceneId, { rx: number; rz: number }> = {
  gta: { rx: 7, rz: 6.5 },
  cyclone: { rx: 11.5, rz: 8.5 },
  cricket: { rx: 9.5, rz: 9.5 },
  market: { rx: 7, rz: 7.5 },
  epfo: { rx: 6.5, rz: 6.5 },
  cheetah: { rx: 6.5, rz: 6.5 },
  fastag: { rx: 6.5, rz: 6.5 },
  service: { rx: 6.5, rz: 6.5 },
  puc: { rx: 6.5, rz: 6.5 },
  antibiotic: { rx: 6.5, rz: 6.5 },
  signal: { rx: 6.5, rz: 6.5 },
  voyager: { rx: 6.5, rz: 6.5 },
  fog: { rx: 6.5, rz: 6.5 },
  flights: { rx: 7.5, rz: 6.5 },
  homestay: { rx: 6.5, rz: 6.5 },
  cancercost: { rx: 6.5, rz: 6.5 },
  travel: { rx: 6.5, rz: 6.5 },
  air: { rx: 6.5, rz: 6.5 },
  motor: { rx: 6.5, rz: 6.5 },
};
// The meadow is scaled up from the original four-scene island to make room for eight scenes.
const ISL = 2.6;
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
const wrapPi = (a: number) => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

// Closed Catmull-Rom loop sampled to a polyline.
function sampleLoop(pts: V3[], per: number): V3[] {
  const out: V3[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let j = 0; j < per; j++) {
      const u = j / per, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), p1[1], f(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  return out;
}

// ---------- the world ----------
export function mountWorld(canvas: HTMLCanvasElement, ev: WorldEvents): WorldHandle {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: true }) as WebGLRenderingContext | null;
  if (!gl) return { dispose() {}, setHold() {} };

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

  const I = m4ident();
  const T = m4translate;

  // ---------- the floating meadow ----------
  // One organic island: a grass blob on top, tapering soil layers and a rocky tip below.
  {
    const grass = new GeoBuilder();
    grass.prism(blobOutline(36 * ISL, 34 * ISL, 5, 18, 0.08), 1.3, C.grass, T(0, TOP - 1.3, 0));
    ctx.addObj(grass, I);
    const soil1 = new GeoBuilder();
    soil1.prism(blobOutline(36 * ISL * 0.82, 34 * ISL * 0.82, 6, 18, 0.12), 1.3, C.soil, T(0, TOP - 2.6, 0));
    ctx.addObj(soil1, I);
    const soil2 = new GeoBuilder();
    soil2.prism(blobOutline(36 * ISL * 0.6, 34 * ISL * 0.6, 7, 16, 0.14), 1.3, [0.47, 0.32, 0.22], T(0, TOP - 3.9, 0));
    ctx.addObj(soil2, I);
    const soil3 = new GeoBuilder();
    soil3.prism(blobOutline(36 * ISL * 0.38, 34 * ISL * 0.38, 8, 14, 0.16), 1.5, [0.4, 0.27, 0.19], T(0, TOP - 5.4, 0));
    ctx.addObj(soil3, I);
    const tip = new GeoBuilder();
    tip.cyl(0.2, 8.5 * ISL, 2.6, 12, [0.36, 0.25, 0.18], T(0, TOP - 8.0, 0));
    ctx.addObj(tip, I);
  }

  // ---------- the winding roads that tie the stories together ----------
  // An inner loop threaded through the first four scenes and an outer loop that runs between them and the
  // newer four, with a short spur to each of those (clearance-checked against every scene).
  const ROAD_CTRL: V3[] = [
    [-14, 0, -0.7], [-5.8, 0, -10.6], [-7, 0, -23.2], [13.6, 0, -24.9], [24, 0, -16],
    [27.1, 0, 3.6], [25.8, 0, 6.8], [26.5, 0, 13], [21.2, 0, 21], [9, 0, 27.4], [-1.2, 0, 13.2], [-9.1, 0, 2.9],
  ];
  const OUTER_CTRL: V3[] = ([
    [34, -0], [33.8, 9.1], [31.2, 18], [25.5, 25.5], [18, 31.2], [9.1, 33.8], [0, 33], [-8.5, 31.9], [-16.5, 28.6],
    [-23.3, 23.3], [-27.7, 16], [-29.9, 8], [-32, 0], [-31.9, -8.5], [-29.4, -17], [-23.3, -23.3], [-16, -27.7],
    [-8.3, -30.9], [0, -32], [8.3, -30.9], [17, -29.4], [24.7, -24.7], [30.3, -17.5], [32.8, -8.8],
  ] as [number, number][]).map(([x, z]) => [x, 0, z] as V3);
  const roadPath = sampleLoop(ROAD_CTRL, 24);
  const outerPath = sampleLoop(OUTER_CTRL, 14);
  const fringePath = sampleLoop(Array.from({length: 28}, (_,i) => {const a=i/28*Math.PI*2; return [Math.cos(a)*61,0,Math.sin(a)*58] as V3;}), 10);
  const ROAD_COL: V3 = [0.42, 0.42, 0.46];
  const roadAtOn = (path: V3[], u: number): { x: number; z: number; heading: number } => {
    const n = path.length;
    const f = ((u % 1) + 1) % 1 * n;
    const i = Math.floor(f) % n, k = f - Math.floor(f);
    const a = path[i], b = path[(i + 1) % n];
    const x = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k;
    return { x, z, heading: Math.atan2(b[0] - a[0], b[2] - a[2]) };
  };
  {
    const g = new GeoBuilder();
    const W = 0.85, y = TOP + 0.05;
    const strip = (pts: V3[], closed: boolean) => {
      const n = closed ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const dx = b[0] - a[0], dz = b[2] - a[2];
        const l = Math.hypot(dx, dz) || 1;
        const nx = -dz / l, nz = dx / l;
        g.quad(
          [a[0] - nx * W, y, a[2] - nz * W], [a[0] + nx * W, y, a[2] + nz * W],
          [b[0] + nx * W, y, b[2] + nz * W], [b[0] - nx * W, y, b[2] - nz * W],
          ROAD_COL,
        );
      }
      // joint caps: discs fill the wedge gaps where quad segments meet on curves
      // (same colour and height as the quads, so the coplanar overlap is invisible)
      for (const p of pts) g.disc(W, 10, ROAD_COL, T(p[0], y, p[2]));
    };
    strip(roadPath, true);
    strip(outerPath, true);
    strip(fringePath, true);
    // a spur from the outer loop to each of the newer four scenes
    for (const id of TOUR.slice(4)) {
      const c = SPOTS[id];
      const connectorPath = TOUR.indexOf(id) < 8 ? outerPath : fringePath;
      let best = connectorPath[0], bd = 1e9;
      for (const p of connectorPath) {
        const d = Math.hypot(p[0] - c.x, p[2] - c.z);
        if (d < bd) { bd = d; best = p; }
      }
      const dx = best[0] - c.x, dz = best[2] - c.z, l = Math.hypot(dx, dz) || 1;
      const end: V3 = [c.x + (dx / l) * 5.2, 0, c.z + (dz / l) * 5.2];
      const pts: V3[] = [];
      for (let k = 0; k <= 8; k++) pts.push([best[0] + (end[0] - best[0]) * k / 8, 0, best[2] + (end[2] - best[2]) * k / 8]);
      strip(pts, false);
    }
    ctx.addObj(g, I);
  }
  // a few cars on each loop, sparse and unhurried
  const carCols: V3[] = [[0.85, 0.25, 0.2], [0.25, 0.45, 0.85], [0.95, 0.75, 0.2], [0.3, 0.7, 0.45], [0.7, 0.4, 0.8], [0.95, 0.55, 0.25]];
  const carState: { x: number; z: number }[] = [];
  for (let k = 0; k < 9; k++) {
    const g = new GeoBuilder();
    const col = carCols[k % carCols.length];
    g.box(0.55, 0.22, 1.15, col, T(0, 0.2, 0));               // body
    g.box(0.46, 0.2, 0.55, col, T(0, 0.4, -0.06));            // cabin
    g.box(0.47, 0.12, 0.3, [0.7, 0.85, 0.95], T(0, 0.4, 0.16)); // windshield band
    for (const [wx, wz] of [[-0.28, 0.36], [0.28, 0.36], [-0.28, -0.36], [0.28, -0.36]] as [number, number][]) {
      g.cyl(0.11, 0.11, 0.08, 10, [0.15, 0.15, 0.17], m4mul(T(wx, 0.11, wz), m4rotZ(Math.PI / 2)));
    }
    const inner = k < 3;
    const path = inner ? roadPath : k < 6 ? outerPath : fringePath;
    const speed = inner ? 0.016 + k * 0.004 : k < 6 ? 0.011 + (k - 3) * 0.0025 : 0.007 + (k - 6) * 0.0015, off = (k % 3) / 3 + (inner ? 0 : 0.17);
    carState.push({ x: 0, z: 0 });
    ctx.addObj(g, I, {
      update: (t) => {
        const p = roadAtOn(path, t * speed + off);
        carState[k].x = p.x; carState[k].z = p.z;
        return m4mul(T(p.x, TOP + 0.05 + Math.abs(Math.sin(t * 7 + k)) * 0.015, p.z), m4rotY(p.heading));
      },
    });
  }

  // ---------- a small plane crossing the sky now and then ----------
  const planeFrom: V3 = [-82, TOP + 13.5, -58];
  const planeTo: V3 = [82, TOP + 15, 50];
  const PLANE_PERIOD = 36, PLANE_FLY = 20;
  const planeHeading = Math.atan2(planeTo[0] - planeFrom[0], planeTo[2] - planeFrom[2]);
  const planeState = { visible: false };
  function planeM(t: number): M4 {
    const u = (t % PLANE_PERIOD) / PLANE_FLY;
    if (u >= 1) { planeState.visible = false; return T(0, -80, 0); }
    planeState.visible = true;
    const x = planeFrom[0] + (planeTo[0] - planeFrom[0]) * u;
    const y = planeFrom[1] + (planeTo[1] - planeFrom[1]) * u + Math.sin(t * 0.9) * 0.4;
    const z = planeFrom[2] + (planeTo[2] - planeFrom[2]) * u;
    return m4mul(T(x, y, z), m4mul(m4rotY(planeHeading), m4rotZ(0.12)));
  }
  {
    const g = new GeoBuilder();
    const red: V3 = [0.85, 0.3, 0.25], cream: V3 = [0.96, 0.93, 0.85];
    g.box(0.5, 0.5, 2.2, red, T(0, 0, 0));                                  // fuselage
    g.cyl(0.24, 0.02, 0.55, 10, cream, m4mul(T(0, 0, 1.05), m4rotX(Math.PI / 2))); // nose cone, tip forward
    g.box(3.6, 0.08, 0.75, cream, T(0, 0.12, 0.25));                         // wings
    g.box(1.25, 0.07, 0.45, cream, T(0, 0.18, -1.0));                        // tailplane
    g.box(0.08, 0.5, 0.5, red, T(0, 0.42, -0.95));                           // fin
    ctx.addObj(g, I, { update: (t) => planeM(t) });
    const prop = new GeoBuilder();
    prop.box(0.1, 1.15, 0.06, [0.25, 0.25, 0.28], T(0, 0, 0));
    prop.box(1.15, 0.1, 0.06, [0.25, 0.25, 0.28], T(0, 0, 0));
    ctx.addObj(prop, I, { update: (t) => (planeState.visible ? m4mul(planeM(t), m4mul(T(0, 0, 1.7), m4rotZ(t * 22))) : T(0, -80, 0)) });
  }

  // ---------- clouds, birds and meadow dressing ----------
  const cloudSpots: [number, number, number, number][] = [
    [-28, 10, -24, 1.5], [0, 11, -6, 1.4], [-14, 12, -29, 1.8], [-14, 11, 25, 1.5], [30, 10, -4, 1.2], [-31, 10.5, 3, 1.3], [26, 11.5, 20, 1.4],
    [-48, 11, -20, 1.6], [-30, 12, 36, 1.5], [22, 11, 44, 1.6], [48, 10.5, 22, 1.4], [40, 12, -38, 1.7], [-26, 11.5, -54, 1.5], [-52, 10.5, 40, 1.3], [58, 11, -20, 1.2], [14, 12, 58, 1.4],
  ];
  for (const [x, y, z, s] of cloudSpots) {
    const g = new GeoBuilder();
    g.sphere(0.75, 10, 6, C.cloud, m4mul(T(0, 0, 0), m4scale(1.5, 0.75, 1)));
    g.sphere(0.55, 10, 6, C.cloud, m4mul(T(0.95, 0.1, 0.15), m4scale(1.2, 0.7, 1)));
    g.sphere(0.5, 10, 6, C.cloud, m4mul(T(-0.9, 0.05, -0.1), m4scale(1.1, 0.65, 1)));
    ctx.addObj(g, m4mul(T(x, y, z), m4scale(s, s, s)), { anim: 'bob', phase: x, amp: 0.3 });
  }
  // birds on a lazy circuit
  for (let b = 0; b < 3; b++) {
    const g = new GeoBuilder();
    g.sphere(0.09, 8, 6, [0.2, 0.2, 0.24]);
    g.box(0.5, 0.03, 0.14, [0.2, 0.2, 0.24], m4mul(T(-0.3, 0.04, 0), m4rotZ(0.35)));
    g.box(0.5, 0.03, 0.14, [0.2, 0.2, 0.24], m4mul(T(0.3, 0.04, 0), m4rotZ(-0.35)));
    const cx = -6 + b * 9, cz = b % 2 ? 6 : -8, r = 14 + b * 6, sp = 0.04 + b * 0.01, ph = b * 2.1;
    ctx.addObj(g, I, {
      update: (t) => {
        const a = t * sp + ph;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        return m4mul(T(x, TOP + 9.5 + Math.sin(t * 1.3 + ph) * 0.5, z), m4rotY(-a));
      },
    });
  }
  // bushes, flowers, rocks and a pond, kept clear of scenes and the road
  {
    const clearOf = (x: number, z: number) => {
      for (const id of TOUR) {
        const b = PICK_BOX[id];
        if (Math.hypot(x - SPOTS[id].x, z - SPOTS[id].z) < Math.max(b.rx, b.rz) + 1.6) return false;
      }
      for (const path of [roadPath, outerPath, fringePath]) {
        for (let i = 0; i < path.length; i += 2) {
          if (Math.hypot(x - path[i][0], z - path[i][2]) < 2.3) return false;
        }
      }
      return Math.hypot(x, z) < 48;
    };
    const rnd = seeded(23);
    const bush = new GeoBuilder();
    let placed = 0, guard = 0;
    while (placed < 22 && guard++ < 260) {
      const x = (rnd() * 2 - 1) * 48, z = (rnd() * 2 - 1) * 48;
      if (!clearOf(x, z)) continue;
      const s = 0.5 + rnd() * 0.5;
      bush.sphere(0.5, 9, 6, C.grassDark, m4mul(T(x, TOP + 0.25 * s, z), m4scale(s * 1.3, s, s * 1.3)));
      bush.sphere(0.32, 8, 5, C.grassDark, m4mul(T(x + 0.5 * s, TOP + 0.2 * s, z + 0.3 * s), m4scale(s, s * 0.8, s)));
      placed++;
    }
    ctx.addObj(bush, I);
    const flowers = new GeoBuilder();
    placed = 0; guard = 0;
    const petal: V3[] = [[0.95, 0.5, 0.6], [0.95, 0.85, 0.3], [0.97, 0.97, 0.95], [0.7, 0.5, 0.9]];
    while (placed < 32 && guard++ < 400) {
      const x = (rnd() * 2 - 1) * 48, z = (rnd() * 2 - 1) * 48;
      if (!clearOf(x, z)) continue;
      flowers.cyl(0.02, 0.02, 0.22, 5, C.plant, T(x, TOP, z));
      flowers.sphere(0.09, 7, 5, petal[placed % petal.length], T(x, TOP + 0.26, z));
      placed++;
    }
    ctx.addObj(flowers, I, { anim: 'sway', phase: 2, amp: 0.05 });
    const rocks = new GeoBuilder();
    placed = 0; guard = 0;
    while (placed < 12 && guard++ < 200) {
      const x = (rnd() * 2 - 1) * 47, z = (rnd() * 2 - 1) * 47;
      if (!clearOf(x, z)) continue;
      const s = 0.3 + rnd() * 0.35;
      rocks.sphere(0.4, 8, 5, [0.6, 0.6, 0.62], m4mul(T(x, TOP + 0.1 * s, z), m4scale(s * 1.3, s * 0.8, s)));
      placed++;
    }
    ctx.addObj(rocks, I);
    { // pond
      const g = new GeoBuilder();
      // stacked well apart: the wave must never let the two discs (or the grass
      // top) reach the same depth, or they z-fight on 16-bit phone depth buffers
      g.disc(2.4, 26, [0.45, 0.72, 0.85], T(0.5, TOP + 0.06, -2));
      g.disc(1.9, 26, [0.35, 0.62, 0.78], T(0.5, TOP + 0.12, -2));
      ctx.addObj(g, I, { wave: 0.012 });
    }
    // two round trees
    // more round trees, scattered with the same clearances as the bushes
    const treeSpots: [number, number, number][] = [[3.5, 16.5, 1.0], [-5, -18.5, 1.2]];
    {
      let n = 0, gd = 0;
      while (n < 12 && gd++ < 400) {
        const x = (rnd() * 2 - 1) * 48, z = (rnd() * 2 - 1) * 48;
        if (!clearOf(x, z)) continue;
        treeSpots.push([x, z, 0.8 + rnd() * 0.5]);
        n++;
      }
    }
    for (const [x, z, s] of treeSpots) {
      const g = new GeoBuilder();
      g.cyl(0.14, 0.18, 1.1, 8, C.trunk, T(x, TOP, z));
      g.sphere(0.9, 10, 7, C.palm, T(x, TOP + 1.5 * s, z));
      g.sphere(0.6, 9, 6, C.grassDark, m4mul(T(x + 0.55 * s, TOP + 1.15 * s, z + 0.3), m4scale(1, 0.9, 1)));
      ctx.addObj(g, I, { anim: 'sway', phase: x, amp: 0.04 });
    }
  }

  buildGta(ctx, SPOTS.gta);
  buildCyclone(ctx, SPOTS.cyclone);
  buildCricket(ctx, SPOTS.cricket);
  buildMarket(ctx, SPOTS.market);
  buildEpfo(ctx, SPOTS.epfo);
  buildCheetah(ctx, SPOTS.cheetah);
  buildService(ctx, SPOTS.service);
  buildNewStory(ctx, SPOTS.fastag, 'fastag');
  buildNewStory(ctx, SPOTS.puc, 'puc');
  buildNewStory(ctx, SPOTS.antibiotic, 'antibiotic');
  buildNewStory(ctx, SPOTS.signal, 'signal');
  buildNewStory(ctx, SPOTS.voyager, 'voyager');
  buildNewStory(ctx, SPOTS.fog, 'fog');
  buildNewStory(ctx, SPOTS.flights, 'flights');
  buildNewStory(ctx, SPOTS.homestay, 'homestay');
  buildNewStory(ctx, SPOTS.cancercost, 'cancercost');
  buildNewStory(ctx, SPOTS.travel, 'travel');
  buildNewStory(ctx, SPOTS.air, 'air');
  buildNewStory(ctx, SPOTS.motor, 'motor');

  // ---------- per-frame model matrix ----------
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

  // ---------- camera: a roaming visitor ----------
  // Each visit: arrive facing the scene's front (headline beat), then slowly
  // circle it to show the sides, pull back, and wander to a random other story.
  const FAR = 135;
  const HOLD = 0.24; // first slice of a dwell: hold the readable framing
  const close = (id: SceneId) => ({ x: SPOTS[id].x, z: SPOTS[id].z + 0.4 });
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  let cur: SceneId = 'gta';
  const start = close(cur);
  let tx = start.x, tz = start.z; const ty = TOP + 2.4;
  let azim = 0, polar = 1.0, dist = 21;
  let tAzim = azim, tPolar = polar, tDist = dist;
  let tTx = tx, tTz = tz;
  let lastTouch = -1e9;
  let hold = false;

  interface Dwell {
    kind: 'dwell'; t0: number; dur: number;
    az0: number; sweep: number; po0: number; po1: number; d0: number; d1: number;
  }
  interface Travel {
    kind: 'travel'; t0: number; dur: number;
    from: { x: number; z: number; az: number; po: number; d: number };
    to: { x: number; z: number; az: number; po: number; d: number };
  }
  type Phase = Dwell | Travel;

  function dwellParams(now: number): Dwell {
    const dir = Math.random() < 0.5 ? -1 : 1;
    return {
      kind: 'dwell', t0: now, dur: rnd(16000, 19000),
      az0: wrapPi(rnd(-0.4, 0.4)),            // arrive from roughly the front
      sweep: dir * rnd(0.85, 1.45),           // then circle off to one side
      po0: rnd(0.92, 1.04),                   // entry: higher, readable
      po1: rnd(1.14, 1.26),                   // orbit: low enough to show the sides
      d0: rnd(18.5, 21), d1: rnd(20, 23),
    };
  }
  // shuffled rounds: visit every story once in random order, reshuffle, repeat.
  // The last story of a round never opens the next round either.
  const shuffle = (arr: SceneId[]): SceneId[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  let bag: SceneId[] = shuffle(TOUR.filter((s) => s !== cur)); // cur counts as visited this round
  function nextStory(exclude: SceneId): SceneId {
    if (bag.length === 0) {
      bag = shuffle(TOUR.slice());
      if (bag.length > 1 && bag[0] === exclude) {
        const k = 1 + Math.floor(Math.random() * (bag.length - 1));
        [bag[0], bag[k]] = [bag[k], bag[0]];
      }
    }
    // never travel to the story the camera is already at (possible after user panning)
    if (bag.length > 1 && bag[0] === exclude) {
      const k = 1 + Math.floor(Math.random() * (bag.length - 1));
      [bag[0], bag[k]] = [bag[k], bag[0]];
    }
    return bag.shift()!;
  }
  let phase: Phase = dwellParams(0);
  let pendingDwell: Dwell | null = null;
  let phaseInit = false;
  
  function startTravel(now: number, next: SceneId) {
    const c = close(next);
    const d = dwellParams(0);
    phase = {
      kind: 'travel', t0: now, dur: 9000,
      from: { x: tTx, z: tTz, az: tAzim, po: tPolar, d: tDist },
      to: { x: c.x, z: c.z, az: d.az0, po: d.po0, d: d.d0 },
    };
    pendingDwell = d;
    cur = next;
  }
  function tourStep(now: number) {
    if (!phaseInit) { phase.t0 = now; phaseInit = true; }
    const u = (now - phase.t0) / phase.dur;
    if (phase.kind === 'dwell') {
      const d = phase;
      const c = close(cur);
      tTx = c.x; tTz = c.z;
      if (u < HOLD) {
        // headline beat: steady, readable framing with a hint of life
        tAzim = d.az0 + Math.sin(now / 2600) * 0.03;
        tPolar = d.po0;
        tDist = d.d0;
      } else {
        const k = ease(Math.min(1, (u - HOLD) / (1 - HOLD)));
        tAzim = d.az0 + d.sweep * k;
        tPolar = mix(d.po0, d.po1, k);
        tDist = mix(d.d0, d.d1, k) + Math.sin(k * Math.PI) * 1.1;
      }
      if (u >= 1) startTravel(now, nextStory(cur));
      return;
    }
    const k = Math.min(1, u), e = ease(k);
    const f = phase.from, to = phase.to;
    tTx = mix(f.x, to.x, e); tTz = mix(f.z, to.z, e);
    const bump = Math.max(0, FAR - (f.d + to.d) / 2) * Math.sin(Math.PI * k);
    tDist = mix(f.d, to.d, e) + bump;
    tPolar = mix(f.po, to.po, e) - 0.28 * Math.sin(Math.PI * k); // rise overhead midway, then sink back down
    tAzim = f.az + wrapPi(to.az - f.az) * e;
    if (k >= 1 && pendingDwell) {
      pendingDwell.t0 = now;
      phase = pendingDwell;
      pendingDwell = null;
    }
  }
  function nearestIdx() {
    let best = 0, bd = 1e9;
    TOUR.forEach((id, i) => {
      const d = Math.hypot(SPOTS[id].x - tTx, SPOTS[id].z - tTz);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function resumeFrom(now: number) {
    // after the user lets go: wander to a random story that isn't the nearest one
    startTravel(now, nextStory(TOUR[nearestIdx()]));
  }
  let userActive = false;
  function touched() { lastTouch = performance.now(); userActive = true; }

  // ---------- input ----------
  // Manual camera control: drag pans over the meadow, wheel/pinch zooms toward
  // the point under the cursor or fingers, and both keep a little momentum
  // after you let go, so movement feels free flowing instead of clamped.
  // Zoom limits are real camera distance. Phones dollie the camera out by
  // 1/fit to fit the world on a narrow screen, so clamp in that real scale -
  // otherwise a phone could only ever get half as close as a desktop.
  const MIN_D = 3, MAX_D = 160;
  function viewFit() {
    const aspect = (canvas.clientWidth || 1) / Math.max(1, canvas.clientHeight || 1);
    return Math.min(1, (aspect + 0.35) / 1.65);
  }
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt = 0, downX = 0, downY = 0, moved = false, pinchD = 0, sawPointer = -1e9;
  let zVel = 0; // zoom momentum: log-distance per second, decays after the wheel stops
  let zAnchor: { x: number; z: number } | null = null; // world point the zoom glides toward
  let pVX = 0, pVZ = 0; // pan momentum: world units per second
  let lastMoveT = 0;
  function zoomBy(factor: number, anchor: { x: number; z: number } | null) {
    const old = tDist;
    const fit = viewFit();
    const nd = Math.min(MAX_D * fit, Math.max(MIN_D * fit, old * factor));
    if (nd === old) { zVel = 0; return; }
    tDist = nd;
    const applied = nd / old;
    if (anchor) {
      zAnchor = anchor;
      // keep the anchored spot under the cursor/fingers as we close in on it
      tTx += (anchor.x - tTx) * (1 - applied);
      tTz += (anchor.z - tTz) * (1 - applied);
      tTx = Math.max(-58, Math.min(58, tTx)); tTz = Math.max(-54, Math.min(54, tTz));
    }
  }
  function down(x: number, y: number, id: number, isPointer: boolean) {
    if (isPointer) sawPointer = performance.now();
    pointers.set(id, { x, y });
    touched();
    zVel = 0; pVX = 0; pVZ = 0; lastMoveT = 0;
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
    const nowT = performance.now();
    const mdt = lastMoveT > 0 ? Math.min(0.1, (nowT - lastMoveT) / 1000) : 0;
    lastMoveT = nowT;
    if (pointers.size === 1) {
      const dx = x - p.x, dy = y - p.y;
      if (Math.hypot(x - downX, y - downY) > 7) { moved = true; touched(); }
      if (moved) {
        // drag pans like a map: the ground sticks to the finger
        const prev = planePoint(p.x, p.y), cur = planePoint(x, y);
        let wx = 0, wz = 0;
        if (prev && cur) {
          wx = -(cur.x - prev.x); wz = -(cur.z - prev.z);
        } else {
          const s = (dist / viewFit()) * 0.0021;
          const ca = Math.cos(tAzim), sa = Math.sin(tAzim);
          wx = -(dx * ca + dy * sa * 1.2) * s;
          wz = -(-dx * sa + dy * ca * 1.2) * s;
        }
        tTx = Math.max(-58, Math.min(58, tTx + wx));
        tTz = Math.max(-54, Math.min(54, tTz + wz));
        if (mdt > 0) {
          const cap = 45;
          pVX = Math.max(-cap, Math.min(cap, wx / mdt));
          pVZ = Math.max(-cap, Math.min(cap, wz / mdt));
        }
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const ocx = (a.x + b.x) / 2, ocy = (a.y + b.y) / 2;
      const oAng = Math.atan2(b.y - a.y, b.x - a.x);
      p.x = x; p.y = y;
      const ncx = (a.x + b.x) / 2, ncy = (a.y + b.y) / 2;
      const nAng = Math.atan2(b.y - a.y, b.x - a.x);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      // pinch zooms toward the spot between the fingers
      if (pinchD > 0) zoomBy(pinchD / d, planePoint(ncx, ncy));
      pinchD = d;
      // twisting the fingers spins the view, like rotating a map
      tAzim += wrapPi(nAng - oAng);
      // two fingers gliding together pan, ground tracking the midpoint
      const prevC = planePoint(ocx, ocy), curC = planePoint(ncx, ncy);
      if (prevC && curC) {
        tTx = Math.max(-58, Math.min(58, tTx - (curC.x - prevC.x)));
        tTz = Math.max(-54, Math.min(54, tTz - (curC.z - prevC.z)));
      } else {
        const dx = ncx - ocx, dy = ncy - ocy;
        const s = (dist / viewFit()) * 0.0021;
        const ca = Math.cos(tAzim), sa = Math.sin(tAzim);
        tTx = Math.max(-58, Math.min(58, tTx - (dx * ca + dy * sa * 1.2) * s));
        tTz = Math.max(-54, Math.min(54, tTz - (-dx * sa + dy * ca * 1.2) * s));
      }
      pVX = 0; pVZ = 0;
      moved = true; touched();
    }
    p.x = x; p.y = y;
  }
  function up(x: number, y: number, id: number, isPointer: boolean) {
    if (isPointer) sawPointer = performance.now();
    pointers.delete(id);
    lastTouch = performance.now();
    if (!moved && performance.now() - downAt < 450 && pointers.size === 0) pick(x, y);
    if (pointers.size === 0) {
      // keep the fling only if the finger was still moving when it lifted
      if (lastMoveT > 0 && performance.now() - lastMoveT > 90) { pVX = 0; pVZ = 0; }
      lastMoveT = 0;
    }
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    touched();
    const unit = e.deltaMode === 1 ? 16 : 1; // line-mode wheels -> pixels
    const f = Math.exp(e.deltaY * unit * 0.0013);
    const old = tDist;
    zoomBy(f, planePoint(e.clientX, e.clientY));
    zVel = tDist !== old ? Math.log(tDist / old) / 0.09 : 0; // short glide after the wheel stops
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

  // ---------- picking: each scene owns a patch of the meadow ----------
  let curProj = m4ident(), curView = m4ident();
  function unproject(inv: M4, nx: number, ny: number, nz: number): V3 {
    const x = inv[0] * nx + inv[4] * ny + inv[8] * nz + inv[12];
    const y = inv[1] * nx + inv[5] * ny + inv[9] * nz + inv[13];
    const z = inv[2] * nx + inv[6] * ny + inv[10] * nz + inv[14];
    const w = inv[3] * nx + inv[7] * ny + inv[11] * nz + inv[15];
    return [x / w, y / w, z / w];
  }
  function planePoint(cx: number, cy: number): { x: number; z: number } | null {
    const r = canvas.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((cy - r.top) / r.height) * 2;
    const inv = m4invert(m4mul(curProj, curView));
    const o = unproject(inv, nx, ny, -1), f = unproject(inv, nx, ny, 1);
    const dir = norm3(sub3(f, o));
    // hit the plane a little above the meadow surface (scene height)
    const planeY = TOP + 1.2;
    if (Math.abs(dir[1]) < 1e-5) return null;
    const t = (planeY - o[1]) / dir[1];
    if (t <= 0) return null;
    return { x: o[0] + dir[0] * t, z: o[2] + dir[2] * t };
  }
  function pick(cx: number, cy: number) {
    const h = planePoint(cx, cy);
    if (!h) return;
    let best: SceneId | null = null, bd = 1e9;
    for (const id of TOUR) {
      const b = PICK_BOX[id];
      const dx = Math.abs(h.x - SPOTS[id].x), dz = Math.abs(h.z - SPOTS[id].z);
      if (dx < b.rx && dz < b.rz) {
        const d = dx / b.rx + dz / b.rz;
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

    // tour control: the camera only wanders again after a full quiet minute,
    // so it never steals the view while someone is still exploring
    const idle = now - lastTouch > 60000 && !hold && pointers.size === 0;
    if (userActive && idle) { userActive = false; resumeFrom(now); }
    if (!userActive && !hold) tourStep(now);
    else if (hold && !userActive) phase.t0 += dt * 1000; // panel open: freeze the tour where it is

    const k = Math.min(1, dt * 7);
    const kt = Math.min(1, dt * 5);
    if (pointers.size > 0) {
      // fingers on screen: the view tracks them exactly, no easing lag
      azim = tAzim; polar = tPolar; dist = tDist; tx = tTx; tz = tTz;
    } else {
      azim += (tAzim - azim) * k;
      polar += (tPolar - polar) * k;
      dist += (tDist - dist) * kt;
      tx += (tTx - tx) * kt;
      tz += (tTz - tz) * kt;
    }

    // free-flow momentum after the fingers or wheel let go
    if (userActive && pointers.size === 0) {
      if (zVel !== 0) {
        zoomBy(Math.exp(zVel * dt), zAnchor);
        zVel *= Math.exp(-6 * dt);
        if (Math.abs(zVel) < 0.02) zVel = 0;
      }
      if (pVX !== 0 || pVZ !== 0) {
        tTx = Math.max(-58, Math.min(58, tTx + pVX * dt));
        tTz = Math.max(-54, Math.min(54, tTz + pVZ * dt));
        const damp = Math.exp(-3.5 * dt);
        pVX *= damp; pVZ *= damp;
        if (Math.abs(pVX) < 0.02 && Math.abs(pVZ) < 0.02) { pVX = 0; pVZ = 0; }
      }
    }

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
    curProj = m4perspective(0.72, aspect, 2, 650);
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
    cam: () => ({ tx, tz, dist, polar, azim, cur, userActive, hold, phase: phase.kind, duration: phase.dur }),
    select: (id: SceneId) => ev.onPick(id),
    spots: SPOTS,
    next: () => startTravel(performance.now(), nextStory(cur)),
    look: (x: number, z: number, az: number, pol: number, d: number) => {
      tx = x; tz = z; tTx = x; tTz = z;
      azim = az; polar = pol; dist = d; tAzim = az; tPolar = pol; tDist = d;
      touched();
    },
    cars: () => carState.map((c) => ({ ...c })),
    bag: () => ({ cur, remaining: bag.slice() }),
    plane: () => ({ ...planeState }),
  };

  return {
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
