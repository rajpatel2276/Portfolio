import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { scrollState, setActive, STATIONS } from '../scroll'
import { AboutRoom, ProjectsRoom, SkillsRoom, ContactRoom } from './Rooms'
import { THEME } from '../theme'

const ROOM_Z = [-34, -64, -94, -124]
const CAM_DIST = 14 // how far the camera rests in front of each room

const CAM_POINTS = [
  new THREE.Vector3(0, 0, 13),
  ...ROOM_Z.map((z) => new THREE.Vector3(0, 0, z + CAM_DIST)),
]
const LOOK_POINTS = [new THREE.Vector3(0, 0, 0), ...ROOM_Z.map((z) => new THREE.Vector3(0, 0, z))]

// camera rests near each station (t < A or t > B), travels in between
const A = 0.22
const B = 0.78
function plateau(t) {
  const x = THREE.MathUtils.clamp((t - A) / (B - A), 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

function CameraRig({ bg }) {
  const camCurve = useMemo(() => new THREE.CatmullRomCurve3(CAM_POINTS, false, 'catmullrom', 0.5), [])
  const lookCurve = useMemo(() => new THREE.CatmullRomCurve3(LOOK_POINTS, false, 'catmullrom', 0.5), [])
  const camPos = useMemo(() => new THREE.Vector3(), [])
  const lookPos = useMemo(() => new THREE.Vector3(), [])
  const rig = useRef({ p: 0, px: 0, py: 0 })

  useFrame((state, delta) => {
    const cam = state.camera
    const r = rig.current

    r.p = THREE.MathUtils.damp(r.p, scrollState.progress, 5, delta)
    r.px = THREE.MathUtils.damp(r.px, state.pointer.x, 3, delta)
    r.py = THREE.MathUtils.damp(r.py, state.pointer.y, 3, delta)

    const f = THREE.MathUtils.clamp(r.p, 0, 1) * (STATIONS - 1)
    const k = Math.min(Math.floor(f), STATIONS - 2)
    const t = f - k
    const te = plateau(t)
    const u = (k + te) / (STATIONS - 1)

    camCurve.getPoint(u, camPos)
    lookCurve.getPoint(u, lookPos)

    // sway is exactly zero at every station (u = k / 4)
    const swayX = Math.sin(u * Math.PI * 8)
    const swayY = Math.sin(u * Math.PI * 12)
    camPos.x += swayX * 0.7 + r.px * 0.35
    camPos.y += swayY * 0.4 + r.py * 0.2

    cam.position.copy(camPos)
    cam.lookAt(lookPos)
    cam.rotateZ(swayX * 0.04)

    // widen the field of view while travelling for a sense of speed
    const fov = 25 + 20 * Math.sin(te * Math.PI)
    if (Math.abs(cam.fov - fov) > 0.001) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }

    setActive(t < A ? k : t > B ? k + 1 : -1)

    // stars drift slower than the camera
    if (bg.current) bg.current.position.z = cam.position.z * 0.85
  })

  return null
}

const RINGS = 44

function Tunnel() {
  const rings = useRef()

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    for (let i = 0; i < RINGS; i++) {
      m.makeTranslation(0, 0, -6 - i * 3)
      rings.current.setMatrixAt(i, m)
    }
    rings.current.instanceMatrix.needsUpdate = true
  }, [])

  const lines = useMemo(() => {
    const pts = []
    const L = 132
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const x = Math.cos(a) * 10
      const y = Math.sin(a) * 10
      pts.push(new THREE.Vector3(x, y, -6), new THREE.Vector3(x, y, -6 - L))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  const dust = useMemo(() => {
    const n = 1000
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const rad = Math.sqrt(Math.random()) * 9
      arr[i * 3] = Math.cos(a) * rad
      arr[i * 3 + 1] = Math.sin(a) * rad
      arr[i * 3 + 2] = -8 - Math.random() * 128
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])

  return (
    <>
      <instancedMesh ref={rings} args={[null, null, RINGS]} frustumCulled={false}>
        <torusGeometry args={[10, 0.03, 8, 96]} />
        <meshBasicMaterial color={THEME.primary} transparent opacity={0.5} />
      </instancedMesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={THEME.accent} transparent opacity={0.2} />
      </lineSegments>
      <points geometry={dust}>
        <pointsMaterial color={THEME.primarySoft} size={0.07} sizeAttenuation transparent opacity={0.8} />
      </points>
    </>
  )
}

export default function Journey() {
  const bg = useRef()
  const { width, height } = useThree((s) => s.size)
  const wide = width / height > 1.1
  const ox = wide ? 3.4 : 0 // rooms sit on the right, text on the left
  const oy = wide ? 0 : 1.4 // on phones: rooms up top, text below
  const sc = wide ? 1 : 0.62

  return (
    <>
      <CameraRig bg={bg} />

      <group ref={bg}>
        <Stars radius={100} depth={60} count={4000} factor={4} fade speed={1} />
      </group>

      <Tunnel />

      <group position={[ox, oy, ROOM_Z[0]]} scale={sc}>
        <AboutRoom />
      </group>
      <group position={[ox, oy, ROOM_Z[1]]} scale={sc}>
        <ProjectsRoom />
      </group>
      <group position={[ox, oy, ROOM_Z[2]]} scale={sc}>
        <SkillsRoom />
      </group>
      <group position={[ox, oy, ROOM_Z[3]]} scale={sc}>
        <ContactRoom />
      </group>
    </>
  )
}