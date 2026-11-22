import { useEffect, useRef } from 'react'
import { useQuality } from '../quality'

const ON = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

export default function DebugBadge() {
  const q = useQuality()
  const fpsEl = useRef(null)

  useEffect(() => {
    if (!ON) return
    let raf
    let frames = 0
    let last = performance.now()
    const tick = (now) => {
      frames += 1
      if (now - last >= 500) {
        if (fpsEl.current) fpsEl.current.textContent = Math.round((frames * 1000) / (now - last))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!ON) return null
  return (
    <div className="debug-badge">
      {q.tier} · dpr ≤ {q.dprMax.toFixed(2)} · <span ref={fpsEl}>--</span> fps
    </div>
  )
}