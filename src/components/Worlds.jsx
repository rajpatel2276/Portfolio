import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { PulseLines, Label, buildLines, makeGlowTexture, mulberry } from './fx'
import { rgba } from '../theme'
import { WORLD_THEME, stationOf, useRoomFrame } from '../atmosphere'

function additive(extra = {}) {
  return { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...extra }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function toTex(canvas) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

// gently floating wrapper
function Bob({ idx, base, phase = 0, amp = 0.05, rot = [0, 0, 0], children }) {
  const ref = useRef()
  useRoomFrame(idx, (s) => {
    ref.current.position.y = base[1] + Math.sin(s.clock.elapsedTime * 0.8 + phase) * amp
  })
  return (
    <group ref={ref} position={base} rotation={rot}>
      {children}
    </group>
  )
}

/* ======================================================================
   GATE: the glowing doorway you fly through on the way into a world
   ====================================================================== */
export function Gate({ z, index, color }) {
  const outer = useRef()
  const inner = useRef()
  const dots = useRef()
  const dot = useMemo(() => makeGlowTexture(), [])
  const dotGeo = useMemo(() => {
    const pts = []
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * 4.9, Math.sin(a) * 4.9, 0))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  useRoomFrame(index, (s) => {
    const t = s.clock.elapsedTime
    const k = Math.max(0, 1 - Math.abs(s.camera.position.z - z) / 16) // brighter as the camera nears
    outer.current.material.opacity = 0.2 + 0.8 * k
    inner.current.material.opacity = 0.1 + 0.5 * k
    dots.current.material.opacity = 0.2 + 0.8 * k
    dots.current.rotation.z = t * 0.15
    outer.current.scale.setScalar(1 + Math.sin(t * 2.2 + index) * 0.012)
  })

  return (
    <group position={[0, 0, z]}>
      <mesh ref={outer}>
        <torusGeometry args={[4.6, 0.05, 8, 160]} />
        <meshBasicMaterial color={color} toneMapped={false} {...additive()} />
      </mesh>
      <mesh ref={inner}>
        <torusGeometry args={[4.2, 0.02, 8, 160]} />
        <meshBasicMaterial color={color} toneMapped={false} {...additive()} />
      </mesh>
      <points ref={dots} geometry={dotGeo}>
        <pointsMaterial size={0.22} map={dot} color={color} {...additive()} />
      </points>
    </group>
  )
}

/* ======================================================================
   WORLD 1: ShastraSetu, a bridge between text and images (CLIP)
   ====================================================================== */
const TS = WORLD_THEME.shastra
const SH_YS = [1.5, 0.4, -0.7]

function textCardTexture(seed) {
  const rand = mulberry(seed)
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 320
  const ctx = c.getContext('2d')
  ctx.save()
  rr(ctx, 0, 0, 256, 320, 22)
  ctx.clip()
  const g = ctx.createLinearGradient(0, 0, 0, 320)
  g.addColorStop(0, '#0d3345')
  g.addColorStop(1, '#071a26')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 320)
  ctx.fillStyle = TS.warm
  rr(ctx, 24, 26, 64, 12, 6)
  ctx.fill()
  for (let i = 0; i < 8; i++) {
    const w = 90 + rand() * 118
    ctx.fillStyle = i === 3 ? TS.warm : rgba(TS.soft, 0.6)
    rr(ctx, 24, 62 + i * 28, w, 10, 5)
    ctx.fill()
  }
  ctx.restore()
  ctx.lineWidth = 4
  ctx.strokeStyle = rgba(TS.ring, 0.85)
  rr(ctx, 2, 2, 252, 316, 21)
  ctx.stroke()
  return toTex(c)
}

