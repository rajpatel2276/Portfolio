import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Lenis from 'lenis'
import Scene from './components/Scene'
import Hero from './components/Hero'
import Sections from './components/Sections'
import Hud from './components/Hud'
import { lenisRef, scrollState, subscribeActive, STATIONS } from './scroll'

export default function App() {
  const [revealed, setRevealed] = useState(false)
  const [active, setActiveIdx] = useState(0)
  // card hangs on the right on wide screens, centred on small ones
    const [anchorX] = useState(() => (window.innerWidth / window.innerHeight >= 1.1 ? 2.6 : 0))

  // smooth scrolling: locked until the card has been pulled down
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    const lenis = new Lenis({ lerp: 0.085 })
    lenis.stop()
    lenisRef.current = lenis

    lenis.on('scroll', (l) => {
      const limit = l.limit || 1
      scrollState.progress = Math.min(1, Math.max(0, l.scroll / limit))
      scrollState.velocity = l.velocity
      document.documentElement.style.setProperty('--p', scrollState.progress.toFixed(4))
    })

    let id
    const raf = (t) => {
      lenis.raf(t)
      id = requestAnimationFrame(raf)
    }
    id = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(id)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  useEffect(() => subscribeActive(setActiveIdx), [])

  const handleReveal = useCallback(() => {
    scrollState.revealed = true
    setRevealed(true)
    lenisRef.current?.start()
  }, [])

  const atHome = revealed && active === 0

  return (
    <>
      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [0, 0, 13], fov: 25 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#05060a']} />
          <Suspense fallback={null}>
            <Scene anchorX={anchorX} onReveal={handleReveal} />
          </Suspense>
        </Canvas>
      </div>

      <div className="vignette" />
      <div className={`glow ${atHome ? 'show' : ''}`} />

      <Hero show={atHome} />
      <Sections active={active} />
      <Hud revealed={revealed} active={active} />

            <div className="scroll-space" style={{ height: `${(STATIONS - 1) * 150 + 100}vh` }} />
    </>
  )
}