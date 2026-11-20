export const THEME = {
  bg: '#05060a',
  cream: '#fff1e4',
  primary: '#ff6a2b', // ember orange
  primarySoft: '#ffb38a',
  primaryDeep: '#4a1a09',
  accent: '#2de2c9', // teal
  accentSoft: '#a6f5ea',
}

function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

export function rgba(hex, a) {
  return `rgba(${toRgb(hex)}, ${a})`
}

// exposes every colour to the CSS as --primary, --primary-rgb, --accent-soft, ...
export function applyTheme() {
  const root = document.documentElement.style
  Object.entries(THEME).forEach(([key, value]) => {
    const name = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
    root.setProperty(`--${name}`, value)
    root.setProperty(`--${name}-rgb`, toRgb(value))
  })
}