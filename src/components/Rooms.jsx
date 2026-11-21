import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { THEME, rgba } from '../theme'
import { PulseLines, Label, buildLines, makeGlowTexture, mulberry } from './fx'
import { FEATURED, SKILL_SPHERE } from '../content'
import { scrollToStation, ST } from '../scroll'

function additive(extra = {}) {
  return { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...extra }
}

/* ======================================================================
   ABOUT: a neural network doing a forward pass
   ====================================================================== */
const LAYERS = [4, 7, 9, 7, 3]

export function AboutRoom() {
  const group = useRef()
  const dot = useMemo(() => makeGlowTexture(), [])
  const halo = useMemo(() => makeGlowTexture('rgba(255,255,255,0.55)', 'rgba(255,255,255,0.14)'), [])

  const { lines, nodes } = useMemo(() => {
    const rand = mulberry(7)
    const layers = LAYERS.map((n, li) => {
      const x = THREE.MathUtils.lerp(-2, 2, li / (LAYERS.length - 1))
      const gap = Math.min(0.62, 3.8 / Math.max(n - 1, 1))
      return Array.from(
        { length: n },
        (_, j) => new THREE.Vector3(x, (j - (n - 1) / 2) * gap, (rand() - 0.5) * 1.8)
      )
    })

    const curves = []
    for (let li = 0; li < layers.length - 1; li++) {
      for (const a of layers[li]) {
        for (const b of layers[li + 1]) {
          curves.push({ pts: [a, b], layer: li, offset: rand() * 0.05 })
        }
      }
    }

    const flat = layers.flat()
    const geo = new THREE.BufferGeometry().setFromPoints(flat)
    const col = new Float32Array(flat.length * 3)
    const cIn = new THREE.Color(THEME.accent)
    const cMid = new THREE.Color(THEME.primarySoft)
    const cOut = new THREE.Color(THEME.cream)
    let k = 0
    layers.forEach((L, li) => {
      const c = li === 0 ? cIn : li === layers.length - 1 ? cOut : cMid
      L.forEach(() => {
        c.toArray(col, k)
        k += 3
      })
    })
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))

    return { lines: buildLines(curves), nodes: geo }
  }, [])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    group.current.rotation.y = Math.sin(t * 0.35) * 0.5
    group.current.rotation.x = Math.sin(t * 0.27) * 0.08
  })

  return (
    <group ref={group}>
      <sprite position={[0, 0, -1.6]} scale={[8, 6, 1]}>
        <spriteMaterial map={halo} color={THEME.primary} opacity={0.22} {...additive()} />
      </sprite>

      <PulseLines
        geometry={lines}
        color={THEME.primary}
        pulse={THEME.accentSoft}
        speed={0.14}
        steps={5.5}
        base={0.1}
        width={70}
      />

      <points geometry={nodes}>
        <pointsMaterial size={0.36} map={dot} vertexColors {...additive()} />
      </points>

      <Label text="INPUT" color={THEME.accentSoft} position={[-2, -2.55, 0]} height={0.17} />
      <Label text="HIDDEN LAYERS" color={THEME.primarySoft} position={[0, -2.55, 0]} height={0.17} />
      <Label text="OUTPUT" color={THEME.cream} position={[2, -2.55, 0]} height={0.17} />
    </group>
  )
}

/* ======================================================================
   PROJECTS: three glass cards in depth, click to open the repository
   ====================================================================== */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const MONO = 'ui-monospace, Menlo, Consolas, monospace'
const SANS = 'system-ui, sans-serif'

function arrow(ctx, x1, y1, x2, y2, color, lw = 3, head = 12) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45))
  ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45))
  ctx.closePath()
  ctx.fill()
}

function badge(ctx, x, y, w, text, color, filled) {
  rr(ctx, x, y, w, 46, 23)
  if (filled) {
    ctx.fillStyle = color
    ctx.fill()
  } else {
    ctx.strokeStyle = rgba(color, 0.7)
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.fillStyle = filled ? '#120b09' : color
  ctx.font = `600 21px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + 24)
}

function box(ctx, x, y, w, h, text, stroke) {
  rr(ctx, x, y, w, h, 16)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.fillStyle = THEME.cream
  ctx.font = `600 22px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + h / 2 + 2)
}

