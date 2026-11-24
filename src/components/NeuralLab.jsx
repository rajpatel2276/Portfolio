import { useEffect, useRef, useState } from 'react'
import { MLP } from '../lab/mlp'
import { DATASETS } from '../lab/datasets'
import { labBus } from '../lab/bus'
import { lenisRef, scrollState } from '../scroll'
import { THEME } from '../theme'

const MAX_POINTS = 300
// the decision boundary is computed on a grid and smoothed up: finer on desktop, lighter on touch devices
const GRID =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    ? 48
    : 64
const SPEEDS = { slow: 1, normal: 3, fast: 8 } // training steps per frame
const HIDDEN = [4, 8, 16]

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const EMBER = hex(THEME.primary) // class 0
const TEAL = hex(THEME.accent) // class 1
const CLASS_RGB = [EMBER, TEAL]
const css = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))

function calcSize() {
  const w = window.innerWidth
  const h = window.innerHeight
  if (w <= 860) return Math.floor(Math.max(240, Math.min(w - 32, h * 0.5, 520)))
  return Math.floor(Math.max(300, Math.min(h * 0.78, 560, w - 470)))
}

function makeSim() {
  return {
    pts: [],
    X: new Float64Array(MAX_POINTS * 2),
    Y: new Float64Array(MAX_POINTS),
    wrong: new Uint8Array(MAX_POINTS),
    n: 0,
    model: null,
    seed: 7,
    steps: 0,
    loss: NaN,
    acc: 0,
    hist: [],
    dirty: true,
    settled: false,
    training: true,
    speed: SPEEDS.normal,
    size: 400,
    dpr: 1,
    drag: null,
    heat: null,
    heatCtx: null,
    img: null,
  }
}

