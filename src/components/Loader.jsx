import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

const MIN_MS = 1400 // never flash: the loader stays at least this long
const SLOW_MS = 15000 // after this, suggest a reload

function stageFor(p) {
  if (p < 30) return 'Loading assets'
  if (p < 70) return 'Building the scene'
  if (p < 98) return 'Warming up'
  return 'Ready'
}

export default function Loader({ ready }) {
  const { progress } = useProgress() // real progress of files loaded through three.js
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const [slow, setSlow] = useState(false)

  const bar = useRef(null)
  const pct = useRef(null)
  const label = useRef(null)
  const live = useRef({ ready, real: 0 })
  live.current.ready = ready
  live.current.real = progress

  // smooth progress, written straight to the DOM so React never re-renders at 60fps
  useEffect(() => {
    let raf
    const t0 = performance.now()
    let last = t0
    let shown = 0

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const { ready: isReady, real } = live.current
      const creep = Math.min(90, ((now - t0) / 1000) * 22)
      const target = isReady ? 100 : Math.min(92, Math.max(creep, real * 0.9))
      shown += (target - shown) * (1 - Math.exp(-dt * 5))

      if (bar.current) bar.current.style.transform = `scaleX(${shown / 100})`
      if (pct.current) pct.current.textContent = `${Math.round(shown)}%`
      if (label.current) label.current.textContent = stageFor(shown)

      if (isReady && shown > 99.4 && now - t0 >= MIN_MS) {
        setLeaving(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const id = setTimeout(() => setGone(true), 900) // matches the CSS fade
    return () => clearTimeout(id)
  }, [leaving])

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(id)
  }, [])

  if (gone) return null

  return (
    <div className={`loader ${leaving ? 'out' : ''}`} role="status" aria-live="polite" aria-label="Loading portfolio">
      <div className="loader-inner">
        <div className="loader-logo">
          RP<span>.</span>
        </div>
        <div className="loader-under">
          <div className="loader-bar">
            <i ref={bar} />
          </div>
          <div className="loader-meta">
            <span ref={label}>Loading assets</span>
            <span ref={pct}>0%</span>
          </div>
          {slow && !leaving && (
            <p className="loader-slow">Taking longer than usual. If nothing happens, try reloading the page.</p>
          )}
        </div>
      </div>
    </div>
  )
}