import { useEffect, useState } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Lanyard from './Lanyard'
import NeuralField from './NeuralField'
import Journey from './Journey'
import { THEME } from '../theme'

export default function Scene({ anchorX, onReveal }) {
  // let the first heavy frames (texture upload, shader compile) pass before physics starts
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <fog attach="fog" args={['#05060a', 22, 80]} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 8]} intensity={1.6} />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 3, 5]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2} color={THEME.primary} position={[-5, 0, 3]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={2} color={THEME.accent} position={[5, -1, 2]} scale={[3, 6, 1]} />
      </Environment>

      <Journey />
      <NeuralField />

      <Physics gravity={[0, -40, 0]} timeStep={1 / 60} interpolate={false} paused={!ready}>
        <Lanyard anchorX={anchorX} onReveal={onReveal} />
      </Physics>
    </>
  )
}