function imageTileTexture(seed) {
  const rand = mulberry(seed)
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.save()
  rr(ctx, 0, 0, 256, 256, 22)
  ctx.clip()
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#06202c')
  g.addColorStop(1, rgba(TS.ring, 0.55))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = TS.warm
  ctx.beginPath()
  ctx.arc(70 + rand() * 110, 92, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#082a3a'
  ctx.beginPath()
  ctx.moveTo(0, 256)
  ctx.lineTo(0, 200)
  ctx.lineTo(90 + rand() * 30, 150)
  ctx.lineTo(170, 210)
  ctx.lineTo(256, 170)
  ctx.lineTo(256, 256)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#04141d'
  ctx.beginPath()
  ctx.moveTo(0, 256)
  ctx.lineTo(0, 215)
  ctx.lineTo(70 + rand() * 20, 125)
  ctx.lineTo(130, 205)
  ctx.lineTo(190, 140 + rand() * 20)
  ctx.lineTo(256, 215)
  ctx.lineTo(256, 256)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.lineWidth = 4
  ctx.strokeStyle = rgba(TS.warm, 0.8)
  rr(ctx, 2, 2, 252, 252, 21)
  ctx.stroke()
  return toTex(c)
}

export function ShastraWorld() {
  const idx = stationOf('shastra')
  const root = useRef()
  const wire = useRef()
  const ring = useRef()
  const glow = useMemo(() => makeGlowTexture(), [])
  const cards = useMemo(() => SH_YS.map((_, i) => textCardTexture(11 + i * 7)), [])
  const tiles = useMemo(() => SH_YS.map((_, i) => imageTileTexture(5 + i * 9)), [])

  const { arcs, bridge } = useMemo(() => {
    // pulses travel from each text card, through the shared CLIP space, to its image tile
    const curves = SH_YS.map((y, i) => {
      const spline = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.4, y, 0),
        new THREE.Vector3(0, 0.4 + (y - 0.4) * 0.35, 0.25 * (i - 1)),
        new THREE.Vector3(1.4, y, 0),
      ])
      return { pts: spline.getPoints(40), layer: 0, offset: i / 3 }
    })

    // the bridge: deck, arch and hangers
    const pts = []
    const deckY = -1.85
    const half = 2.4
    const rise = 0.6
    const N = 28
    pts.push(new THREE.Vector3(-half, deckY, 0), new THREE.Vector3(half, deckY, 0))
    let prev = null
    for (let i = 0; i <= N; i++) {
      const x = -half + (i / N) * 2 * half
      const p = new THREE.Vector3(x, deckY + rise * (1 - (x / half) ** 2), 0)
      if (prev) pts.push(prev, p)
      if (i % 2 === 0) pts.push(new THREE.Vector3(x, deckY, 0), p)
      prev = p
    }
    return { arcs: buildLines(curves), bridge: new THREE.BufferGeometry().setFromPoints(pts) }
  }, [])

  useRoomFrame(
    idx,
    (s, d) => {
      wire.current.rotation.y += d * 0.6
      wire.current.rotation.x += d * 0.25
      ring.current.rotation.z += d * 0.5
    },
    root
  )

  return (
    <group ref={root}>
      <sprite position={[0, 0.2, -1.2]} scale={[7, 5.5, 1]}>
        <spriteMaterial map={glow} color={TS.ring} opacity={0.16} {...additive()} />
      </sprite>

      <lineSegments geometry={bridge}>
        <lineBasicMaterial color={TS.ring} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      {SH_YS.map((y, i) => (
        <Bob key={`c${i}`} idx={idx} base={[-1.85, y, 0]} phase={i * 1.3} rot={[0, 0.3, 0]}>
          <mesh>
            <planeGeometry args={[0.85, 1.06]} />
            <meshBasicMaterial map={cards[i]} transparent toneMapped={false} />
          </mesh>
        </Bob>
      ))}
      {SH_YS.map((y, i) => (
        <Bob key={`t${i}`} idx={idx} base={[1.85, y, 0]} phase={i * 1.3 + 0.9} rot={[0, -0.3, 0]}>
          <mesh>
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial map={tiles[i]} transparent toneMapped={false} />
          </mesh>
        </Bob>
      ))}

      <PulseLines geometry={arcs} color={TS.ring} pulse="#ffffff" speed={0.22} steps={1} base={0.14} width={160} />

      {/* the shared CLIP embedding space */}
      <group position={[0, 0.4, 0]}>
        <sprite scale={[2.6, 2.6, 1]}>
          <spriteMaterial map={glow} color={TS.ring} opacity={0.7} {...additive()} />
        </sprite>
        <mesh>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh ref={wire}>
          <icosahedronGeometry args={[0.42, 1]} />
          <meshBasicMaterial color={TS.ring} wireframe transparent opacity={0.6} />
        </mesh>
        <mesh ref={ring} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.65, 0.008, 6, 96]} />
          <meshBasicMaterial color={TS.warm} transparent opacity={0.8} />
        </mesh>
      </group>

      <Label text="TEXT" color={TS.soft} position={[-1.85, 2.3, 0]} height={0.15} />
      <Label text="IMAGE" color={TS.soft} position={[1.85, 2.3, 0]} height={0.15} />
      <Label text="CLIP SPACE" color={TS.warm} position={[0, 1.3, 0]} height={0.13} />
      <Label text="VRAM 0 MiB" color={TS.ring} position={[0, -2.45, 0]} height={0.2} opacity={0.95} />
    </group>
  )
}

