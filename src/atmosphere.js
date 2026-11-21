import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { THEME } from './theme'
import { scrollState, STATION_INFO, STATIONS } from './scroll'

// one palette per project world, keyed by the project's `key` in content.js
export const WORLD_THEME = {
  shastra: { bg: '#02101a', ring: '#38d9f5', line: '#7be8ff', dust: '#a6f0ff', soft: '#a6f0ff', warm: '#ffd27a' },
  traffic: { bg: '#0a040d', ring: '#ff4d8d', line: '#ffb020', dust: '#ffc2d6', soft: '#ffb3cf', warm: '#ffb020', cyan: '#4de3ff' },
  rag: { bg: '#031009', ring: '#3ddc97', line: '#f0b95a', dust: '#b6ffd9', soft: '#b6ffd9', warm: '#f0b95a' },
}

const BASE = { bg: THEME.bg, ring: THEME.primary, line: THEME.accent, dust: THEME.primarySoft }

const toColors = (p) => ({
  bg: new THREE.Color(p.bg),
  ring: new THREE.Color(p.ring),
  line: new THREE.Color(p.line),
  dust: new THREE.Color(p.dust),
})

// one palette per station (non-world stations use the base ember palette)
const PALETTES = STATION_INFO.map((s) => toColors(s.world && WORLD_THEME[s.world] ? WORLD_THEME[s.world] : BASE))

// the live, blended palette that the scene reads every frame
export const atmo = {
  bg: new THREE.Color(THEME.bg),
  ring: new THREE.Color(THEME.primary),
  line: new THREE.Color(THEME.accent),
  dust: new THREE.Color(THEME.primarySoft),
}

// pos = k + eased travel (0..1), so the blend is finished exactly at each station
export function updateAtmosphere(pos) {
  const k = Math.min(Math.floor(pos), STATIONS - 2)
  const f = THREE.MathUtils.clamp(pos - k, 0, 1)
  const a = PALETTES[k]
  const b = PALETTES[k + 1]
  atmo.bg.copy(a.bg).lerp(b.bg, f)
  atmo.ring.copy(a.ring).lerp(b.ring, f)
  atmo.line.copy(a.line).lerp(b.line, f)
  atmo.dust.copy(a.dust).lerp(b.dust, f)
}

export const stationOf = (key) => STATION_INFO.findIndex((s) => s.world === key)

// runs cb only while this station is near the camera, and hides the group when it is not
export function useRoomFrame(index, cb, groupRef) {
  useFrame((state, delta) => {
    const near = Math.abs(scrollState.pos - index) < 1.6
    const g = groupRef && groupRef.current
    if (g && g.visible !== near) g.visible = near
    if (near) cb(state, delta)
  })
}