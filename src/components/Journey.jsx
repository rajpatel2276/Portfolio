import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { scrollState, setActive, STATIONS, STATION_INFO, ST } from '../scroll'
import { atmo, updateAtmosphere, WORLD_THEME } from '../atmosphere'
import { AboutRoom, ProjectsRoom, SkillsRoom, ContactRoom } from './Rooms'
import { WORLD_COMPONENTS, Gate } from './Worlds'
import { THEME } from '../theme'

const CAM_DIST = 14 // how far the camera rests in front of each room
const SPACING = 30
const roomZ = (i) => -34 - (i - 1) * SPACING // station i >= 1
const TUNNEL_LEN = -roomZ(STATIONS - 1) + 16

const CAM_POINTS = [
  new THREE.Vector3(0, 0, 13),
  ...Array.from({ length: STATIONS - 1 }, (_, j) => new THREE.Vector3(0, 0, roomZ(j + 1) + CAM_DIST)),
]
const LOOK_POINTS = [
  new THREE.Vector3(0, 0, 0),
  ...Array.from({ length: STATIONS - 1 }, (_, j) => new THREE.Vector3(0, 0, roomZ(j + 1))),
]

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
  const rig = useRef({ p: 0, px: 0, py: 0, rev: 0 })

  useFrame((state, delta) => {
    const cam = state.camera
    const r = rig.current

    r.p = THREE.MathUtils.damp(r.p, scrollState.progress, 5, delta)
    r.px = THREE.MathUtils.damp(r.px, state.pointer.x, 3, delta)
    r.py = THREE.MathUtils.damp(r.py, state.pointer.y, 3, delta)
    r.rev = THREE.MathUtils.damp(r.rev, scrollState.revealed ? 1 : 0, 2.5, delta)

    const f = THREE.MathUtils.clamp(r.p, 0, 1) * (STATIONS - 1)
    const k = Math.min(Math.floor(f), STATIONS - 2)
    const t = f - k
    const te = plateau(t)
    const u = (k + te) / (STATIONS - 1)

    // single source of truth for everything that follows the journey
    scrollState.pos = k + te
    updateAtmosphere(scrollState.pos)
    if (state.scene.background && state.scene.background.isColor) state.scene.background.copy(atmo.bg)
    if (state.scene.fog) state.scene.fog.color.copy(atmo.bg)

    camCurve.getPoint(u, camPos)
    lookCurve.getPoint(u, lookPos)

    // sway is exactly zero at every station (u = k / (STATIONS - 1))
    const swayX = Math.sin(u * Math.PI * 8)
    const swayY = Math.sin(u * Math.PI * 12)
    camPos.x += swayX * 0.7 + r.px * 0.35
    camPos.y += swayY * 0.4 + r.py * 0.2

    // widen the field of view while travelling for a sense of speed
    const fov = 25 + 20 * Math.sin(te * Math.PI)

    // portrait screens: slide the whole scene up so it sits above the text
    const aspect = state.size.width / state.size.height
    if (aspect < 1.1) {
      const dist = camPos.distanceTo(lookPos)
      const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(fov / 2))
      const frac = THREE.MathUtils.lerp(0.2, 0.22, THREE.MathUtils.clamp(u * 4, 0, 1))
      const shift = viewH * frac * r.rev
      camPos.y -= shift
      lookPos.y -= shift
    }

    cam.position.copy(camPos)
    cam.lookAt(lookPos)
    cam.rotateZ(swayX * 0.04)

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

const RINGS = Math.ceil(TUNNEL_LEN / 3)

function Tunnel() {
  const rings = useRef()
  const ringMat = useRef()
  const lineMat = useRef()
  const dustMat = useRef()

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
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const x = Math.cos(a) * 10
      const y = Math.sin(a) * 10
      pts.push(new THREE.Vector3(x, y, -6), new THREE.Vector3(x, y, -6 - TUNNEL_LEN))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  const dust = useMemo(() => {
    const n = 1600
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const rad = Math.sqrt(Math.random()) * 9
      arr[i * 3] = Math.cos(a) * rad
      arr[i * 3 + 1] = Math.sin(a) * rad
      arr[i * 3 + 2] = -8 - Math.random() * (TUNNEL_LEN - 4)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])

  // the tunnel takes on the colours of whichever world you are heading into
  useFrame(() => {
    ringMat.current.color.copy(atmo.ring)
    lineMat.current.color.copy(atmo.line)
    dustMat.current.color.copy(atmo.dust)
  })

  return (
    <>
      <instancedMesh ref={rings} args={[null, null, RINGS]} frustumCulled={false}>
        <torusGeometry args={[10, 0.03, 8, 96]} />
        <meshBasicMaterial ref={ringMat} color={THEME.primary} transparent opacity={0.5} />
      </instancedMesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial ref={lineMat} color={THEME.accent} transparent opacity={0.2} />
      </lineSegments>
      <points geometry={dust}>
        <pointsMaterial ref={dustMat} color={THEME.primarySoft} size={0.07} sizeAttenuation transparent opacity={0.8} />
      </points>
    </>
  )
}

export default function Journey() {
  const bg = useRef()
  const { width, height } = useThree((s) => s.size)
  const aspect = width / height
  const stacked = aspect < 1.1
  const viewH = 2 * CAM_DIST * Math.tan(THREE.MathUtils.degToRad(25 / 2)) // visible height at a room
  const viewW = viewH * aspect
  const ox = stacked ? 0 : 3.4 // wide: rooms on the right, text on the left
  const oy = 0 // on portrait screens the camera does the lifting
  const sc = stacked ? Math.min(0.62, (viewW * 0.94) / 4.6, (viewH * 0.4) / 5.2) : 1

  return (
    <>
      <CameraRig bg={bg} />

      <group ref={bg}>
        <Stars radius={100} depth={60} count={4000} factor={4} fade speed={1} />
      </group>

      <Tunnel />

      {STATION_INFO.map((info, i) => {
        if (i === 0) return null
        let Room = null
        if (i === ST.ABOUT) Room = AboutRoom
        else if (i === ST.PROJECTS) Room = ProjectsRoom
        else if (info.world) Room = WORLD_COMPONENTS[info.world]
        else if (i === ST.SKILLS) Room = SkillsRoom
        else if (i === ST.CONTACT) Room = ContactRoom
        if (!Room) return null
        return (
          <group key={i} position={[ox, oy, roomZ(i)]} scale={sc}>
            <Room />
          </group>
        )
      })}

      {STATION_INFO.map((info, i) =>
        info.world && WORLD_COMPONENTS[info.world] ? (
          <Gate
            key={`gate${i}`}
            z={roomZ(i) + 22}
            index={i}
            color={(WORLD_THEME[info.world] || {}).ring || THEME.primary}
          />
        ) : null
      )}
    </>
  )
}