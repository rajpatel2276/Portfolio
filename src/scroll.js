import { FEATURED } from './content'

export const lenisRef = { current: null }
export const scrollState = { progress: 0, velocity: 0, active: 0, revealed: false, pos: 0 }

const W = FEATURED.length

// Station map: Home, About, Projects hub, one station per project world, Skills, Contact
export const ST = {
  HOME: 0,
  ABOUT: 1,
  PROJECTS: 2,
  WORLD0: 3,
  SKILLS: 3 + W,
  CONTACT: 4 + W,
}
export const STATIONS = ST.CONTACT + 1

export const STATION_INFO = [
  { label: 'Home', nav: null, index: '01' },
  { label: 'About', nav: 'About', index: '02' },
  { label: 'Projects', nav: 'Projects', index: '03' },
  ...FEATURED.map((p, i) => ({
    label: p.title,
    nav: 'Projects',
    index: `03.${i + 1}`,
    world: p.key,
  })),
  { label: 'Skills', nav: 'Skills', index: '04' },
  { label: 'Contact', nav: 'Contact', index: '05' },
]

const subs = new Set()

export function subscribeActive(fn) {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

// active = index of the station we are resting at, or -1 while travelling
export function setActive(i) {
  if (scrollState.active === i) return
  scrollState.active = i
  subs.forEach((fn) => fn(i))
}

export function scrollToStation(i) {
  const l = lenisRef.current
  if (!l) return
  const dist = Math.abs(i - scrollState.pos)
  l.scrollTo((i / (STATIONS - 1)) * l.limit, { duration: Math.min(4, 1.4 + dist * 0.45) })
}