// 01: the offline RAG pipeline
function vizRag(ctx) {
  ;['PDF', 'PyMuPDF', 'Qdrant', 'Llama 3.2'].forEach((t, i) => {
    const x = 44 + i * 180
    box(ctx, x, 226, 140, 84, t, i === 3 ? THEME.accent : rgba(THEME.primary, 0.75))
    if (i < 3) arrow(ctx, x + 148, 268, x + 172, 268, rgba(THEME.cream, 0.6), 3, 10)
  })
  badge(ctx, 44, 352, 210, '100% OFFLINE', THEME.accent, true)
  badge(ctx, 274, 352, 270, 'GPU-ACCELERATED', THEME.primarySoft, false)
  badge(ctx, 564, 352, 160, 'CITATIONS', THEME.cream, false)
}

// 02: tracked vehicles + the 45 FPS result
function vizTraffic(ctx) {
  rr(ctx, 44, 196, 400, 244, 20)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fill()

  ctx.setLineDash([16, 12])
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 318)
  ctx.lineTo(428, 318)
  ctx.stroke()
  ctx.setLineDash([])

  const boxes = [
    { x: 70, y: 238, w: 100, h: 66, t: 'car #12', c: THEME.accent },
    { x: 205, y: 338, w: 110, h: 68, t: 'car #7', c: THEME.primary },
    { x: 320, y: 250, w: 100, h: 66, t: 'car #19', c: THEME.primarySoft },
  ]
  boxes.forEach((b) => {
    ctx.fillStyle = rgba(b.c, 0.14)
    ctx.fillRect(b.x, b.y, b.w, b.h)
    ctx.strokeStyle = b.c
    ctx.lineWidth = 3
    ctx.strokeRect(b.x, b.y, b.w, b.h)
    ctx.font = `600 18px ${MONO}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const w = ctx.measureText(b.t).width + 14
    ctx.fillStyle = b.c
    ctx.fillRect(b.x, b.y - 26, w, 26)
    ctx.fillStyle = '#120b09'
    ctx.fillText(b.t, b.x + 7, b.y - 7)
  })

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = THEME.accent
  ctx.font = `800 120px ${SANS}`
  ctx.fillText('45', 468, 350)
  ctx.fillStyle = THEME.cream
  ctx.font = `700 40px ${SANS}`
  ctx.fillText('FPS', 612, 350)
  ctx.fillStyle = rgba(THEME.cream, 0.7)
  ctx.font = `500 24px ${SANS}`
  ctx.fillText('real-time inference', 470, 392)
  ctx.fillStyle = THEME.primarySoft
  ctx.font = `600 22px ${MONO}`
  ctx.fillText('YOLOv8 + SORT', 470, 428)
}

// 01: ShastraSetu, zero-VRAM multimodal RAG and claim verification
function vizShastra(ctx) {
  ;['CLIP', 'Retrieve', 'Rerank', 'Verify'].forEach((t, i) => {
    const x = 44 + i * 180
    box(ctx, x, 212, 140, 72, t, i === 2 ? THEME.accent : rgba(THEME.primary, 0.75))
    if (i < 3) arrow(ctx, x + 148, 248, x + 172, 248, rgba(THEME.cream, 0.6), 3, 10)
  })

  ctx.fillStyle = rgba(THEME.cream, 0.55)
  ctx.font = `500 17px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('ONNX · CPU', 114, 312)
  ctx.fillText('cross-encoder', 474, 312)

  ctx.textAlign = 'left'
  ctx.fillStyle = THEME.accent
  ctx.font = `800 84px ${SANS}`
  ctx.fillText('0 MiB', 44, 412)
  ctx.fillStyle = rgba(THEME.cream, 0.7)
  ctx.font = `500 24px ${SANS}`
  ctx.fillText('GPU memory in use', 300, 372)
  badge(ctx, 300, 384, 250, 'CONTAINERIZED', THEME.primarySoft, false)
  badge(ctx, 570, 384, 154, 'CPU-ONLY', THEME.accent, true)
}

const VIZ = { shastra: vizShastra, rag: vizRag, traffic: vizTraffic }

function cardTexture({ no, title, tag, key, color }) {
  const W = 768
  const H = 480
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  ctx.save()
  rr(ctx, 0, 0, W, H, 36)
  ctx.clip()

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1b1210')
  bg.addColorStop(1, '#0a0708')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const gl = ctx.createRadialGradient(W, 0, 10, W, 0, 420)
  gl.addColorStop(0, rgba(color, 0.35))
  gl.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = gl
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1
  for (let x = 0; x <= W; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y <= H; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = color
  ctx.font = `600 24px ${MONO}`
  ctx.fillText(`PROJECT / ${no}`, 44, 62)
  ctx.textAlign = 'right'
    ctx.fillText('ENTER WORLD →', W - 44, 62)

  ctx.textAlign = 'left'
  let size = 54
  ctx.font = `700 ${size}px ${SANS}`
  while (ctx.measureText(title).width > W - 88 && size > 28) {
    size -= 2
    ctx.font = `700 ${size}px ${SANS}`
  }
  ctx.fillStyle = THEME.cream
  ctx.fillText(title, 44, 124)
  ctx.fillStyle = rgba(THEME.cream, 0.6)
  ctx.font = `500 26px ${SANS}`
  ctx.fillText(tag, 44, 164)

  VIZ[key](ctx)
  ctx.restore()

  const bd = ctx.createLinearGradient(0, 0, W, H)
  bd.addColorStop(0, color)
  bd.addColorStop(1, rgba(color, 0.15))
  ctx.lineWidth = 4
  ctx.strokeStyle = bd
  rr(ctx, 2, 2, W - 4, H - 4, 34)
  ctx.stroke()

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const STYLE = [
  { color: THEME.primary, pos: [-0.3, 1.62, -0.7] },
  { color: THEME.accent, pos: [0.1, 0, 0] },
  { color: THEME.primary, pos: [0.5, -1.62, 0.7] },
]
const PROJECTS = FEATURED.map((p, i) => ({ ...p, ...STYLE[i] }))

function ProjectCard({ data, index, glow }) {
  const ref = useRef()
  const hovered = useRef(false)
  const lift = useRef(0)
  const tex = useMemo(() => cardTexture(data), [data])

  useFrame((s, d) => {
    lift.current = THREE.MathUtils.damp(lift.current, hovered.current ? 1 : 0, 8, d)
    const t = s.clock.elapsedTime
    ref.current.position.set(
      data.pos[0],
      data.pos[1] + Math.sin(t * 0.9 + index * 1.7) * 0.07,
      data.pos[2] + lift.current * 0.45
    )
    ref.current.scale.setScalar(1 + lift.current * 0.05)
  })

  return (
    <group ref={ref} position={data.pos}>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[3.7, 2.6]} />
        <meshBasicMaterial map={glow} color={data.color} opacity={0.3} toneMapped={false} {...additive()} />
      </mesh>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          hovered.current = true
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hovered.current = false
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
                    scrollToStation(ST.WORLD0 + index)
        }}
      >
        <planeGeometry args={[2.7, 1.6875]} />
        <meshBasicMaterial map={tex} alphaTest={0.5} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function ProjectsRoom() {
  const group = useRef()
  const glow = useMemo(() => makeGlowTexture(), [])

  useFrame((s, d) => {
    const g = group.current
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.22 + s.pointer.x * 0.2, 4, d)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -s.pointer.y * 0.1, 4, d)
  })

  return (
    <group ref={group}>
      <mesh position={[0, 0, -1.3]}>
        <planeGeometry args={[0.012, 6]} />
        <meshBasicMaterial color={THEME.primary} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0, -1.5]}>
        <torusGeometry args={[2.7, 0.008, 8, 128]} />
        <meshBasicMaterial color={THEME.accent} transparent opacity={0.25} />
      </mesh>
      {PROJECTS.map((p, i) => (
        <ProjectCard key={p.no} data={p} index={i} glow={glow} />
      ))}
      <Label text="ENTER A WORLD" color={THEME.primarySoft} position={[0, -2.95, 0.6]} height={0.15} />
    </group>
  )
}

