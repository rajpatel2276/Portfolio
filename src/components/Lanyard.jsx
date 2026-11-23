import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier'
import { makeFrontTexture, makeBackTexture } from './cardTextures'
import { makeStrapTextures, STRAP_W, STRAP_TILE } from './strapTexture'
import { THEME } from '../theme'
import { RESUME_URL } from '../content'
import { scrollState, STATIONS, cardBus } from '../scroll'

const CARD_W = 1.6
const CARD_H = 2.25
const ANCHOR_Y = 1.35 // strap attachment, inside the metal clip
const SEGMENTS = 40

// the joint that holds the card to the strap; unmounting it lets the card fall
function CardJoint({ a, b }) {
  useSphericalJoint(a, b, [[0, 0, 0], [0, ANCHOR_Y, 0]])
  return null
}

export default function Lanyard({ anchorX = 0, onReveal, onDrop }) {
  const fixed = useRef()
  const j1 = useRef()
  const j2 = useRef()
  const j3 = useRef()
  const card = useRef()
  const flipRef = useRef()
  const tabRef = useRef()
  const cardGroup = useRef()
  const tipRef = useRef()

  const [phase, setPhase] = useState('hidden') // hidden -> free
  const [zone, setZone] = useState(true) // invisible grab area for the first pull
  const [dragged, drag] = useState(false)
  const [hovered, hover] = useState(false)
  const [clipHover, setClipHover] = useState(false)
  const [attached, setAttached] = useState(true)

  const grabOffset = useRef(new THREE.Vector3())
  const easeOffset = useRef(false)
  const downInfo = useRef({ x: 0, y: 0, t: 0 })
  const flipState = useRef({ angle: 0, vel: 0, target: 0 })
  const kick = useRef(0)
  const lastFlip = useRef(0)
  const flipped = useRef(false)
  const popRef = useRef(1)
  const parked = useRef(false)
  const scrollRx = useRef({ lastP: 0, lastPos: 0, v: 0, pv: 0, g: 1, dirX: anchorX >= 0 ? 1 : -1 })
  const reduceMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  const tmp = useMemo(
    () => ({
      vec: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      anchor: new THREE.Vector3(),
      ang: new THREE.Vector3(),
      rot: new THREE.Vector3(),
      q: new THREE.Quaternion(),
    }),
    []
  )

  // textures
  const photo = useTexture('/photo.webp')
  const frontTex = useMemo(() => makeFrontTexture(photo.image), [photo])
  const backTex = useMemo(() => makeBackTexture(RESUME_URL), [])
  const strapTex = useMemo(() => makeStrapTextures(), [])

  // strap path + ribbon geometry
  const curve = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ])
    c.curveType = 'chordal'
    return c
  }, [])

  const strapGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const count = (SEGMENTS + 1) * 2
    const pos = new THREE.BufferAttribute(new Float32Array(count * 3), 3)
    const uv = new THREE.BufferAttribute(new Float32Array(count * 2), 2)
    pos.setUsage(THREE.DynamicDrawUsage)
    uv.setUsage(THREE.DynamicDrawUsage)
    const normals = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) normals[i * 3 + 2] = 1
    const index = []
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3
      index.push(a, b, c, b, d, c)
    }
    g.setAttribute('position', pos)
    g.setAttribute('uv', uv)
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    g.setIndex(index)
    return g
  }, [])

  const segmentProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 2,
    linearDamping: 2,
  }

  // the rope chain; the card joint is a separate component so it can be removed
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])

  // cursor
  useEffect(() => {
    document.body.style.cursor = dragged ? 'grabbing' : clipHover ? 'pointer' : hovered ? 'grab' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered, dragged, clipHover])

  const endDrag = () => {
    easeOffset.current = false
    drag(false)
  }

  // safety net: never get stuck in "dragging", wherever the pointer is released
  useEffect(() => {
    const up = () => endDrag()
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  const startDrag = (e, fromZone) => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    downInfo.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, t: performance.now() }
    grabOffset.current.copy(e.point).sub(tmp.vec.copy(card.current.translation()))
    if (fromZone) {
      grabOffset.current.z = 0
      easeOffset.current = true // card glides up to the cursor instead of jumping
      setPhase('free')
      onReveal?.()
    } else {
      easeOffset.current = false
    }
    drag(true)
  }

  const flip = () => {
    const now = performance.now()
    if (now - lastFlip.current < 600) return // ignore duplicate events from one click
    lastFlip.current = now
    flipped.current = !flipped.current
    flipState.current.target = flipped.current ? Math.PI : 0
    kick.current = Math.random() > 0.5 ? 1 : -1
  }

  // ---- pop the clip: the card comes off the strap ----
  const detach = () => {
    if (!attached || phase !== 'free' || dragged) return
    hover(false)
    setClipHover(false)
    setAttached(false)
    onDrop?.(true)
  }

  // when the joint is gone, give the card a little push and a tumble
  useEffect(() => {
    if (attached) return
    const b = card.current
    if (!b) return
    b.setGravityScale(1, true)
    b.wakeUp()
    b.applyImpulse({ x: (Math.random() - 0.5) * 0.8, y: -0.2, z: 0.3 }, true)
    b.applyTorqueImpulse(
      { x: 0.15 + Math.random() * 0.2, y: (Math.random() - 0.5) * 0.4, z: (Math.random() - 0.5) * 0.5 },
      true
    )
  }, [attached])

  // ---- put the card back on the strap ----
  const reattach = () => {
    const b = card.current
    const j = j3.current
    if (attached || !b || !j) return
    const p = j.translation()
    b.setTranslation({ x: p.x, y: p.y - ANCHOR_Y, z: p.z }, true)
    b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    b.setGravityScale(scrollRx.current.g, true)
    parked.current = false
    popRef.current = 0 // pop-in animation
    flipped.current = false
    flipState.current = { angle: 0, vel: 0, target: 0 }
    setAttached(true)
    onDrop?.(false)
  }

  // the hero button calls this through a tiny shared object
  const latest = useRef()
  latest.current = reattach
  useEffect(() => {
    cardBus.reattach = () => latest.current && latest.current()
    return () => {
      cardBus.reattach = null
    }
  }, [])

  useFrame((state, delta) => {
    const { vec, dir, anchor, ang, rot, q } = tmp

    // ---- drag ----
    if (dragged) {
      const off = grabOffset.current
      if (easeOffset.current) off.y += (-0.9 - off.y) * Math.min(1, delta * 2.5)
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      const plane = -state.camera.position.z / dir.z // distance to the z = 0 plane the card lives on
      vec.copy(state.camera.position).addScaledVector(dir, plane)
      ;[card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp())
      card.current?.setNextKinematicTranslation({
        x: vec.x - off.x,
        y: vec.y - off.y,
        z: vec.z - off.z,
      })
    }

    // ---- flip animation (springy, independent of physics) ----
    const s = flipState.current
    const dt = Math.min(delta, 0.033)
    s.vel += ((s.target - s.angle) * 45 - s.vel * 11) * dt
    s.angle += s.vel * dt
    if (flipRef.current) flipRef.current.rotation.y = s.angle

    // pull-cord bobbing
    if (tabRef.current) tabRef.current.position.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.08

    // pop-in when the card is put back (ease-out-back)
    if (cardGroup.current) {
      popRef.current = Math.min(1, popRef.current + delta / 0.45)
      const x = popRef.current - 1
      const k = 1 + 2.70158 * x * x * x + 1.70158 * x * x
      cardGroup.current.scale.setScalar(Math.max(0.001, k))
    }

    if (!fixed.current || !card.current) return

    // a dropped card that has fallen far away stops being simulated
    if (!attached && !parked.current && card.current.translation().y < -30) {
      card.current.setLinvel({ x: 0, y: 0, z: 0 }, false)
      card.current.setAngvel({ x: 0, y: 0, z: 0 }, false)
      card.current.sleep()
      parked.current = true
    }

    // ---- scroll reaction: the lanyard is blown about and lifted while you scroll ----
    {
      const sc = scrollRx.current
      const dts = Math.max(delta, 1 / 240)
      const p = scrollState.progress
      const pos = scrollState.pos
      sc.v = THREE.MathUtils.damp(sc.v, ((p - sc.lastP) / dts) * (STATIONS - 1), 9, delta) // scroll speed, stations/s
      sc.pv = THREE.MathUtils.damp(sc.pv, (pos - sc.lastPos) / dts, 9, delta) // camera speed, stations/s
      sc.lastP = p
      sc.lastPos = pos

      const live = phase === 'free' && !dragged && !reduceMotion && pos < 0.8
      // wake of the camera flying past the card
      const whoosh =
        THREE.MathUtils.clamp(sc.pv / 2.5, -1.5, 1.5) * Math.max(0, 1 - Math.abs(state.camera.position.z) / 10)
      const a = live ? THREE.MathUtils.clamp(sc.v / 1.5 + whoosh, -1.8, 1.8) : 0
      const chain = attached ? [j1, j2, j3, card] : [j1, j2, j3]

      if (Math.abs(a) > 0.02) {
        const dd = Math.min(delta, 0.05)
        const wind = a * 12 * sc.dirX // sideways gust, outward when scrolling forward
        chain.forEach((r) => {
          const b = r.current
          if (!b) return
          const m = b.mass()
          b.applyImpulse({ x: m * wind * dd, y: 0, z: -m * 8 * a * dd }, true)
        })
      }

      // lighter while scrolling forward (the tug), heavier when scrolling back
      const g = a > 0 ? 1 - 0.65 * Math.min(a, 1) : 1 + 0.4 * Math.min(-a, 1)
      if (Math.abs(g - sc.g) > 0.01) {
        chain.forEach((r) => r.current && r.current.setGravityScale(g, true))
        sc.g = g
      }
    }

    // little swing when the card flips
    if (kick.current && !dragged && attached && phase === 'free') {
      card.current.applyImpulse({ x: 0.2 * kick.current, y: 0, z: 0 }, true)
      kick.current = 0
    }

    // ---- strap path ----
    ;[j1, j2].forEach((ref) => {
      if (!ref.current.lerped) {
        ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
      }
      const d = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())))
      ref.current.lerped.lerp(ref.current.translation(), delta * (10 + d * 40))
    })

    // the strap ends in the clip, or loose at the last joint once the card is gone
    if (attached) {
      const r = card.current.rotation()
      q.set(r.x, r.y, r.z, r.w)
      anchor.set(0, ANCHOR_Y, 0).applyQuaternion(q).add(card.current.translation())
    } else {
      anchor.copy(j3.current.translation())
    }
    if (tipRef.current) tipRef.current.position.copy(anchor)

    curve.points[0].copy(anchor)
    curve.points[1].copy(j2.current.lerped)
    curve.points[2].copy(j1.current.lerped)
    curve.points[3].copy(fixed.current.translation())

    const pts = curve.getPoints(SEGMENTS)
    const pos = strapGeo.attributes.position
    const uv = strapGeo.attributes.uv
    const hw = STRAP_W / 2
    let dist = 0

    for (let i = 0; i <= SEGMENTS; i++) {
      const p = pts[i]
      if (i > 0) dist += p.distanceTo(pts[i - 1])
      const prev = pts[Math.max(i - 1, 0)]
      const next = pts[Math.min(i + 1, SEGMENTS)]
      const tx = next.x - prev.x
      const ty = next.y - prev.y
      const len = Math.hypot(tx, ty) || 1
      const sx = ty / len
      const sy = -tx / len
      const v = dist / STRAP_TILE
      pos.setXYZ(i * 2, p.x - sx * hw, p.y - sy * hw, p.z)
      pos.setXYZ(i * 2 + 1, p.x + sx * hw, p.y + sy * hw, p.z)
      uv.setXY(i * 2, 0, v)
      uv.setXY(i * 2 + 1, 1, v)
    }
    pos.needsUpdate = true
    uv.needsUpdate = true

    // keep the card's spin tidy while it hangs (a falling card tumbles freely)
    if (attached) {
      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation())
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
    }
  })

  const cardType = phase === 'hidden' || dragged ? 'kinematicPosition' : 'dynamic'

  return (
    <>
      {/* chain starts perfectly aligned: card parked above the top edge of the screen */}
      <group position={[anchorX, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0, 0.53, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0, 1.07, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0, 1.6, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody position={[0, 1.6 - ANCHOR_Y, 0]} ref={card} {...segmentProps} type={cardType}>
          <CuboidCollider args={[CARD_W / 2, CARD_H / 2, 0.02]} />
          <group
            ref={cardGroup}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerDown={(e) => startDrag(e, false)}
            onPointerUp={(e) => {
              e.target.releasePointerCapture(e.pointerId)
              const ne = e.nativeEvent
              const moved = Math.hypot(ne.clientX - downInfo.current.x, ne.clientY - downInfo.current.y)
              const time = performance.now() - downInfo.current.t
              endDrag()
              if (moved < 8 && time < 500) flip() // a quick click, not a drag
            }}
          >
            {/* faces rotate on their own for the flip */}
            <group ref={flipRef}>
              <mesh position={[0, 0, 0.012]}>
                <planeGeometry args={[CARD_W, CARD_H]} />
                <meshPhysicalMaterial
                  map={frontTex}
                  alphaTest={0.5}
                  roughness={0.4}
                  metalness={0.1}
                  clearcoat={1}
                  clearcoatRoughness={0.2}
                />
              </mesh>
              <mesh position={[0, 0, -0.012]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[CARD_W, CARD_H]} />
                <meshPhysicalMaterial
                  map={backTex}
                  alphaTest={0.5}
                  roughness={0.4}
                  metalness={0.1}
                  clearcoat={1}
                  clearcoatRoughness={0.2}
                />
              </mesh>
            </group>

            {/* metal clip: the strap ends inside it; it glows when you can pop it */}
            <mesh position={[0, CARD_H / 2 + 0.1, 0]}>
              <boxGeometry args={[0.34, 0.4, 0.07]} />
              <meshStandardMaterial
                color="#c4c4d4"
                metalness={0.9}
                roughness={0.25}
                emissive={THEME.accent}
                emissiveIntensity={clipHover ? 0.8 : 0}
              />
            </mesh>
            <mesh position={[0, CARD_H / 2 + 0.1, 0.037]}>
              <boxGeometry args={[0.2, 0.05, 0.01]} />
              <meshStandardMaterial color="#6b6b80" metalness={0.8} roughness={0.4} />
            </mesh>

            {/* invisible, slightly larger hit area for the clip (easy to tap on phones) */}
            <mesh
              position={[0, CARD_H / 2 + 0.12, 0.06]}
              onPointerOver={(e) => {
                e.stopPropagation()
                if (phase === 'free') setClipHover(true)
              }}
              onPointerOut={() => setClipHover(false)}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                detach()
              }}
            >
              <planeGeometry args={[0.52, 0.58]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </RigidBody>

        {/* removing this joint is what lets the card fall */}
        {attached && <CardJoint a={j3} b={card} />}
      </group>

      {/* cloth strap */}
      <mesh geometry={strapGeo} frustumCulled={false}>
        <meshPhysicalMaterial
          map={strapTex.map}
          bumpMap={strapTex.bump}
          bumpScale={1.2}
          roughness={0.9}
          metalness={0}
          sheen={1}
          sheenRoughness={0.5}
          sheenColor={THEME.accentSoft}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* metal bead on the loose end of the strap after the card has dropped */}
      {!attached && (
        <group ref={tipRef}>
          <mesh>
            <sphereGeometry args={[0.1, 20, 20]} />
            <meshStandardMaterial color="#c4c4d4" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      )}

      {/* pull-cord + invisible grab zone, only for the very first pull */}
      {phase === 'hidden' && (
        <group position={[anchorX, 2.2, 0]}>
          <group ref={tabRef}>
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[0.025, 1.2, 0.025]} />
              <meshStandardMaterial color={THEME.primary} emissive={THEME.primary} emissiveIntensity={1.2} />
            </mesh>
            <mesh>
              <capsuleGeometry args={[0.09, 0.32, 8, 16]} />
              <meshStandardMaterial
                color={THEME.primarySoft}
                emissive={THEME.primary}
                emissiveIntensity={1.6}
                toneMapped={false}
              />
            </mesh>
          </group>
          <Html position={[0, -0.75, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="pull-hint">↓ Pull down</div>
          </Html>
        </group>
      )}

      {zone && (
        <mesh
          position={[anchorX, 2.1, 0.3]}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
          onPointerDown={(e) => startDrag(e, true)}
          onPointerUp={(e) => {
            e.target.releasePointerCapture(e.pointerId)
            endDrag()
            setZone(false)
            hover(false)
          }}
        >
          <planeGeometry args={[2.4, 1.6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}