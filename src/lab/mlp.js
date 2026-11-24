// A tiny neural network, written from scratch: dense layers, tanh or ReLU,
// a sigmoid output, binary cross-entropy loss, hand-coded backpropagation
// and the Adam optimizer. No libraries.

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gauss(r) {
  let u = 0
  let v = 0
  while (u === 0) u = r()
  while (v === 0) v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export class MLP {
  constructor(sizes = [2, 16, 16, 1], act = 'tanh', seed = 7, lr = 0.03) {
    this.sizes = sizes
    this.act = act
    this.lr = lr
    this.L = sizes.length - 1
    this.t = 0
    const r = rng(seed)

    this.W = []
    this.b = []
    this.mW = []
    this.vW = []
    this.mb = []
    this.vb = []
    this.gW = []
    this.gb = []

    for (let l = 0; l < this.L; l++) {
      const nin = sizes[l]
      const nout = sizes[l + 1]
      const w = new Float64Array(nin * nout)
      const hiddenRelu = act === 'relu' && l < this.L - 1
      if (hiddenRelu) {
        const std = Math.sqrt(2 / nin) // He initialisation
        for (let i = 0; i < w.length; i++) w[i] = gauss(r) * std
      } else {
        // Xavier initialisation, widened 1.6x for tanh: tested on 24 seeds, this stops the
        // spiral from getting stuck in a local minimum (the plain scale failed on 1-5 of 24)
        const lim = Math.sqrt(6 / (nin + nout)) * 1.6
        for (let i = 0; i < w.length; i++) w[i] = (r() * 2 - 1) * lim
      }
      this.W.push(w)
      this.b.push(new Float64Array(nout))
      this.mW.push(new Float64Array(w.length))
      this.vW.push(new Float64Array(w.length))
      this.mb.push(new Float64Array(nout))
      this.vb.push(new Float64Array(nout))
      this.gW.push(new Float64Array(w.length))
      this.gb.push(new Float64Array(nout))
    }

    // single-sample buffers (used for drawing the decision boundary)
    this._f0 = new Float64Array(sizes[0])
    this._f = sizes.slice(1).map((n) => new Float64Array(n))

    // batch buffers (grown on demand)
    this._cap = 0
    this.A = []
    this._dz = []
  }

  _ensure(n) {
    if (n <= this._cap) return
    const cap = Math.max(n, Math.ceil(this._cap * 1.5), 64)
    this._cap = cap
    this.A = this.sizes.map((s, l) => (l === 0 ? null : new Float64Array(cap * s)))
    this._dz = this.sizes.slice(1).map((s) => new Float64Array(cap * s))
  }

  // probability of class 1 for one point
  forwardOne(u, v) {
    const { sizes, W, b, L, act } = this
    let cur = this._f0
    cur[0] = u
    cur[1] = v
    for (let l = 0; l < L; l++) {
      const nin = sizes[l]
      const nout = sizes[l + 1]
      const nxt = this._f[l]
      const w = W[l]
      const bb = b[l]
      for (let o = 0; o < nout; o++) {
        let s = bb[o]
        const off = o * nin
        for (let i = 0; i < nin; i++) s += w[off + i] * cur[i]
        if (l === L - 1) nxt[o] = 1 / (1 + Math.exp(-s))
        else nxt[o] = act === 'tanh' ? Math.tanh(s) : s > 0 ? s : 0
      }
      cur = nxt
    }
    return cur[0]
  }

  // one full-batch Adam step. X is n*2 coordinates, Y is n labels (0 or 1). Returns the loss.
  step(X, Y, n) {
    if (n === 0) return 0
    this._ensure(n)
    const { sizes, W, b, L, act, A, _dz, gW, gb } = this
    A[0] = X

    // ---- forward ----
    for (let l = 0; l < L; l++) {
      const nin = sizes[l]
      const nout = sizes[l + 1]
      const a = A[l]
      const out = A[l + 1]
      const w = W[l]
      const bb = b[l]
      const last = l === L - 1
      for (let s = 0; s < n; s++) {
        const so = s * nin
        for (let o = 0; o < nout; o++) {
          let z = bb[o]
          const wo = o * nin
          for (let i = 0; i < nin; i++) z += w[wo + i] * a[so + i]
          out[s * nout + o] = last ? 1 / (1 + Math.exp(-z)) : act === 'tanh' ? Math.tanh(z) : z > 0 ? z : 0
        }
      }
    }

    // ---- loss (binary cross-entropy) ----
    const p = A[L]
    let loss = 0
    const dzLast = _dz[L - 1]
    for (let s = 0; s < n; s++) {
      const pc = Math.min(1 - 1e-7, Math.max(1e-7, p[s]))
      loss -= Y[s] * Math.log(pc) + (1 - Y[s]) * Math.log(1 - pc)
      dzLast[s] = (p[s] - Y[s]) / n // gradient of the mean loss w.r.t. the output logit
    }
    loss /= n

    // ---- backward ----
    for (let l = L - 1; l >= 0; l--) {
      const nin = sizes[l]
      const nout = sizes[l + 1]
      const a = A[l]
      const dz = _dz[l]
      const gw = gW[l]
      const gbl = gb[l]
      gw.fill(0)
      gbl.fill(0)

      for (let s = 0; s < n; s++) {
        const so = s * nin
        for (let o = 0; o < nout; o++) {
          const d = dz[s * nout + o]
          gbl[o] += d
          const wo = o * nin
          for (let i = 0; i < nin; i++) gw[wo + i] += d * a[so + i]
        }
      }

      if (l > 0) {
        const w = W[l]
        const dprev = _dz[l - 1]
        for (let s = 0; s < n; s++) {
          const so = s * nin
          for (let i = 0; i < nin; i++) {
            let sum = 0
            for (let o = 0; o < nout; o++) sum += dz[s * nout + o] * w[o * nin + i]
            const av = a[so + i]
            dprev[so + i] = sum * (act === 'tanh' ? 1 - av * av : av > 0 ? 1 : 0)
          }
        }
      }
    }

    // ---- Adam update ----
    this.t += 1
    const b1 = 0.9
    const b2 = 0.999
    const c1 = 1 - Math.pow(b1, this.t)
    const c2 = 1 - Math.pow(b2, this.t)
    const lr = this.lr
    for (let l = 0; l < L; l++) {
      const w = W[l]
      const g = gW[l]
      const m = this.mW[l]
      const v = this.vW[l]
      for (let i = 0; i < w.length; i++) {
        m[i] = b1 * m[i] + (1 - b1) * g[i]
        v[i] = b2 * v[i] + (1 - b2) * g[i] * g[i]
        w[i] -= (lr * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + 1e-8)
      }
      const bl = b[l]
      const gbl = gb[l]
      const mb = this.mb[l]
      const vb = this.vb[l]
      for (let i = 0; i < bl.length; i++) {
        mb[i] = b1 * mb[i] + (1 - b1) * gbl[i]
        vb[i] = b2 * vb[i] + (1 - b2) * gbl[i] * gbl[i]
        bl[i] -= (lr * (mb[i] / c1)) / (Math.sqrt(vb[i] / c2) + 1e-8)
      }
    }

    return loss
  }

  // accuracy and per-point correctness on the given data
  evaluate(X, Y, n, wrong) {
    let ok = 0
    for (let s = 0; s < n; s++) {
      const p = this.forwardOne(X[s * 2], X[s * 2 + 1])
      const right = (p > 0.5 ? 1 : 0) === Y[s]
      if (right) ok += 1
      if (wrong) wrong[s] = right ? 0 : 1
    }
    return n ? ok / n : 0
  }
}