/* ======================================================================
   WORLD 2: Traffic analytics, a night-road view with tracked cars
   ====================================================================== */
const TT = WORLD_THEME.traffic
const HALF = 2.4
const LANE_H = 2.875 / 3
const LANES = [LANE_H, 0, -LANE_H]
const CAR_DEFS = [
  { id: 'car #3', lane: 0, x: -2.1, speed: 0.5, dir: -1, color: '#e9e4ff' },
  { id: 'car #11', lane: 0, x: -0.43, speed: 0.5, dir: -1, color: '#ffb27a' },
  { id: 'car #18', lane: 0, x: 1.24, speed: 0.5, dir: -1, color: '#7be0ff' },
  { id: 'car #7', lane: 1, x: -1.5, speed: 0.8, dir: 1, color: '#ff7aa8' },
  { id: 'car #12', lane: 1, x: 0.17, speed: 0.8, dir: 1, color: '#c8ffd9' },
  { id: 'car #21', lane: 1, x: 1.84, speed: 0.8, dir: 1, color: '#fff1b0' },
  { id: 'car #5', lane: 2, x: -1.9, speed: 0.6, dir: -1, color: '#b8b0ff' },
  { id: 'car #14', lane: 2, x: -0.23, speed: 0.6, dir: -1, color: '#ffd2a8' },
  { id: 'car #19', lane: 2, x: 1.44, speed: 0.6, dir: -1, color: '#9ff0ff' },
]

function roadTexture() {
  const rand = mulberry(3)
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 640
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 640)
  g.addColorStop(0, '#150b1f')
  g.addColorStop(1, '#0c0614')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 640)
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  for (let i = 0; i < 1500; i++) ctx.fillRect(rand() * 1024, rand() * 640, 2, 2)
  ctx.fillStyle = rgba(TT.warm, 0.85)
  ctx.fillRect(0, 20, 1024, 6)
  ctx.fillRect(0, 614, 1024, 6)
  ctx.fillStyle = 'rgba(255,241,228,0.55)'
  ;[213, 427].forEach((y) => {
    for (let x = 10; x < 1024; x += 104) ctx.fillRect(x, y - 3, 60, 6)
  })
  return toTex(c)
}

