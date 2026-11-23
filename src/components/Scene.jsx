import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Lanyard from './Lanyard'
import NeuralField from './NeuralField'
import Journey from './Journey'
import { THEME } from '../theme'
import { getQuality, setTier, TIER_ORDER, useQuality, warm } from '../quality'

// mounts only after everything above it has finished loading, then waits a few
// rendered frames so first-frame shader compilation happens behind the loader
function ReadySignal({ onReady }) {
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current >= 8) {
      done.current = true
      onReady?.()
    }
  })
  return null
}

// steps the quality tier down when the frame rate drops, and back up when it recovers,
// but never above the tier that was detected on load
function Adaptive() {
  const s = useRef({
    ceiling: getQuality().tier,
    lastChange: performance.now(),
    upUsed: false,
    locked: false,
  })

  const move = (dir) => {
    const st = s.current
    const now = performance.now()
    if (now - st.lastChange < 4000) return // let each change settle first
    const cur = TIER_ORDER.indexOf(getQuality().tier)
    const next = cur + dir
    if (next < 0 || next >= TIER_ORDER.length) return
    if (dir > 0) {
      if (st.locked || next > TIER_ORDER.indexOf(st.ceiling)) return
      st.upUsed = true
    } else if (st.upUsed) {
      st.locked = true // we went up and it did not hold: stop trying
    }
    st.lastChange = now
    setTier(TIER_ORDER[next])
  }

  return <PerformanceMonitor onDecline={() => move(-1)} onIncline={() => move(1)} />
}

export default function Scene({ anchorX, onReveal, onReady, onDrop }) {
  const q = useQuality()
  const [envRes] = useState(() => getQuality().envRes) // fixed at load, no rebuild on tier change

  // let the first heavy frames (texture upload, shader compile) pass before physics starts
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [])

  // start watching the frame rate only after the loader is gone and things have settled
  const [watch, setWatch] = useState(false)
  const handleReady = useCallback(() => {
    warm.on = false
    onReady?.()
    setTimeout(() => setWatch(true), 2500)
  }, [onReady])

  return (
    <>
      <fog attach="fog" args={['#05060a', q.fog[0], q.fog[1]]} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 8]} intensity={1.6} />

      <Environment resolution={envRes} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 3, 5]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2} color={THEME.primary} position={[-5, 0, 3]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={2} color={THEME.accent} position={[5, -1, 2]} scale={[3, 6, 1]} />
      </Environment>

      <Journey />
      <NeuralField count={q.nodes} reach={q.nodeReach} />

      <Physics gravity={[0, -40, 0]} timeStep={1 / 60} interpolate={false} paused={!ready}>
        <Lanyard anchorX={anchorX} onReveal={onReveal} onDrop={onDrop} />
        <ReadySignal onReady={handleReady} />
      </Physics>

      {watch && <Adaptive />}
    </>
  )
}