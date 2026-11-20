// Small mat4/vec3 helpers and a flat-shaded geometry builder (no dependencies).
export type V3 = [number, number, number];
// ---------- mat4 ----------
export type M4 = Float32Array;
export function m4ident(): M4 { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
export function m4mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
export function m4translate(x: number, y: number, z: number): M4 {
  const m = m4ident(); m[12] = x; m[13] = y; m[14] = z; return m;
}
export function m4scale(x: number, y: number, z: number): M4 {
  const m = m4ident(); m[0] = x; m[5] = y; m[10] = z; return m;
}
export function m4rotX(a: number): M4 {
  const m = m4ident(), c = Math.cos(a), s = Math.sin(a);
  m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m;
}
export function m4rotY(a: number): M4 {
  const m = m4ident(), c = Math.cos(a), s = Math.sin(a);
  m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m;
}
export function m4rotZ(a: number): M4 {
  const m = m4ident(), c = Math.cos(a), s = Math.sin(a);
  m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m;
}
export function m4perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2), m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f;
  m[10] = (far + near) / (near - far); m[11] = -1;
  m[14] = 2 * far * near / (near - far);
  return m;
}
export function m4lookAt(eye: V3, at: V3, up: V3): M4 {
  const z = norm3(sub3(eye, at)), x = norm3(cross3(up, z)), y = cross3(z, x);
  const m = m4ident();
  m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
  m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
  m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
  m[12] = -dot3(x, eye); m[13] = -dot3(y, eye); m[14] = -dot3(z, eye);
  return m;
}
export function m4invert(m: M4): M4 {
  const inv = new Float32Array(16);
  const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7],
    m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11], m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];
  const b00 = m0 * m5 - m1 * m4, b01 = m0 * m6 - m2 * m4, b02 = m0 * m7 - m3 * m4,
    b03 = m1 * m6 - m2 * m5, b04 = m1 * m7 - m3 * m5, b05 = m2 * m7 - m3 * m6,
    b06 = m8 * m13 - m9 * m12, b07 = m8 * m14 - m10 * m12, b08 = m8 * m15 - m11 * m12,
    b09 = m9 * m14 - m10 * m13, b10 = m9 * m15 - m11 * m13, b11 = m10 * m15 - m11 * m14;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return m4ident();
  det = 1 / det;
  inv[0] = (m5 * b11 - m6 * b10 + m7 * b09) * det;
  inv[1] = (m2 * b10 - m1 * b11 - m3 * b09) * det;
  inv[2] = (m13 * b05 - m14 * b04 + m15 * b03) * det;
  inv[3] = (m10 * b04 - m9 * b05 - m11 * b03) * det;
  inv[4] = (m6 * b08 - m4 * b11 - m7 * b07) * det;
  inv[5] = (m0 * b11 - m2 * b08 + m3 * b07) * det;
  inv[6] = (m14 * b02 - m12 * b05 - m15 * b01) * det;
  inv[7] = (m8 * b05 - m10 * b02 + m11 * b01) * det;
  inv[8] = (m4 * b10 - m5 * b08 + m7 * b06) * det;
  inv[9] = (m1 * b08 - m0 * b10 - m3 * b06) * det;
  inv[10] = (m12 * b04 - m13 * b02 + m15 * b00) * det;
  inv[11] = (m9 * b02 - m8 * b04 - m11 * b00) * det;
  inv[12] = (m5 * b07 - m4 * b09 - m6 * b06) * det;
  inv[13] = (m0 * b09 - m1 * b07 + m2 * b06) * det;
  inv[14] = (m13 * b01 - m12 * b03 - m14 * b00) * det;
  inv[15] = (m8 * b03 - m9 * b01 + m10 * b00) * det;
  return inv;
}
export function m4apply(m: M4, v: V3, w: number): V3 {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w,
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w,
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w,
  ];
}
export function m4normalMat(m: M4): Float32Array {
  // upper-left 3x3 (uniform scale only in this world)
  return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
}
export function sub3(a: V3, b: V3): V3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function cross3(a: V3, b: V3): V3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
export function dot3(a: V3, b: V3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function norm3(a: V3): V3 { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

// ---------- geometry builder ----------
// Triangle soup with flat per-face normals and per-vertex colours.
export class GeoBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  tri(a: V3, b: V3, c: V3, color: V3) {
    const n = norm3(cross3(sub3(b, a), sub3(c, a)));
    for (const p of [a, b, c]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(n[0], n[1], n[2]);
      this.col.push(color[0], color[1], color[2]);
    }
  }
  quad(a: V3, b: V3, c: V3, d: V3, color: V3) {
    this.tri(a, b, c, color); this.tri(a, c, d, color);
  }
  // Axis-aligned box centred at (0,0,0), transformed by m.
  box(w: number, h: number, d: number, color: V3, m?: M4) {
    const x = w / 2, y = h / 2, z = d / 2;
    const p: V3[] = [
      [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
      [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
    ];
    const t = (v: V3): V3 => (m ? m4apply(m, v, 1) : v);
    this.quad(t(p[4]), t(p[5]), t(p[6]), t(p[7]), color); // front
    this.quad(t(p[1]), t(p[0]), t(p[3]), t(p[2]), color); // back
    this.quad(t(p[5]), t(p[1]), t(p[2]), t(p[6]), color); // right
    this.quad(t(p[0]), t(p[4]), t(p[7]), t(p[3]), color); // left
    this.quad(t(p[7]), t(p[6]), t(p[2]), t(p[3]), color); // top
    this.quad(t(p[0]), t(p[1]), t(p[5]), t(p[4]), color); // bottom
  }
  // Cylinder/cone along +Y centred at base y=0.
  cyl(rBot: number, rTop: number, h: number, seg: number, color: V3, m?: M4, capTop = true, capBot = true) {
    const ring = (r: number, y: number): V3[] => {
      const pts: V3[] = [];
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      }
      return pts;
    };
    const b = ring(rBot, 0), tpts = ring(rTop, h);
    const t = (v: V3): V3 => (m ? m4apply(m, v, 1) : v);
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      this.quad(t(b[i]), t(b[j]), t(tpts[j]), t(tpts[i]), color);
      if (capTop && rTop > 0.001) this.tri(t([0, h, 0]), t(tpts[i]), t(tpts[j]), color);
      if (capBot && rBot > 0.001) this.tri(t([0, 0, 0]), t(b[j]), t(b[i]), color);
    }
  }
  // Low-poly sphere (lathe).
  sphere(r: number, seg: number, rings: number, color: V3, m?: M4) {
    const t = (v: V3): V3 => (m ? m4apply(m, v, 1) : v);
    for (let ri = 0; ri < rings; ri++) {
      const a0 = (ri / rings) * Math.PI, a1 = ((ri + 1) / rings) * Math.PI;
      for (let si = 0; si < seg; si++) {
        const b0 = (si / seg) * Math.PI * 2, b1 = ((si + 1) / seg) * Math.PI * 2;
        const p = (a: number, bb: number): V3 => [r * Math.sin(a) * Math.cos(bb), r * Math.cos(a), r * Math.sin(a) * Math.sin(bb)];
        this.quad(t(p(a0, b0)), t(p(a0, b1)), t(p(a1, b1)), t(p(a1, b0)), color);
      }
    }
  }
  // Flat disc on XZ plane at y=0, normal +Y.
  disc(r: number, seg: number, color: V3, m?: M4) {
    const t = (v: V3): V3 => (m ? m4apply(m, v, 1) : v);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      this.tri(t([0, 0, 0]), t([Math.cos(a1) * r, 0, Math.sin(a1) * r]), t([Math.cos(a0) * r, 0, Math.sin(a0) * r]), color);
    }
  }
  // Extruded 2D polygon (XZ plane, height h along +Y). Simple convex-ish fan top/bottom + walls.
  prism(pts: [number, number][], h: number, color: V3, m?: M4) {
    const t = (v: V3): V3 => (m ? m4apply(m, v, 1) : v);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % n];
      this.quad(t([x0, 0, z0]), t([x1, 0, z1]), t([x1, h, z1]), t([x0, h, z0]), color);
    }
    // top + bottom fans (convex shapes only)
    for (let i = 1; i < n - 1; i++) {
      this.tri(t([pts[0][0], h, pts[0][1]]), t([pts[i][0], h, pts[i][1]]), t([pts[i + 1][0], h, pts[i + 1][1]]), color);
      this.tri(t([pts[0][0], 0, pts[0][1]]), t([pts[i + 1][0], 0, pts[i + 1][1]]), t([pts[i][0], 0, pts[i][1]]), color);
    }
  }
}