function Car({ idx, def, boxGeo, glow }) {
  const g = useRef()
  const st = useRef({ x: def.x })
  const y = LANES[def.lane]
  const d = def.dir

  useRoomFrame(idx, (s, delta) => {
    const c = st.current
    c.x += def.speed * d * Math.min(delta, 0.05)
    if (c.x > HALF) c.x -= 2 * HALF
    if (c.x < -HALF) c.x += 2 * HALF
    const edge = Math.min(1, (HALF - Math.abs(c.x)) / 0.5) // shrink in and out at the road edges
    g.current.position.x = c.x
    g.current.scale.setScalar(Math.max(0.001, edge))
  })

  return (
    <group ref={g} position={[def.x, y, 0.06]}>
      <mesh>
        <boxGeometry args={[0.7, 0.34, 0.12]} />
        <meshStandardMaterial color={def.color} roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[-0.05 * d, 0, 0.1]}>
        <boxGeometry args={[0.34, 0.28, 0.1]} />
        <meshStandardMaterial color="#1a1424" roughness={0.3} metalness={0.5} />
      </mesh>
      {[-1, 1].map((sy) => (
        <mesh key={`h${sy}`} position={[0.35 * d, sy * 0.11, 0.02]}>
          <boxGeometry args={[0.05, 0.07, 0.06]} />
          <meshBasicMaterial color="#fff3c4" toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((sy) => (
        <mesh key={`t${sy}`} position={[-0.35 * d, sy * 0.11, 0.02]}>
          <boxGeometry args={[0.05, 0.07, 0.06]} />
          <meshBasicMaterial color="#ff3b5c" toneMapped={false} />
        </mesh>
      ))}
      <sprite position={[0.55 * d, 0, 0.06]} scale={[0.6, 0.6, 1]}>
        <spriteMaterial map={glow} color="#fff3c4" {...additive({ opacity: 0.4 })} />
      </sprite>
      <mesh position={[-d * 0.8, 0, -0.03]}>
        <planeGeometry args={[0.9, 0.07]} />
        <meshBasicMaterial map={glow} color={TT.warm} toneMapped={false} {...additive({ opacity: 0.45 })} />
      </mesh>
      {/* the tracker's bounding box and ID */}
      <lineLoop geometry={boxGeo}>
        <lineBasicMaterial color={TT.cyan} />
      </lineLoop>
      <Label text={def.id} color={TT.cyan} position={[0, 0.34, 0.14]} height={0.1} opacity={0.95} />
    </group>
  )
}

export function TrafficWorld() {
  const idx = stationOf('traffic')
  const root = useRef()
  const tilt = useRef()
  const sweep = useRef()
  const rec = useRef()
  const glow = useMemo(() => makeGlowTexture(), [])
  const road = useMemo(() => roadTexture(), [])

  const boxGeo = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.43, -0.25, 0.12),
        new THREE.Vector3(0.43, -0.25, 0.12),
        new THREE.Vector3(0.43, 0.25, 0.12),
        new THREE.Vector3(-0.43, 0.25, 0.12),
      ]),
    []
  )

  const brackets = useMemo(() => {
    const pts = []
    const bw = 2.3
    const bh = 1.44
    const L = 0.3
    ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      const cx = sx * bw
      const cy = sy * bh
      pts.push(
        new THREE.Vector3(cx, cy, 0.05),
        new THREE.Vector3(cx - sx * L, cy, 0.05),
        new THREE.Vector3(cx, cy, 0.05),
        new THREE.Vector3(cx, cy - sy * L, 0.05)
      )
    })
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  useRoomFrame(
    idx,
    (s, d) => {
      const t = s.clock.elapsedTime
      sweep.current.position.x = -2.3 + ((t % 4) / 4) * 4.6
      rec.current.material.opacity = Math.sin(t * 4) > 0 ? 0.9 : 0.2
      tilt.current.rotation.y = THREE.MathUtils.damp(tilt.current.rotation.y, 0.3 + s.pointer.x * 0.12, 3, d)
      tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, -0.5 - s.pointer.y * 0.08, 3, d)
    },
    root
  )

  return (
    <group ref={root}>
      <sprite position={[0, 0, -1.2]} scale={[7.5, 5, 1]}>
        <spriteMaterial map={glow} color={TT.ring} opacity={0.14} {...additive()} />
      </sprite>

      <group ref={tilt} rotation={[-0.5, 0.3, 0]}>
        <mesh>
          <planeGeometry args={[4.6, 2.875]} />
          <meshBasicMaterial map={road} toneMapped={false} />
        </mesh>

        {CAR_DEFS.map((def) => (
          <Car key={def.id} idx={idx} def={def} boxGeo={boxGeo} glow={glow} />
        ))}

        {/* detection sweep */}
        <mesh ref={sweep} position={[0, 0, 0.2]}>
          <planeGeometry args={[0.05, 2.9]} />
          <meshBasicMaterial color={TT.cyan} toneMapped={false} {...additive({ opacity: 0.5 })} />
          <mesh position={[-0.2, 0, 0]}>
            <planeGeometry args={[0.4, 2.9]} />
            <meshBasicMaterial color={TT.cyan} toneMapped={false} {...additive({ opacity: 0.07 })} />
          </mesh>
        </mesh>

        {/* viewfinder corners */}
        <lineSegments geometry={brackets}>
          <lineBasicMaterial color={TT.cyan} transparent opacity={0.9} />
        </lineSegments>
      </group>

      <sprite ref={rec} position={[-2.05, 1.72, 0.05]} scale={[0.24, 0.24, 1]}>
        <spriteMaterial map={glow} color="#ff3b5c" {...additive({ opacity: 0.9 })} />
      </sprite>
      <Label text="LIVE" color={TT.soft} position={[-1.7, 1.72, 0]} height={0.11} />
      <Label text="YOLOv8 · 45 FPS" color={TT.warm} position={[0.5, 1.72, 0]} height={0.15} opacity={0.95} />
    </group>
  )
}

