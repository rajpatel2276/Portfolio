import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { THEME } from '../theme'

function rng(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export default function NeuralField({ count = 110, reach = 3.4 }) {
  const group = useRef()

  const { pointsGeo, linesGeo } = useMemo(() => {
    const rand = rng(1337)
    const pts = []
    for (let i = 0; i < count; i++) {
      pts.push(
        new THREE.Vector3((rand() - 0.5) * 20, (rand() - 0.5) * 11, -3 - rand() * 9)
      )
    }
    const seg = []
    const links = new Array(count).fill(0)
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (pts[i].distanceTo(pts[j]) < reach && links[i] < 3 && links[j] < 3) {
          seg.push(pts[i], pts[j])
          links[i]++
          links[j]++
        }
      }
    }
    return {
      pointsGeo: new THREE.BufferGeometry().setFromPoints(pts),
      linesGeo: new THREE.BufferGeometry().setFromPoints(seg),
    }
  }, [count, reach])

  useFrame((state) => {
    const g = group.current
    const t = state.clock.elapsedTime
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, state.pointer.x * 0.15, 0.03)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -state.pointer.y * 0.08, 0.03)
    g.position.y = Math.sin(t * 0.25) * 0.15
  })

  return (
    <group ref={group}>
      <lineSegments geometry={linesGeo}>
        <lineBasicMaterial color={THEME.primary} transparent opacity={0.2} />
      </lineSegments>
      <points geometry={pointsGeo}>
        <pointsMaterial color={THEME.primarySoft} size={0.09} sizeAttenuation transparent opacity={0.9} />
      </points>
    </group>
  )
}