function Lab({ onClose }) {
  const sim = useRef(null)
  if (!sim.current) sim.current = makeSim()

  const boardRef = useRef(null)
  const canvasRef = useRef(null)
  const sparkRef = useRef(null)
  const stepRef = useRef(null)
  const lossRef = useRef(null)
  const accRef = useRef(null)
  const statusRef = useRef(null)
  const closeRef = useRef(null)

  const [dataset, setDataset] = useState('circle')
  const [reload, setReload] = useState(0)
  const [hidden, setHidden] = useState(16)
  const [act, setAct] = useState('tanh')
  const [speed, setSpeed] = useState('normal')
  const [training, setTraining] = useState(true)
  const [brush, setBrush] = useState(0)
  const [size, setSize] = useState(calcSize)
  const [count, setCount] = useState(0)

  // copy the points into the typed arrays the network trains on
  const syncData = () => {
    const s = sim.current
    const n = Math.min(s.pts.length, MAX_POINTS)
    for (let i = 0; i < n; i++) {
      s.X[i * 2] = s.pts[i].u
      s.X[i * 2 + 1] = s.pts[i].v
      s.Y[i] = s.pts[i].c
    }
    s.n = n
    s.dirty = true
    s.settled = false
    setCount(n)
  }

  const resetModel = () => {
    const s = sim.current
    s.seed += 13
    s.model = new MLP([2, hidden, hidden, 1], act, s.seed, 0.03)
    s.steps = 0
    s.loss = NaN
    s.hist = []
    s.settled = false
    s.dirty = true
  }

  // ---- page behaviour: freeze scrolling, focus the close button, follow window size ----
  useEffect(() => {
    const l = lenisRef.current
    if (l) l.stop()
    if (closeRef.current) closeRef.current.focus()
    const onResize = () => setSize(calcSize())
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      const l2 = lenisRef.current
      if (l2 && scrollState.revealed) l2.start()
    }
  }, [])

  // ---- canvas sizing ----
  useEffect(() => {
    const s = sim.current
    const cv = canvasRef.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(size * dpr)
    cv.height = Math.round(size * dpr)
    cv.style.width = size + 'px'
    cv.style.height = size + 'px'
    s.size = size
    s.dpr = dpr
    s.dirty = true
  }, [size])

  // ---- offscreen heatmap + sparkline canvas ----
  useEffect(() => {
    const s = sim.current
    s.heat = document.createElement('canvas')
    s.heat.width = GRID
    s.heat.height = GRID
    s.heatCtx = s.heat.getContext('2d')
    s.img = s.heatCtx.createImageData(GRID, GRID)
    const sp = sparkRef.current
    sp.width = 640
    sp.height = 88
  }, [])

  // ---- data + model ----
  useEffect(() => {
    sim.current.pts = DATASETS[dataset].make().slice(0, MAX_POINTS)
    syncData()
    resetModel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, reload])

  useEffect(() => {
    resetModel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, act])

  useEffect(() => {
    const s = sim.current
    s.training = training
    if (training) s.settled = false
  }, [training])

  useEffect(() => {
    sim.current.speed = SPEEDS[speed]
  }, [speed])

  // ---- the live loop: train a few steps, then draw ----
  useEffect(() => {
    let raf
    let frame = 0

    const draw = () => {
      const s = sim.current
      const cv = canvasRef.current
      if (!cv || !s.model || !s.img) return
      const S = s.size
      const ctx = cv.getContext('2d')
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
      ctx.fillStyle = '#0a0708'
      ctx.fillRect(0, 0, S, S)

      // decision boundary: the network's belief at every cell
      const d = s.img.data
      let k = 0
      for (let gy = 0; gy < GRID; gy++) {
        const v = ((gy + 0.5) / GRID) * 2 - 1
        for (let gx = 0; gx < GRID; gx++) {
          const u = ((gx + 0.5) / GRID) * 2 - 1
          const p = s.model.forwardOne(u, v)
          const conf = Math.abs(p - 0.5) * 2 // 0 right on the boundary, 1 certain
          const c = p > 0.5 ? TEAL : EMBER
          d[k++] = c[0]
          d[k++] = c[1]
          d[k++] = c[2]
          d[k++] = Math.round(255 * (0.05 + 0.6 * conf))
        }
      }
      s.heatCtx.putImageData(s.img, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(s.heat, 0, 0, S, S)

      // faint grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 1; i < 8; i++) {
        const p = (S / 8) * i
        ctx.moveTo(p, 0)
        ctx.lineTo(p, S)
        ctx.moveTo(0, p)
        ctx.lineTo(S, p)
      }
      ctx.stroke()

      // points; a white ring marks the ones the network still gets wrong
      for (let i = 0; i < s.n; i++) {
        const px = ((s.X[i * 2] + 1) / 2) * S
        const py = ((s.X[i * 2 + 1] + 1) / 2) * S
        if (s.wrong[i]) {
          ctx.beginPath()
          ctx.arc(px, py, 9.5, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255, 241, 228, 0.9)'
          ctx.lineWidth = 1.6
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(px, py, 5.5, 0, Math.PI * 2)
        ctx.fillStyle = css(CLASS_RGB[s.Y[i] ? 1 : 0])
        ctx.fill()
        ctx.strokeStyle = 'rgba(5, 6, 10, 0.85)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }

    const updateStats = () => {
      const s = sim.current
      const fmt = (x) => (x < 0.001 ? x.toExponential(1) : x.toFixed(3))
      if (stepRef.current) stepRef.current.textContent = String(s.steps)
      if (lossRef.current) lossRef.current.textContent = s.n && Number.isFinite(s.loss) ? fmt(s.loss) : '–'
      if (accRef.current) accRef.current.textContent = s.n ? Math.round(s.acc * 100) + '%' : '–'
      if (statusRef.current) {
        const st = !s.n ? 'add points' : !s.training ? 'paused' : s.settled ? 'converged' : 'training'
        statusRef.current.textContent = st
        statusRef.current.dataset.state = st
      }
      const sp = sparkRef.current
      if (sp) {
        const c = sp.getContext('2d')
        const W = sp.width
        const H = sp.height
        c.clearRect(0, 0, W, H)
        const h = s.hist
        if (h.length > 1) {
          c.beginPath()
          h.forEach((l, i) => {
            const x = (i / (h.length - 1)) * W
            const t = clamp((Math.log10(Math.max(l, 1e-3)) + 3) / 3, 0, 1) // log scale, 1e-3 to 1
            const y = H - 8 - t * (H - 16)
            if (i === 0) c.moveTo(x, y)
            else c.lineTo(x, y)
          })
          c.strokeStyle = css(TEAL)
          c.lineWidth = 3
          c.lineJoin = 'round'
          c.stroke()
        }
      }
    }

    const tick = () => {
      const s = sim.current
      if (s.model) {
        let changed = s.dirty
        if (s.training && s.n > 0 && !s.settled) {
          for (let i = 0; i < s.speed; i++) {
            s.loss = s.model.step(s.X, s.Y, s.n)
            s.steps += 1
            if (s.steps % 10 === 0) {
              s.hist.push(s.loss)
              if (s.hist.length > 200) s.hist.shift()
            }
          }
          if (s.loss < 0.0015 && s.steps > 100) s.settled = true // nothing left to learn: stop burning CPU
          changed = true
        }
        if (changed) {
          s.acc = s.model.evaluate(s.X, s.Y, s.n, s.wrong)
          draw()
          s.dirty = false
        }
        if (frame % 6 === 0) updateStats()
      }
      frame += 1
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- adding points ----
  const addPoint = (e, c) => {
    const s = sim.current
    if (s.pts.length >= MAX_POINTS) return
    const r = boardRef.current.getBoundingClientRect()
    const u = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
    const v = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
    s.pts.push({ u, v, c })
    syncData()
  }

  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const c = e.button === 2 || e.shiftKey ? 1 - brush : brush
    sim.current.drag = { x: e.clientX, y: e.clientY, c }
    addPoint(e, c)
  }

  const onMove = (e) => {
    const d = sim.current.drag
    if (!d) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 16) {
      d.x = e.clientX
      d.y = e.clientY
      addPoint(e, d.c)
    }
  }

  const onUp = () => {
    sim.current.drag = null
  }

  const clear = () => {
    sim.current.pts = []
    syncData()
  }

  const actLabel = act === 'tanh' ? 'tanh' : 'ReLU'

  return (
    <div
      className="lab"
      role="dialog"
      aria-modal="true"
      aria-label="Neural Lab"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button className="lab-close" ref={closeRef} onClick={onClose} aria-label="Close the lab">
        ✕
      </button>

      <div className="lab-shell">
        <div
          className="lab-board"
          ref={boardRef}
          style={{ width: size, height: size }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <canvas ref={canvasRef} />
        </div>

        <aside className="lab-side">
          <div>
            <p className="eyebrow">Neural Lab</p>
            <h3 className="lab-title">
              Train a network <span>live</span>
            </h3>
            <p className="lab-sub">
              A small neural network learning in your browser, live. Plain JavaScript, built from scratch: forward
              pass, backpropagation and Adam, with no ML libraries.
            </p>
          </div>

          <div className="lab-group">
            <label>Dataset</label>
            <div className="seg">
              {Object.entries(DATASETS).map(([k, d]) => (
                <button
                  key={k}
                  className={dataset === k ? 'on' : ''}
                  aria-pressed={dataset === k}
                  onClick={() => {
                    setDataset(k)
                    setReload((r) => r + 1)
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lab-group">
            <label>Add points</label>
            <div className="seg">
              {[0, 1].map((c) => (
                <button key={c} className={brush === c ? 'on' : ''} aria-pressed={brush === c} onClick={() => setBrush(c)}>
                  <i className="dot" style={{ background: css(CLASS_RGB[c]) }} />
                  {c === 0 ? 'Orange' : 'Teal'}
                </button>
              ))}
            </div>
            <p className="lab-hint">Click or drag to add points. Shift-click adds the other colour.</p>
          </div>

          <div className="lab-group">
            <label>Hidden units per layer</label>
            <div className="seg">
              {HIDDEN.map((h) => (
                <button key={h} className={hidden === h ? 'on' : ''} aria-pressed={hidden === h} onClick={() => setHidden(h)}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="lab-group">
            <label>Activation · Speed</label>
            <div className="seg">
              {['tanh', 'relu'].map((a) => (
                <button key={a} className={act === a ? 'on' : ''} aria-pressed={act === a} onClick={() => setAct(a)}>
                  {a === 'tanh' ? 'tanh' : 'ReLU'}
                </button>
              ))}
              <span className="seg-gap" />
              {Object.keys(SPEEDS).map((k) => (
                <button key={k} className={speed === k ? 'on' : ''} aria-pressed={speed === k} onClick={() => setSpeed(k)}>
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="lab-stats">
            <div className="lab-stat">
              <b>Step</b>
              <span ref={stepRef}>0</span>
            </div>
            <div className="lab-stat">
              <b>Loss</b>
              <span ref={lossRef}>–</span>
            </div>
            <div className="lab-stat">
              <b>Accuracy</b>
              <span ref={accRef}>–</span>
            </div>
          </div>

          <div>
            <canvas className="lab-spark" ref={sparkRef} aria-label="Training loss over time, log scale" />
            <div className="lab-sparkrow">
              <span>loss, log scale</span>
              <span className="lab-status" ref={statusRef} data-state="training">
                training
              </span>
            </div>
          </div>

          <div className="lab-actions">
            <button className="btn primary" onClick={() => setTraining((t) => !t)}>
              {training ? 'Pause' : 'Train'}
            </button>
            <button className="btn" onClick={resetModel}>
              Reset weights
            </button>
            <button className="btn" onClick={clear}>
              Clear points
            </button>
          </div>

          <p className="lab-foot">
            2 → {hidden} → {hidden} → 1 · {actLabel} · Adam · cross-entropy · {count}/{MAX_POINTS} points
          </p>
        </aside>
      </div>
    </div>
  )
}

export default function NeuralLab() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    labBus.open = () => {
      if (scrollState.revealed) setOpen(true)
    }
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'Escape') setOpen(false)
      else if ((e.key === 'l' || e.key === 'L') && scrollState.revealed) setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      labBus.open = null
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return open ? <Lab onClose={() => setOpen(false)} /> : null
}