/* ======================================================================
   WORLD 3: Offline RAG, an archive of pages around a vector core
   ====================================================================== */
const TR = WORLD_THEME.rag
const PAGES = 12
const PAGE_R = 1.75
const WARM = new THREE.Color(TR.warm)

function pageTexture(seed) {
  const rand = mulberry(seed)
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 330
  const ctx = c.getContext('2d')
  ctx.save()
  rr(ctx, 0, 0, 256, 330, 14)
  ctx.clip()
  ctx.fillStyle = '#efe4cb'
  ctx.fillRect(0, 0, 256, 330)
  ctx.fillStyle = '#2b2a25'
  ctx.fillRect(22, 24, 120 + rand() * 60, 12)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#8a8678'
    ctx.fillRect(22, 52 + i * 16, 150 + rand() * 56, 6)
  }
  // a little architecture diagram
  ctx.strokeStyle = '#1f8f5f'
  ctx.lineWidth = 3
  ctx.strokeRect(26, 160, 204, 92)
  ;[40, 100, 160].forEach((x) => {
    ctx.fillStyle = 'rgba(31,143,95,0.85)'
    ctx.fillRect(x, 188, 44, 30)
  })
  ctx.fillRect(84, 201, 16, 3)
  ctx.fillRect(144, 201, 16, 3)
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#8a8678'
    ctx.fillRect(22, 270 + i * 14, 140 + rand() * 70, 6)
  }
  ctx.restore()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#b9a98a'
  rr(ctx, 1.5, 1.5, 253, 327, 13)
  ctx.stroke()
  return toTex(c)
}

