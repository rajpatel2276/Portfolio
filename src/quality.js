import { useSyncExternalStore } from 'react'

// Everything that scales with device power lives here.
export const PRESETS = {
  high: { dprMax: 2, pixelBudget: 6.0e6, antialias: true, stars: 4000, dust: 1600, nodes: 110, nodeReach: 3.4, globe: 2600, cars: 3, envRes: 256, near: 1.6, fog: [22, 80] },
  mid: { dprMax: 1.5, pixelBudget: 3.2e6, antialias: true, stars: 2500, dust: 1000, nodes: 80, nodeReach: 3.9, globe: 1800, cars: 3, envRes: 192, near: 1.5, fog: [22, 75] },
  low: { dprMax: 1, pixelBudget: 1.6e6, antialias: false, stars: 1200, dust: 500, nodes: 50, nodeReach: 4.6, globe: 1100, cars: 2, envRes: 128, near: 1.3, fog: [20, 62] },
}

export const TIER_ORDER = ['low', 'mid', 'high']

// while true, every room is drawn so shaders compile behind the loader
export const warm = { on: true }

function gpuName() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return null
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    const lose = gl.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext()
    return name
  } catch {
    return null
  }
}

function detectTier() {
  // testing: add ?quality=low (or mid / high) to the URL
  const forced = new URLSearchParams(window.location.search).get('quality')
  if (forced && Object.prototype.hasOwnProperty.call(PRESETS, forced)) return forced

  const gpu = gpuName()
  if (gpu === null || /swiftshader|llvmpipe|software|basic render/i.test(gpu)) return 'low'

  const nav = navigator
  if (nav.connection && nav.connection.saveData) return 'low'

  const cores = nav.hardwareConcurrency || 4
  const mem = nav.deviceMemory || 4 // not reported by Safari or Firefox
  const coarse = window.matchMedia('(pointer: coarse)').matches // touch devices

  if (mem <= 2) return 'low'
  if (coarse) return cores <= 4 && mem <= 3 ? 'low' : 'mid'
  if (cores <= 2) return 'mid'
  return 'high'
}

function make(tier) {
  const p = PRESETS[tier]
  const px = Math.max(1, window.innerWidth * window.innerHeight)
  const dprMax = Math.max(0.75, Math.min(p.dprMax, Math.sqrt(p.pixelBudget / px)))
  return { tier, ...p, dprMax }
}

let state = make(detectTier())
const listeners = new Set()

export const getQuality = () => state

export function setTier(tier) {
  if (!PRESETS[tier] || state.tier === tier) return
  state = make(tier)
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useQuality() {
  return useSyncExternalStore(subscribe, getQuality, getQuality)
}