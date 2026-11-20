import * as THREE from 'three'
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

// small seeded random generator, so the layouts are identical on every load
export function mulberry(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// white radial glow, tinted later through the material colour
export function makeGlowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.35)') {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(0.35, mid)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// curves: [{ pts: Vector3[], layer?: number, offset?: number }]
export function buildLines(curves) {
  const pos = []
  const prog = []
  const off = []
  const layer = []
  curves.forEach(({ pts, layer: L = 0, offset = 0 }) => {
    const n = pts.length - 1
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z)
      prog.push(i / n, (i + 1) / n)
      off.push(offset, offset)
      layer.push(L, L)
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aProgress', new THREE.Float32BufferAttribute(prog, 1))
  g.setAttribute('aOffset', new THREE.Float32BufferAttribute(off, 1))
  g.setAttribute('aLayer', new THREE.Float32BufferAttribute(layer, 1))
  return g
}

const VERT = /* glsl */ `
attribute float aProgress;
attribute float aOffset;
attribute float aLayer;
varying float vProgress;
varying float vOffset;
varying float vLayer;
void main() {
  vProgress = aProgress;
  vOffset = aOffset;
  vLayer = aLayer;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uSteps;
uniform float uBase;
uniform float uWidth;
uniform vec3 uColor;
uniform vec3 uPulse;
varying float vProgress;
varying float vOffset;
varying float vLayer;
void main() {
  float g = fract(uTime * uSpeed + vOffset) * uSteps;
  float local = g - vLayer;
  float d = vProgress - local;
  float pulse = exp(-d * d * uWidth) * step(-0.25, local) * step(local, 1.25);
  vec3 col = mix(uColor, uPulse, clamp(pulse, 0.0, 1.0));
  gl_FragColor = vec4(col, uBase + pulse);
  #include <colorspace_fragment>
}
`

// lines with a glowing pulse travelling along them
export function PulseLines({ geometry, color, pulse, speed = 0.2, steps = 1, base = 0.12, width = 200 }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uSteps: { value: steps },
      uBase: { value: base },
      uWidth: { value: width },
      uColor: { value: new THREE.Color(color) },
      uPulse: { value: new THREE.Color(pulse) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}

// small monospace caption that always faces the camera
export function Label({ text, color = '#ffffff', position = [0, 0, 0], height = 0.2, opacity = 0.75 }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 96
    const ctx = c.getContext('2d')
    ctx.font = '600 40px ui-monospace, Menlo, Consolas, monospace'
    ctx.letterSpacing = '6px'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.fillText(text, 256, 50)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [text, color])

  return (
    <sprite position={position} scale={[(height * 512) / 96, height, 1]}>
      <spriteMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}