/* ======================================================================
   SKILLS: a 3D skill sphere
   ====================================================================== */
const SK_R = 2.0
const SK_COLORS = [THEME.cream, THEME.primarySoft, THEME.accentSoft]

function wordTexture(text, color) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')
  let size = 66
  ctx.font = `700 ${size}px ${SANS}`
  while (ctx.measureText(text).width > 470 && size > 24) {
    size -= 4
    ctx.font = `700 ${size}px ${SANS}`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, 256, 68)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function SkillsRoom() {
  const group = useRef()
  const sprites = useRef([])
  const halo = useMemo(() => makeGlowTexture('rgba(255,255,255,0.55)', 'rgba(255,255,255,0.14)'), [])
  const dot = useMemo(() => makeGlowTexture(), [])
  const tmp = useMemo(() => ({ c: new THREE.Vector3(), cam: new THREE.Vector3(), p: new THREE.Vector3() }), [])

  const items = useMemo(() => {
    const n = SKILL_SPHERE.length
    return SKILL_SPHERE.map((text, i) => {
      const y = 1 - ((i + 0.5) * 2) / n
      const r = Math.sqrt(1 - y * y)
      const phi = i * 2.399963
      return {
        text,
        pos: [Math.cos(phi) * r * SK_R, y * SK_R, Math.sin(phi) * r * SK_R],
        tex: wordTexture(text, SK_COLORS[i % SK_COLORS.length]),
      }
    })
  }, [])

  const shell = useMemo(() => {
    const N = 700
    const pts = []
    for (let i = 0; i < N; i++) {
      const y = 1 - ((i + 0.5) * 2) / N
      const r = Math.sqrt(1 - y * y)
      const phi = i * 2.399963
      pts.push(new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).multiplyScalar(SK_R * 0.99))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  useFrame((s, d) => {
    const g = group.current
    g.rotation.y += d * (0.2 + s.pointer.x * 0.2)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -s.pointer.y * 0.25, 3, d)

    g.getWorldPosition(tmp.c)
    tmp.cam.copy(s.camera.position).sub(tmp.c).normalize()
    sprites.current.forEach((sp) => {
      if (!sp) return
      sp.getWorldPosition(tmp.p).sub(tmp.c)
      const k = (tmp.p.dot(tmp.cam) / (tmp.p.length() || 1) + 1) / 2 // 1 = facing us, 0 = behind
      sp.material.opacity = 0.1 + 0.9 * k
      const sc = 0.7 + 0.55 * k
      sp.scale.set(1.5 * sc, 0.375 * sc, 1)
    })
  })

  return (
    <group ref={group}>
      <sprite scale={[3.8, 3.8, 1]}>
        <spriteMaterial map={halo} color={THEME.primary} opacity={0.55} {...additive()} />
      </sprite>

      <mesh>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshBasicMaterial color={THEME.primary} wireframe transparent opacity={0.35} />
      </mesh>

      {[[Math.PI / 2, 0, 0], [0, 0, 0], [0.5, 0.6, 1.1]].map((rot, i) => (
        <mesh key={i} rotation={rot}>
          <torusGeometry args={[SK_R * 0.98, 0.006, 6, 128]} />
          <meshBasicMaterial color={THEME.accent} transparent opacity={0.35} />
        </mesh>
      ))}

      <points geometry={shell}>
        <pointsMaterial size={0.05} map={dot} color={THEME.primarySoft} opacity={0.5} {...additive()} />
      </points>

      {items.map((it, i) => (
        <sprite key={it.text} ref={(el) => (sprites.current[i] = el)} position={it.pos} scale={[1.5, 0.375, 1]}>
          <spriteMaterial map={it.tex} transparent depthWrite={false} toneMapped={false} fog={false} />
        </sprite>
      ))}
    </group>
  )
}

/* ======================================================================
   CONTACT: a signal globe
   ====================================================================== */
const GLOBE_R = 1.7

function arcPoints(a, b, ang, seg = 48) {
  const na = a.clone().normalize()
  const nb = b.clone().normalize()
  const lift = 0.25 + 0.45 * (ang / Math.PI)
  const out = []
  for (let i = 0; i <= seg; i++) {
    const s = i / seg
    const v = na
      .clone()
      .multiplyScalar(Math.sin((1 - s) * ang) / Math.sin(ang))
      .addScaledVector(nb, Math.sin(s * ang) / Math.sin(ang))
    v.multiplyScalar(GLOBE_R + lift * Math.sin(Math.PI * s))
    out.push(v)
  }
  return out
}

export function ContactRoom() {
  const globe = useRef()
  const rings = useRef([])
  const dot = useMemo(() => makeGlowTexture(), [])

  const { dots, ends, arcs } = useMemo(() => {
    const rand = mulberry(21)
    const N = 2600
    const kept = []
    for (let i = 0; i < N; i++) {
      const y = 1 - ((i + 0.5) * 2) / N
      const r = Math.sqrt(1 - y * y)
      const phi = i * 2.399963
      const p = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r)
      const n =
        Math.sin(p.x * 2.3 + 1.3) * Math.sin(p.y * 2.9 + 0.4) +
        Math.sin(p.z * 2.6 + 2.0) * Math.cos(p.x * 1.9 + p.y) +
        0.35 * Math.sin(p.y * 7 + p.x * 5)
      if (n > -0.15) kept.push(p.multiplyScalar(GLOBE_R))
    }

    const col = new Float32Array(kept.length * 3)
    const base = new THREE.Color(THEME.primarySoft)
    const hi = new THREE.Color(THEME.accentSoft)
    const c = new THREE.Color()
    kept.forEach((p, i) => {
      c.copy(rand() > 0.93 ? hi : base).multiplyScalar(0.35 + 0.65 * rand())
      c.toArray(col, i * 3)
    })
    const dotsGeo = new THREE.BufferGeometry().setFromPoints(kept)
    dotsGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))

    const curves = []
    const endPts = []
    let guard = 0
    while (curves.length < 12 && guard++ < 300) {
      const a = kept[(rand() * kept.length) | 0]
      const b = kept[(rand() * kept.length) | 0]
      const ang = a.clone().normalize().angleTo(b.clone().normalize())
      if (ang < 0.9 || ang > 2.8) continue
      curves.push({ pts: arcPoints(a, b, ang), layer: 0, offset: rand() })
      endPts.push(a, b)
    }

    return {
      dots: dotsGeo,
      ends: new THREE.BufferGeometry().setFromPoints(endPts),
      arcs: buildLines(curves),
    }
  }, [])

  useFrame((s, d) => {
    const t = s.clock.elapsedTime
    const g = globe.current
    g.rotation.y += d * (0.12 + s.pointer.x * 0.08)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.28 - s.pointer.y * 0.15, 3, d)

    rings.current.forEach((m, i) => {
      if (!m) return
      const ph = (t * 0.3 + i / 3) % 1
      m.scale.setScalar(GLOBE_R * 1.2 + ph * 1.3)
      m.material.opacity = (1 - ph) * (1 - ph) * 0.55
    })
  })

  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (rings.current[i] = el)} position={[0, 0, -0.4]}>
          <ringGeometry args={[0.985, 1, 128]} />
          <meshBasicMaterial color={THEME.accent} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}

      <group ref={globe}>
        <mesh>
          <sphereGeometry args={[GLOBE_R * 0.985, 48, 48]} />
          <meshBasicMaterial color={THEME.bg} />
        </mesh>
        <mesh>
          <sphereGeometry args={[GLOBE_R * 1.14, 48, 48]} />
          <meshBasicMaterial color={THEME.primary} opacity={0.1} side={THREE.BackSide} {...additive()} />
        </mesh>

        <points geometry={dots}>
          <pointsMaterial size={0.075} map={dot} vertexColors {...additive()} />
        </points>
        <points geometry={ends}>
          <pointsMaterial size={0.2} map={dot} color={THEME.primary} {...additive()} />
        </points>

        <PulseLines
          geometry={arcs}
          color={THEME.accent}
          pulse={THEME.cream}
          speed={0.18}
          steps={1}
          base={0.1}
          width={120}
        />
      </group>

      <Label text="SIGNAL ACTIVE" color={THEME.accentSoft} position={[0, -2.55, 0]} height={0.17} />
    </group>
  )
}