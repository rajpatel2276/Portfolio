import { rng, gauss } from './mlp.js'

// every generator returns [{ u, v, c }] with u, v in about [-1, 1] and class c = 0 or 1
// c = 0 is orange, c = 1 is teal

function circle(seed = 11) {
  const r = rng(seed)
  const pts = []
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2
    const rad = Math.abs(gauss(r)) * 0.2
    pts.push({ u: Math.cos(a) * rad, v: Math.sin(a) * rad, c: 0 })
  }
  for (let i = 0; i < 110; i++) {
    const a = r() * Math.PI * 2
    const rad = 0.68 + r() * 0.2
    pts.push({ u: Math.cos(a) * rad, v: Math.sin(a) * rad, c: 1 })
  }
  return pts
}

function xor(seed = 12) {
  const r = rng(seed)
  const pts = []
  while (pts.length < 200) {
    const u = (r() * 2 - 1) * 0.9
    const v = (r() * 2 - 1) * 0.9
    if (Math.abs(u) < 0.1 || Math.abs(v) < 0.1) continue
    pts.push({ u, v, c: u * v > 0 ? 1 : 0 })
  }
  return pts
}

function moons(seed = 13) {
  const r = rng(seed)
  const pts = []
  for (let i = 0; i < 100; i++) {
    const t = r() * Math.PI
    pts.push({ u: Math.cos(t) + gauss(r) * 0.07, v: Math.sin(t) + gauss(r) * 0.07, c: 0 })
    pts.push({ u: 1 - Math.cos(t) + gauss(r) * 0.07, v: 0.5 - Math.sin(t) + gauss(r) * 0.07, c: 1 })
  }
  // centre and scale into [-0.88, 0.88]
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
  pts.forEach((p) => {
    minU = Math.min(minU, p.u); maxU = Math.max(maxU, p.u)
    minV = Math.min(minV, p.v); maxV = Math.max(maxV, p.v)
  })
  const s = 1.76 / Math.max(maxU - minU, maxV - minV)
  const cu = (minU + maxU) / 2
  const cv = (minV + maxV) / 2
  return pts.map((p) => ({ u: (p.u - cu) * s, v: (p.v - cv) * s, c: p.c }))
}

function spiral(seed = 14) {
  const r = rng(seed)
  const pts = []
  const n = 100
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < n; i++) {
      const k = i / n
      const rad = 0.08 + k * 0.82
      const t = k * 1.75 * Math.PI * 2 + c * Math.PI
      pts.push({ u: rad * Math.sin(t) + gauss(r) * 0.025, v: rad * Math.cos(t) + gauss(r) * 0.025, c })
    }
  }
  return pts
}

export const DATASETS = {
  circle: { label: 'Circle', make: circle },
  xor: { label: 'XOR', make: xor },
  moons: { label: 'Moons', make: moons },
  spiral: { label: 'Spiral', make: spiral },
}