export function RagWorld() {
  const idx = stationOf('rag')
  const root = useRef()
  const tilt = useRef()
  const orbit = useRef()
  const wire = useRef()
  const pageRefs = useRef([])
  const frameRefs = useRef([])
  const glow = useMemo(() => makeGlowTexture(), [])
  const texs = useMemo(() => [1, 2, 3].map((s) => pageTexture(s * 13)), [])

  const layout = useMemo(
    () =>
      Array.from({ length: PAGES }, (_, i) => {
        const tier = Math.floor(i / 4)
        const a = (i % 4) * (Math.PI / 2) + tier * (Math.PI / 4)
        const y = (tier - 1) * 1.0
        return { a, pos: new THREE.Vector3(Math.sin(a) * PAGE_R, y, Math.cos(a) * PAGE_R) }
      }),
    []
  )

  // one beam per page, pointing at the core; brightness is animated
  const beams = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(PAGES * 2 * 3)
    layout.forEach((p, i) => pos.set([p.pos.x, p.pos.y, p.pos.z, 0, 0, 0], i * 6))
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PAGES * 2 * 3), 3))
    return g
  }, [layout])

  useRoomFrame(
    idx,
    (s, d) => {
      const t = s.clock.elapsedTime
      orbit.current.rotation.y += d * 0.2
      tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, 0.25 - s.pointer.y * 0.12, 3, d)
      wire.current.rotation.y -= d * 0.5
      wire.current.rotation.x += d * 0.3

      const col = beams.attributes.color
      for (let i = 0; i < PAGES; i++) {
        const h = Math.pow(Math.max(0, Math.sin(t * 0.8 - i * 0.55)), 12) // which page is being "retrieved"
        const b = 0.06 + 0.94 * h
        col.setXYZ(i * 2, WARM.r * b, WARM.g * b, WARM.b * b)
        col.setXYZ(i * 2 + 1, WARM.r * b, WARM.g * b, WARM.b * b)
        const f = frameRefs.current[i]
        if (f) f.material.opacity = h * 0.85
        const p = pageRefs.current[i]
        if (p) p.scale.setScalar(1 + 0.1 * h)
      }
      col.needsUpdate = true
    },
    root
  )

  return (
    <group ref={root}>
      <sprite position={[0, 0, -1.5]} scale={[7, 6, 1]}>
        <spriteMaterial map={glow} color={TR.ring} opacity={0.14} {...additive()} />
      </sprite>

      <group ref={tilt} rotation={[0.25, 0, 0]}>
        <group ref={orbit}>
          {layout.map((p, i) => (
            <group key={i} position={p.pos} rotation={[0, p.a, 0]} ref={(el) => (pageRefs.current[i] = el)}>
              <mesh ref={(el) => (frameRefs.current[i] = el)} position={[0, 0, -0.01]}>
                <planeGeometry args={[0.72, 0.92]} />
                <meshBasicMaterial color={TR.warm} {...additive({ side: THREE.DoubleSide, opacity: 0 })} />
              </mesh>
              <mesh>
                <planeGeometry args={[0.62, 0.8]} />
                <meshBasicMaterial map={texs[i % 3]} transparent opacity={0.92} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            </group>
          ))}
          <lineSegments geometry={beams}>
            <lineBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
        </group>

        {/* the vector core */}
        <sprite scale={[3, 3, 1]}>
          <spriteMaterial map={glow} color={TR.ring} opacity={0.75} {...additive()} />
        </sprite>
        <mesh>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshBasicMaterial color="#eafff4" toneMapped={false} />
        </mesh>
        <mesh ref={wire}>
          <octahedronGeometry args={[0.55, 0]} />
          <meshBasicMaterial color={TR.ring} wireframe transparent opacity={0.7} />
        </mesh>

        {/* the ring that keeps everything offline */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.15, 0.008, 6, 160]} />
          <meshBasicMaterial color={TR.ring} transparent opacity={0.45} />
        </mesh>
      </group>

      <Label text="QDRANT CORE" color={TR.soft} position={[0, 2.35, 0]} height={0.15} />
      <Label text="FULLY OFFLINE" color={TR.ring} position={[0, -2.35, 0]} height={0.17} opacity={0.95} />
    </group>
  )
}

export const WORLD_COMPONENTS = {
  shastra: ShastraWorld,
  traffic: TrafficWorld,
  rag: RagWorld,
}